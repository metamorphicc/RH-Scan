export type SnapshotRecord = {
  token: string;
  block: number;
  timestamp: string;
  rawJson: unknown;
  verdict: string;
  flags: string[];
};

export type DeployerRecord = {
  address: string;
  tokensSeen: number;
  deadCount: number;
  updatedAt: string;
};

export async function saveSnapshot(record: SnapshotRecord): Promise<void> {
  // TODO Stage 4: persist snapshots after the check pipeline exists.
  void record;
}

export async function getDeployerStats(
  address: string,
): Promise<DeployerRecord | null> {
  // TODO Stage 4: read deployer history from SQLite/libsql.
  void address;

  return null;
}

