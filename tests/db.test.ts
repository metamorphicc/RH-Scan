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

test("counts each deployer token once before its first snapshot is stored", async () => {
  const { getDeployerStats, saveSnapshot, upsertDeployerStats } = await import(
    "../lib/db.js"
  );
  const deployer = "0x00000000000000000000000000000000000000d1";
  const firstToken = "0x0000000000000000000000000000000000000011";
  const secondToken = "0x0000000000000000000000000000000000000012";

  await upsertDeployerStats({
    address: deployer,
    tokenAddress: firstToken,
    isDead: false,
    timestamp: "2026-09-22T12:00:00.000Z",
  });
  await saveSnapshot({
    token: firstToken,
    block: 3,
    timestamp: "2026-09-22T12:00:00.000Z",
    rawJson: {},
    verdict: "thin",
    flags: [],
  });

  const updated = await upsertDeployerStats({
    address: deployer,
    tokenAddress: secondToken,
    isDead: true,
    timestamp: "2026-09-22T13:00:00.000Z",
  });
  const repeated = await upsertDeployerStats({
    address: deployer,
    tokenAddress: secondToken,
    isDead: true,
    timestamp: "2026-09-22T14:00:00.000Z",
  });

  assert.equal(updated.tokensSeen, 2);
  assert.equal(updated.deadCount, 1);
  assert.deepEqual(await getDeployerStats(deployer), repeated);
  assert.equal(repeated.tokensSeen, 2);
});
