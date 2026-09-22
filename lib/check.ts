import { normalizeTokenAddress } from "./address";
import {
  getDeployerStats,
  saveSnapshot,
  upsertDeployerStats,
  type DeployerRecord,
} from "./db";
import {
  readExplorerContractInfo,
  type ExplorerContractInfo,
} from "./explorer";
import { readTokenRightsDebug, type TokenRightsDebug } from "./flags";
import { readPoolFacts, type PoolFacts } from "./pool";
import { createRpcClient, type RpcClient } from "./rpc";
import {
  evaluate,
  type FactStatus,
  type RuleResult,
  type RuleSnapshot,
} from "./rules";

export type CheckResult = RuleResult & {
  tokenAddress: string;
  block: number;
  timestamp: string;
  facts: string[];
  rights: TokenRightsDebug;
  pool: PoolFacts;
  explorer: ExplorerContractInfo;
  deployer: DeployerRecord | null;
  cached: boolean;
};

export type CheckTokenOptions = {
  deployerAddress?: string | null;
  client?: RpcClient;
};

const CACHE_MS = 45_000;
const cache = new Map<
  string,
  {
    expiresAt: number;
    result: CheckResult;
  }
>();

export async function checkToken(
  tokenAddress: string,
  options: CheckTokenOptions = {},
): Promise<CheckResult> {
  const normalizedTokenAddress = normalizeTokenAddress(tokenAddress);
  const requestedDeployerAddress = options.deployerAddress
    ? normalizeTokenAddress(options.deployerAddress)
    : null;
  const cacheKey = `${normalizedTokenAddress}:${requestedDeployerAddress ?? "auto-deployer"}`;
  const cached = cache.get(cacheKey);

  if (cached && cached.expiresAt > Date.now()) {
    return {
      ...cached.result,
      cached: true,
    };
  }

  const explorer = await readExplorerContractInfo(normalizedTokenAddress);
  const normalizedDeployerAddress =
    requestedDeployerAddress ?? explorer.creatorAddress;

  const client = options.client ?? createRpcClient();
  const [rights, pool, blockNumber, existingDeployer] = await Promise.all([
    readTokenRightsDebug(normalizedTokenAddress, client),
    readPoolFacts(normalizedTokenAddress, {
      client,
      deployerAddress: normalizedDeployerAddress,
    }),
    client.getBlockNumber(),
    normalizedDeployerAddress
      ? getDeployerStats(normalizedDeployerAddress)
      : Promise.resolve(null),
  ]);
  const timestamp = new Date().toISOString();
  const deployerForRules =
    existingDeployer ??
    (normalizedDeployerAddress
      ? {
          address: normalizedDeployerAddress,
          tokensSeen: 0,
          deadCount: 0,
          updatedAt: timestamp,
        }
      : null);
  const ruleSnapshot = toRuleSnapshot({
    tokenAddress: normalizedTokenAddress,
    rights,
    pool,
    deployer: deployerForRules,
  });
  const ruleResult = evaluate(ruleSnapshot);
  const facts = buildFacts({
    rights,
    pool,
    deployer: deployerForRules,
    explorer,
  });
  const result: CheckResult = {
    tokenAddress: normalizedTokenAddress,
    block: Number(blockNumber),
    timestamp,
    facts,
    rights,
    pool,
    explorer,
    deployer: existingDeployer,
    cached: false,
    ...ruleResult,
  };

  await saveSnapshot({
    token: normalizedTokenAddress,
    block: result.block,
    timestamp,
    rawJson: {
      rights,
      pool,
      explorer,
      deployer: existingDeployer,
      ruleSnapshot,
      facts,
    },
    verdict: result.verdict,
    flags: result.flags.map((flag) => flag.code),
  });

  if (normalizedDeployerAddress) {
    await upsertDeployerStats({
      address: normalizedDeployerAddress,
      tokenAddress: normalizedTokenAddress,
      isDead: pool.status === "absent",
      timestamp,
    });
  }

  cache.set(cacheKey, {
    expiresAt: Date.now() + CACHE_MS,
    result,
  });

  return result;
}

function toRuleSnapshot({
  tokenAddress,
  rights,
  pool,
  deployer,
}: {
  tokenAddress: string;
  rights: TokenRightsDebug;
  pool: PoolFacts;
  deployer: DeployerRecord | null;
}): RuleSnapshot {
  return {
    tokenAddress,
    authorities: {
      mint: rights.flags.mint,
      freeze: rights.flags.freeze,
      owner: rights.flags.owner,
      feeWallet: rights.flags.feeWallet,
    },
    pool: {
      status: pool.status as FactStatus,
      deployerShare: pool.deployerShare,
      reserveQuote: pool.reserveQuote,
      quoteSymbol: pool.quoteSymbol,
      ageMinutes: null,
    },
    deployer: {
      tokensSeen: deployer?.tokensSeen ?? null,
      deadCount: deployer?.deadCount ?? null,
    },
  };
}

function buildFacts({
  rights,
  pool,
  deployer,
  explorer,
}: {
  rights: TokenRightsDebug;
  pool: PoolFacts;
  deployer: DeployerRecord | null;
  explorer: ExplorerContractInfo;
}): string[] {
  return [
    `rights: mint ${rights.flags.mint}, freeze ${rights.flags.freeze}, owner ${rights.flags.owner}, fee wallet ${rights.flags.feeWallet}, proxy ${rights.proxy.type}`,
    pool.status === "present"
      ? `pool: found on ${pool.venueLabel ?? "unknown venue"} with quote reserve ${pool.reserveQuoteFormatted ?? "unknown"} ${pool.quoteSymbol ?? ""}`.trim()
      : `pool: ${pool.status}`,
    explorer.creatorAddress && deployer
      ? `deployer: ${explorer.creatorAddress}, ${deployer.tokensSeen} tokens seen, ${deployer.deadCount} dead`
      : "deployer: unknown",
    explorer.status === "available"
      ? `source: explorer ${explorer.isVerified ? "verified" : "not verified"}`
      : "source: explorer unavailable",
  ];
}
