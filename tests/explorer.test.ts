import assert from "node:assert/strict";
import test from "node:test";
import { readExplorerContractInfo } from "../lib/explorer";

const TOKEN = "0x492641F648a4986844848E0beFE66D14817bCE34";
const CREATOR = "0x062f05CD6c835677B05a8658A351969476861316";

test("maps Blockscout contract metadata", async () => {
  const fetcher: typeof fetch = async () =>
    new Response(
      JSON.stringify({
        creator_address_hash: CREATOR,
        creation_transaction_hash:
          "0xd860765955ba73bfd6a1cbe53fec629f4a9672ce57c516dd6549234a235dfdb5",
        is_contract: true,
        is_verified: true,
        proxy_type: "eip1967",
        implementations: [{ address_hash: TOKEN }],
      }),
      { status: 200 },
    );

  const result = await readExplorerContractInfo(TOKEN, {
    fetcher,
    apiUrl: "https://example.test/api/v2/",
  });

  assert.equal(result.status, "available");
  assert.equal(result.creatorAddress, CREATOR);
  assert.equal(result.isVerified, true);
  assert.equal(result.explorerUrl, `https://example.test/address/${TOKEN}`);
});

test("keeps checks usable when explorer is unavailable", async () => {
  const fetcher: typeof fetch = async () => {
    throw new Error("offline");
  };

  const result = await readExplorerContractInfo(TOKEN, { fetcher });

  assert.equal(result.status, "unavailable");
  assert.equal(result.creatorAddress, null);
  assert.equal(result.error, "Explorer request failed.");
});
