import { parseAbi, type Address } from "viem";
import { normalizeTokenAddress } from "./address";
import { createRpcClient, type RpcClient } from "./rpc";
import {
  VENUES,
  type QuoteToken,
  type V2Venue,
  type V3Venue,
  type Venue,
} from "./venues";

export type PoolStatus = "present" | "absent" | "unknown";

export type PoolFacts = {
  status: PoolStatus;
  venueId: string | null;
  venueLabel: string | null;
  protocolVersion: "v2" | "v3" | null;
  feeTier: number | null;
  pairAddress: Address | null;
  quoteToken: Address | null;
  quoteSymbol: string | null;
  deployerShare: number | null;
  reserveToken: string | null;
  reserveQuote: string | null;
};

export type ReadPoolFactsOptions = {
  client?: RpcClient;
  deployerAddress?: string | null;
  venues?: readonly Venue[];
};

type PoolCandidate =
  | {
      version: "v2";
      venue: V2Venue;
      quoteToken: QuoteToken;
      poolAddress: Address;
      feeTier: null;
    }
  | {
      version: "v3";
      venue: V3Venue;
      quoteToken: QuoteToken;
      poolAddress: Address;
      feeTier: number;
    };

export async function readPoolFacts(
  tokenAddress: string,
  options: ReadPoolFactsOptions = {},
): Promise<PoolFacts> {
  const token = normalizeTokenAddress(tokenAddress);
  const venues = options.venues ?? VENUES;

  if (venues.length === 0) {
    return unknownPoolFacts();
  }

  const client = options.client ?? createRpcClient();
  const deployerAddress = options.deployerAddress
    ? normalizeTokenAddress(options.deployerAddress)
    : null;

  const lookups: Array<Promise<PoolCandidate | null>> = [];

  for (const venue of venues) {
    for (const quoteToken of venue.quoteTokens) {
      if (quoteToken.address.toLowerCase() === token.toLowerCase()) {
        continue;
      }

      if (venue.version === "v2") {
        lookups.push(
          readV2PairAddress(
            client,
            venue.factory,
            token,
            quoteToken.address,
          ).then((poolAddress) =>
            isNonZeroAddress(poolAddress)
              ? {
                  version: "v2" as const,
                  venue,
                  quoteToken,
                  poolAddress,
                  feeTier: null,
                }
              : null,
          ),
        );
        continue;
      }

      for (const feeTier of venue.feeTiers) {
        lookups.push(
          readV3PoolAddress(
            client,
            venue.factory,
            token,
            quoteToken.address,
            feeTier,
          ).then((poolAddress) =>
            isNonZeroAddress(poolAddress)
              ? {
                  version: "v3" as const,
                  venue,
                  quoteToken,
                  poolAddress,
                  feeTier,
                }
              : null,
          ),
        );
      }
    }
  }

  const candidate = (await Promise.all(lookups)).find(
    (item): item is PoolCandidate => item !== null,
  );

  if (candidate?.version === "v2") {
    return readV2PairFacts({
      client,
      venue: candidate.venue,
      token,
      quoteToken: candidate.quoteToken,
      pairAddress: candidate.poolAddress,
      deployerAddress,
    });
  }

  if (candidate?.version === "v3") {
    return readV3PoolFacts({
      client,
      venue: candidate.venue,
      token,
      quoteToken: candidate.quoteToken,
      poolAddress: candidate.poolAddress,
      feeTier: candidate.feeTier,
    });
  }

  return {
    ...unknownPoolFacts(),
    status: "absent",
  };
}

function unknownPoolFacts(): PoolFacts {
  return {
    status: "unknown",
    venueId: null,
    venueLabel: null,
    protocolVersion: null,
    feeTier: null,
    pairAddress: null,
    quoteToken: null,
    quoteSymbol: null,
    deployerShare: null,
    reserveToken: null,
    reserveQuote: null,
  };
}

async function readV2PairAddress(
  client: RpcClient,
  factory: Address,
  token: Address,
  quoteToken: Address,
): Promise<Address | null> {
  try {
    const pairAddress = await client.readContract({
      address: factory,
      abi: FACTORY_ABI,
      functionName: "getPair",
      args: [token, quoteToken],
    });

    return pairAddress;
  } catch {
    return null;
  }
}

async function readV3PoolAddress(
  client: RpcClient,
  factory: Address,
  token: Address,
  quoteToken: Address,
  feeTier: number,
): Promise<Address | null> {
  try {
    return await client.readContract({
      address: factory,
      abi: V3_FACTORY_ABI,
      functionName: "getPool",
      args: [token, quoteToken, feeTier],
    });
  } catch {
    return null;
  }
}

async function readV2PairFacts({
  client,
  venue,
  token,
  quoteToken,
  pairAddress,
  deployerAddress,
}: {
  client: RpcClient;
  venue: V2Venue;
  token: Address;
  quoteToken: QuoteToken;
  pairAddress: Address;
  deployerAddress: Address | null;
}): Promise<PoolFacts> {
  const [token0, reserves, deployerShare] = await Promise.all([
    readPairToken0(client, pairAddress),
    readPairReserves(client, pairAddress),
    deployerAddress
      ? readLpShare(client, pairAddress, deployerAddress)
      : Promise.resolve(null),
  ]);

  const tokenIsToken0 = token0?.toLowerCase() === token.toLowerCase();
  const reserveToken = reserves
    ? tokenIsToken0
      ? reserves.reserve0
      : reserves.reserve1
    : null;
  const reserveQuote = reserves
    ? tokenIsToken0
      ? reserves.reserve1
      : reserves.reserve0
    : null;

  return {
    status: "present",
    venueId: venue.id,
    venueLabel: venue.label,
    protocolVersion: venue.version,
    feeTier: null,
    pairAddress,
    quoteToken: quoteToken.address,
    quoteSymbol: quoteToken.symbol,
    deployerShare,
    reserveToken: reserveToken?.toString() ?? null,
    reserveQuote: reserveQuote?.toString() ?? null,
  };
}

async function readV3PoolFacts({
  client,
  venue,
  token,
  quoteToken,
  poolAddress,
  feeTier,
}: {
  client: RpcClient;
  venue: V3Venue;
  token: Address;
  quoteToken: QuoteToken;
  poolAddress: Address;
  feeTier: number;
}): Promise<PoolFacts> {
  const [reserveToken, reserveQuote] = await Promise.all([
    readTokenBalance(client, token, poolAddress),
    readTokenBalance(client, quoteToken.address, poolAddress),
  ]);

  return {
    status: "present",
    venueId: venue.id,
    venueLabel: venue.label,
    protocolVersion: venue.version,
    feeTier,
    pairAddress: poolAddress,
    quoteToken: quoteToken.address,
    quoteSymbol: quoteToken.symbol,
    deployerShare: null,
    reserveToken: reserveToken?.toString() ?? null,
    reserveQuote: reserveQuote?.toString() ?? null,
  };
}

async function readTokenBalance(
  client: RpcClient,
  token: Address,
  account: Address,
): Promise<bigint | null> {
  try {
    return await client.readContract({
      address: token,
      abi: ERC20_ABI,
      functionName: "balanceOf",
      args: [account],
    });
  } catch {
    return null;
  }
}

async function readPairToken0(
  client: RpcClient,
  pairAddress: Address,
): Promise<Address | null> {
  try {
    return await client.readContract({
      address: pairAddress,
      abi: PAIR_ABI,
      functionName: "token0",
    });
  } catch {
    return null;
  }
}

async function readPairReserves(
  client: RpcClient,
  pairAddress: Address,
): Promise<{ reserve0: bigint; reserve1: bigint } | null> {
  try {
    const [reserve0, reserve1] = await client.readContract({
      address: pairAddress,
      abi: PAIR_ABI,
      functionName: "getReserves",
    });

    return {
      reserve0,
      reserve1,
    };
  } catch {
    return null;
  }
}

async function readLpShare(
  client: RpcClient,
  pairAddress: Address,
  deployerAddress: Address,
): Promise<number | null> {
  try {
    const [balance, totalSupply] = await Promise.all([
      client.readContract({
        address: pairAddress,
        abi: ERC20_ABI,
        functionName: "balanceOf",
        args: [deployerAddress],
      }),
      client.readContract({
        address: pairAddress,
        abi: ERC20_ABI,
        functionName: "totalSupply",
      }),
    ]);

    if (totalSupply === 0n) {
      return null;
    }

    return Number((balance * 10_000n) / totalSupply) / 100;
  } catch {
    return null;
  }
}

const ZERO_ADDRESS = "0x0000000000000000000000000000000000000000";

const FACTORY_ABI = parseAbi([
  "function getPair(address tokenA, address tokenB) view returns (address pair)",
]);

const V3_FACTORY_ABI = parseAbi([
  "function getPool(address tokenA, address tokenB, uint24 fee) view returns (address pool)",
]);

const PAIR_ABI = parseAbi([
  "function token0() view returns (address)",
  "function getReserves() view returns (uint112 reserve0, uint112 reserve1, uint32 blockTimestampLast)",
]);

const ERC20_ABI = parseAbi([
  "function balanceOf(address account) view returns (uint256)",
  "function totalSupply() view returns (uint256)",
]);

function isNonZeroAddress(address: Address | null): address is Address {
  return Boolean(address && address.toLowerCase() !== ZERO_ADDRESS);
}
