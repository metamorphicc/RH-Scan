import assert from "node:assert/strict";
import { mkdirSync } from "node:fs";
import { join } from "node:path";
import test from "node:test";

const databasePath = join(
  process.cwd(),
  ".test-build",
  "tmp",
  `snapshots-${process.pid}-${Date.now()}.sqlite`,
);
mkdirSync(join(process.cwd(), ".test-build", "tmp"), { recursive: true });
process.env.RHCHECK_DB_PATH = databasePath;

test("stores and retrieves the latest snapshot", async () => {
  const { getLatestSnapshot, getSnapshotHistory, saveSnapshot } = await import(
    "../lib/db.js"
  );
  const token = "0x0000000000000000000000000000000000000001";

  await saveSnapshot({
    token,
    block: 1,
    timestamp: "2026-09-22T10:00:00.000Z",
    rawJson: { version: 1 },
    verdict: "thin",
    flags: ["first"],
  });
  await saveSnapshot({
    token,
    block: 2,
    timestamp: "2026-09-22T11:00:00.000Z",
    rawJson: { version: 2 },
    verdict: "don't",
    flags: ["second"],
  });

  const latest = await getLatestSnapshot(token);
  const history = await getSnapshotHistory(token, 10);

  assert.equal(latest?.block, 2);
  assert.deepEqual(latest?.rawJson, { version: 2 });
  assert.deepEqual(history.map((item) => item.block), [2, 1]);
});
