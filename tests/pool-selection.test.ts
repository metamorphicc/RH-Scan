import assert from "node:assert/strict";
import test from "node:test";
import { selectDeepestPool, statusWhenNoPool } from "../lib/pool-selection";

test("failed factory reads remain unknown instead of becoming no-pool claims", () => {
  assert.equal(statusWhenNoPool(["ok", "error", "ok"]), "unknown");
  assert.equal(statusWhenNoPool(["ok", "ok"]), "absent");
});

test("selects the deepest pool across quote assets", () => {
  const shallowUsd = {
    id: "usd",
    reserveQuote: "1500000000",
    quoteSymbol: "USDG",
  };
  const deepEth = {
    id: "eth",
    reserveQuote: "2000000000000000000",
    quoteSymbol: "WETH",
  };

  assert.equal(selectDeepestPool([shallowUsd, deepEth]).id, "eth");
});

test("prefers a measurable pool over an unreadable reserve", () => {
  const selected = selectDeepestPool([
    { id: "unknown", reserveQuote: null, quoteSymbol: "USDG" },
    { id: "known", reserveQuote: "1000000000", quoteSymbol: "USDG" },
  ]);

  assert.equal(selected.id, "known");
});
