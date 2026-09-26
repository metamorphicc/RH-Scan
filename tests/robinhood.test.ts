import assert from "node:assert/strict";
import test from "node:test";
import {
  clearRobinhoodAssetsCacheForTests,
  readRobinhoodAssetIdentity,
} from "../lib/robinhood";

const TOKEN = "0x0000000000000000000000000000000000000042" as const;

test("identifies a canonical Robinhood Chain asset by chain and address", async () => {
  clearRobinhoodAssetsCacheForTests();
  const result = await readRobinhoodAssetIdentity(TOKEN, {
    now: () => Date.parse("2026-09-27T00:00:00.000Z"),
    fetcher: async () =>
      Response.json({
        assets: [
          {
            id: "asset-42",
            tokenSymbol: "TEST",
            tokenName: "Test Corp Robinhood Token",
            deployments: [{ contractAddress: TOKEN, chainId: 4663 }],
            currentMultiplier: "1.000000000000000000",
            pendingMultiplier: "",
            logoUrl: "https://cdn.example.test/token.png",
            status: "ASSET_STATUS_ACTIVE",
          },
        ],
      }),
  });

  assert.equal(result.status, "canonical");
  assert.equal(result.asset?.tokenSymbol, "TEST");
  assert.equal(result.asset?.pendingMultiplier, null);
});

test("does not turn registry failure into a token identity claim", async () => {
  clearRobinhoodAssetsCacheForTests();
  const result = await readRobinhoodAssetIdentity(TOKEN, {
    fetcher: async () => new Response(null, { status: 503 }),
  });

  assert.equal(result.status, "unavailable");
  assert.equal(result.asset, null);
});

test("ignores unsafe asset API URL overrides", async () => {
  clearRobinhoodAssetsCacheForTests();
  const result = await readRobinhoodAssetIdentity(TOKEN, {
    apiUrl: "data:text/plain,not-an-api",
    fetcher: async (input) => {
      assert.equal(String(input), "https://api.robinhood.com/rhj/assets");
      return Response.json({ assets: [] });
    },
  });

  assert.equal(result.status, "not-listed");
  assert.equal(result.sourceUrl, "https://api.robinhood.com/rhj/assets");
});
