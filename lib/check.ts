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
  factDetails: CheckFact[];
  rights: TokenRightsDebug;
  pool: PoolFacts;
  explorer: ExplorerContractInfo;
  deployer: DeployerRecord | null;
  cached: boolean;
};

export type CheckFact = {
  id: "rights" | "pool" | "deployer";
  label: string;
  value: string;
  source: string;
  sourceUrl: string | null;
  observedAt: string;
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
  const factDetails = buildFactDetails({
    rights,
    pool,
    deployer: deployerForRules,
    explorer,
    observedAt: timestamp,
  });
  const facts = factDetails.map((fact) => fact.value);
  const result: CheckResult = {
    tokenAddress: normalizedTokenAddress,
    block: Number(blockNumber),
    timestamp,
    facts,
    factDetails,
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
      factDetails,
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

function buildFactDetails({
  rights,
  pool,
  deployer,
  explorer,
  observedAt,
}: {
  rights: TokenRightsDebug;
  pool: PoolFacts;
  deployer: DeployerRecord | null;
  explorer: ExplorerContractInfo;
  observedAt: string;
}): CheckFact[] {
  return [
    {
      id: "rights",
      label: "Contract rights",
      value: `mint ${rights.flags.mint}, freeze ${rights.flags.freeze}, owner ${rights.flags.owner}, fee wallet ${rights.flags.feeWallet}, proxy ${rights.proxy.type}`,
      source: "Robinhood Chain RPC",
      sourceUrl: explorer.explorerUrl,
      observedAt,
    },
    {
      id: "pool",
      label: "Liquidity pool",
      value:
        pool.status === "present"
          ? `${pool.venueLabel ?? "unknown venue"}, ${pool.reserveQuoteFormatted ?? "unknown"} ${pool.quoteSymbol ?? "quote"}`
          : pool.status,
      source: pool.venueLabel ? `${pool.venueLabel} factory` : "DEX factories",
      sourceUrl: pool.pairAddress
        ? explorerAddressUrl(explorer.explorerUrl, pool.pairAddress)
        : null,
      observedAt,
    },
    {
      id: "deployer",
      label: "Contract creator",
      value:
        explorer.creatorAddress && deployer
          ? `${explorer.creatorAddress}, ${deployer.tokensSeen} tokens seen, ${deployer.deadCount} dead`
          : "unknown",
      source: "Blockscout + local history",
      sourceUrl: explorer.creatorAddress
        ? explorerAddressUrl(explorer.explorerUrl, explorer.creatorAddress)
        : explorer.explorerUrl,
      observedAt,
    },
  ];
}

function explorerAddressUrl(baseUrl: string, address: string): string {
  try {
    return new URL(`/address/${address}`, baseUrl).toString();
  } catch {
    return baseUrl;
  }
}
