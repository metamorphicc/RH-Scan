import { mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import Database from "better-sqlite3";

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

export type SnapshotHistoryRecord = SnapshotRecord & {
  rawJson: unknown;
};

const DB_PATH = process.env.RHCHECK_DB_PATH ?? join(process.cwd(), "data", "rhcheck.sqlite");

let database: Database.Database | null = null;

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

export async function getSnapshotHistory(
  token: string,
  limit = 20,
): Promise<SnapshotHistoryRecord[]> {
  const db = getDatabase();
  const boundedLimit = Math.min(Math.max(limit, 1), 100);
  const rows = db
    .prepare(
      `select token, block, ts as timestamp, raw_json as rawJson, verdict, flags
       from snapshots
       where lower(token) = lower(?)
       order by ts desc
       limit ?`,
    )
    .all(token, boundedLimit) as Array<{
    token: string;
    block: number;
    timestamp: string;
    rawJson: string;
    verdict: string;
    flags: string;
  }>;

  return rows.map((row) => ({
    token: row.token,
    block: row.block,
    timestamp: row.timestamp,
    rawJson: parseJson(row.rawJson),
    verdict: row.verdict,
    flags: parseStringArray(row.flags),
  }));
}

export async function getLatestSnapshot(
  token: string,
): Promise<SnapshotHistoryRecord | null> {
  const [latest] = await getSnapshotHistory(token, 1);
  return latest ?? null;
}

export function consumeRateLimitBucket(params: {
  key: string;
  now: number;
  windowMs: number;
  maxRequests: number;
}): { count: number; resetAt: number } {
  const db = getDatabase();
  const consume = db.transaction(() => {
    const existing = db
      .prepare(
        `select request_count as count, reset_at as resetAt
         from rate_limits
         where bucket_key = ?`,
      )
      .get(params.key) as { count: number; resetAt: number } | undefined;

    if (!existing || existing.resetAt <= params.now) {
      const bucket = {
        count: 1,
        resetAt: params.now + params.windowMs,
      };
      db.prepare(
        `insert into rate_limits (bucket_key, request_count, reset_at)
         values (?, ?, ?)
         on conflict(bucket_key) do update set
           request_count = excluded.request_count,
           reset_at = excluded.reset_at`,
      ).run(params.key, bucket.count, bucket.resetAt);
      return bucket;
    }

    if (existing.count >= params.maxRequests) {
      return existing;
    }

    const count = existing.count + 1;
    db.prepare(
      `update rate_limits set request_count = ? where bucket_key = ?`,
    ).run(count, params.key);
    return { count, resetAt: existing.resetAt };
  });

  return consume.immediate();
}

export function checkDatabaseHealth(): boolean {
  const row = getDatabase().prepare("select 1 as ok").get() as
    | { ok: number }
    | undefined;
  return row?.ok === 1;
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

function getDatabase(): Database.Database {
  if (database) {
    return database;
  }

  mkdirSync(dirname(DB_PATH), { recursive: true });
  database = new Database(DB_PATH);
  database.pragma("journal_mode = WAL");
  database.pragma("busy_timeout = 5000");
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

    create table if not exists rate_limits (
      bucket_key text primary key,
      request_count integer not null,
      reset_at integer not null
    );

    create index if not exists rate_limits_reset_idx
      on rate_limits (reset_at);
  `);

  return database;
}

function parseJson(value: string): unknown {
  try {
    return JSON.parse(value);
  } catch {
    return null;
  }
}

function parseStringArray(value: string): string[] {
  const parsed = parseJson(value);

  if (!Array.isArray(parsed)) {
    return [];
  }

  return parsed.filter((item): item is string => typeof item === "string");
}
