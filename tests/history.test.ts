import assert from "node:assert/strict";
import test from "node:test";
import type { SnapshotHistoryRecord } from "../lib/db";
import { addSnapshotChanges } from "../lib/history";

function snapshot(
  timestamp: string,
  reserve: string,
  mint: "present" | "absent",
): SnapshotHistoryRecord {
  return {
    token: "0x0000000000000000000000000000000000000001",
    block: Number(timestamp),
    timestamp,
    verdict: mint === "present" ? "don't" : "thin",
    flags: [],
    rawJson: {
      rights: { flags: { mint, freeze: "absent", owner: "absent" } },
      pool: {
        status: "present",
        venueLabel: "Uniswap V3",
        reserveQuoteFormatted: reserve,
        quoteSymbol: "USDG",
      },
      explorer: { isVerified: true },
    },
  };
}

test("describes changes from the previous snapshot", () => {
  const items = addSnapshotChanges([
    snapshot("2", "2000", "absent"),
    snapshot("1", "900", "present"),
  ]);

  assert.deepEqual(items[0].changes, [
    { field: "Verdict", from: "don't", to: "thin" },
    { field: "Mint authority", from: "present", to: "absent" },
    { field: "Quote reserve", from: "900 USDG", to: "2000 USDG" },
  ]);
  assert.equal(items[1].changes[0].to, "First recorded");
});

test("returns an empty change list for identical snapshots", () => {
  const items = addSnapshotChanges([
    snapshot("2", "2000", "absent"),
    snapshot("1", "2000", "absent"),
  ]);

  assert.deepEqual(items[0].changes, []);
});
