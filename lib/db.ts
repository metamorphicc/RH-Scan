import { mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { DatabaseSync } from "node:sqlite";

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

const DB_PATH = process.env.RHCHECK_DB_PATH ?? join(process.cwd(), "data", "rhcheck.sqlite");

let database: DatabaseSync | null = null;

export async function saveSnapshot(record: SnapshotRecord): Promise<void> {
  const db = getDatabase();

  db.prepare(
    `insert into snapshots (token, block, ts, raw_json, verdict, flags)
     values (?, ?, ?, ?, ?, ?)`,
  ).run(
    record.token,
    record.block,
    record.timestamp,
    JSON.stringify(record.rawJson),
    record.verdict,
    JSON.stringify(record.flags),
  );
}

export async function getDeployerStats(
  address: string,
): Promise<DeployerRecord | null> {
  const db = getDatabase();
  const record = db
    .prepare(
      `select address, tokens_seen as tokensSeen, dead_count as deadCount, updated_at as updatedAt
       from deployers
       where lower(address) = lower(?)`,
    )
    .get(address) as DeployerRecord | undefined;

  return record ?? null;
}

export async function upsertDeployerStats(params: {
  address: string;
  tokenAddress: string;
  isDead: boolean;
  timestamp: string;
}): Promise<DeployerRecord> {
  const db = getDatabase();
  const existing = await getDeployerStats(params.address);

  if (!existing) {
    db.prepare(
      `insert into deployers (address, tokens_seen, dead_count, updated_at)
       values (?, ?, ?, ?)`,
    ).run(params.address, 1, params.isDead ? 1 : 0, params.timestamp);

    return {
      address: params.address,
      tokensSeen: 1,
      deadCount: params.isDead ? 1 : 0,
      updatedAt: params.timestamp,
    };
  }

  const tokenSeenBefore = db
    .prepare(
      `select 1 from snapshots
       where lower(token) = lower(?)
       limit 1`,
    )
    .get(params.tokenAddress);
  const tokensSeen = existing.tokensSeen + (tokenSeenBefore ? 0 : 1);
  const deadCount =
    existing.deadCount + (!tokenSeenBefore && params.isDead ? 1 : 0);

  db.prepare(
    `update deployers
     set tokens_seen = ?, dead_count = ?, updated_at = ?
     where lower(address) = lower(?)`,
  ).run(tokensSeen, deadCount, params.timestamp, params.address);

  return {
    address: existing.address,
    tokensSeen,
    deadCount,
    updatedAt: params.timestamp,
  };
}

function getDatabase(): DatabaseSync {
  if (database) {
    return database;
  }

  mkdirSync(dirname(DB_PATH), { recursive: true });
  database = new DatabaseSync(DB_PATH);
  database.exec(`
    create table if not exists snapshots (
      token text not null,
      block integer not null,
      ts text not null,
      raw_json text not null,
      verdict text not null,
      flags text not null
    );

    create index if not exists snapshots_token_ts_idx
      on snapshots (token, ts);

    create table if not exists deployers (
      address text primary key,
      tokens_seen integer not null,
      dead_count integer not null,
      updated_at text not null
    );
  `);

  return database;
}
