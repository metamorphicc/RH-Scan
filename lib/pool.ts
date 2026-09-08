export type PoolStatus = "present" | "absent" | "unknown";

export type PoolFacts = {
  status: PoolStatus;
  deployerShare: number | null;
  reservesUsd: number | null;
};

export async function readPoolFacts(tokenAddress: string): Promise<PoolFacts> {
  // TODO Stage 2: discover Robinhood Chain venues and read pool reserves.
  void tokenAddress;

  return {
    status: "unknown",
    deployerShare: null,
    reservesUsd: null,
  };
}

