export type PoolLookupState = "ok" | "error";

export type RankedPool = {
  reserveQuote: string | null;
  quoteSymbol: string | null;
};

const QUOTE_DEPTH_BASELINES: Record<string, bigint> = {
  USDG: 1_000_000_000n,
  WETH: 500_000_000_000_000_000n,
};

export function statusWhenNoPool(
  lookupStates: readonly PoolLookupState[],
): "absent" | "unknown" {
  return lookupStates.some((status) => status === "error")
    ? "unknown"
    : "absent";
}

export function selectDeepestPool<T extends RankedPool>(pools: readonly T[]): T {
  if (pools.length === 0) {
    throw new Error("At least one pool is required.");
  }

  return pools.slice(1).reduce(
    (deepest, pool) =>
      poolDepth(pool) > poolDepth(deepest) ? pool : deepest,
    pools[0],
  );
}

function poolDepth(pool: RankedPool): bigint {
  if (!pool.reserveQuote || !pool.quoteSymbol) {
    return -1n;
  }

  const baseline = QUOTE_DEPTH_BASELINES[pool.quoteSymbol];

  try {
    return baseline
      ? (BigInt(pool.reserveQuote) * 1_000_000n) / baseline
      : -1n;
  } catch {
    return -1n;
  }
}
