import { parseAbi, type Address } from "viem";
import { normalizeTokenAddress } from "./address";
import { createRpcClient, type RpcClient } from "./rpc";
import { V2_VENUES, type V2Venue } from "./venues";

export type PoolStatus = "present" | "absent" | "unknown";

export type PoolFacts = {
  status: PoolStatus;
  venueId: string | null;
  venueLabel: string | null;
  pairAddress: Address | null;
  quoteToken: Address | null;
  deployerShare: number | null;
  reserveToken: string | null;
  reserveQuote: string | null;
};

export type ReadPoolFactsOptions = {
  client?: RpcClient;
  deployerAddress?: string | null;
  venues?: V2Venue[];
};

export async function readPoolFacts(
  tokenAddress: string,
  options: ReadPoolFactsOptions = {},
): Promise<PoolFacts> {
  const token = normalizeTokenAddress(tokenAddress);
  const venues = options.venues ?? V2_VENUES;

  if (venues.length === 0) {
    return unknownPoolFacts();
  }

  const client = options.client ?? createRpcClient();
  const deployerAddress = options.deployerAddress
    ? normalizeTokenAddress(options.deployerAddress)
    : null;

  for (const venue of venues) {
    for (const quoteToken of venue.quoteTokens) {
      const pairAddress = await readPairAddress(client, venue.factory, token, quoteToken);

      if (!pairAddress || pairAddress.toLowerCase() === ZERO_ADDRESS) {
        continue;
      }

      return readPairFacts({
        client,
        venue,
        token,
        quoteToken,
        pairAddress,
        deployerAddress,
      });
    }
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
    pairAddress: null,
    quoteToken: null,
    deployerShare: null,
    reserveToken: null,
    reserveQuote: null,
  };
}

async function readPairAddress(
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

async function readPairFacts({
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
  quoteToken: Address;
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
    pairAddress,
    quoteToken,
    deployerShare,
    reserveToken: reserveToken?.toString() ?? null,
    reserveQuote: reserveQuote?.toString() ?? null,
  };
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

const PAIR_ABI = parseAbi([
  "function token0() view returns (address)",
  "function getReserves() view returns (uint112 reserve0, uint112 reserve1, uint32 blockTimestampLast)",
]);

const ERC20_ABI = parseAbi([
  "function balanceOf(address account) view returns (uint256)",
  "function totalSupply() view returns (uint256)",
]);
