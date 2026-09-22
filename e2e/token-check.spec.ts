import { expect, test } from "@playwright/test";

const TOKEN = "0x492641F648a4986844848E0beFE66D14817bCE34";
const OBSERVED_AT = "2026-09-22T12:00:00.000Z";

test("checks a token without layout overflow", async ({ page }, testInfo) => {
  await page.route("**/api/check?token=**", async (route) => {
    await route.fulfill({
      contentType: "application/json",
      json: {
        tokenAddress: TOKEN,
        verdict: "thin",
        block: 70_000_000,
        timestamp: OBSERVED_AT,
        facts: ["authority result", "pool result", "deployer result"],
        factDetails: [
          {
            id: "rights",
            label: "Contract rights",
            value: "mint unknown, freeze absent, owner absent",
            source: "Robinhood Chain RPC",
            sourceUrl: `https://robinhoodchain.blockscout.com/address/${TOKEN}`,
            observedAt: OBSERVED_AT,
          },
          {
            id: "pool",
            label: "Liquidity pool",
            value: "Uniswap V3, 2500 USDG",
            source: "Uniswap V3 factory",
            sourceUrl: "https://robinhoodchain.blockscout.com/address/0x0000000000000000000000000000000000000001",
            observedAt: OBSERVED_AT,
          },
          {
            id: "deployer",
            label: "Contract creator",
            value: "0x062f05CD6c835677B05a8658A351969476861316",
            source: "Blockscout + local history",
            sourceUrl: "https://robinhoodchain.blockscout.com/address/0x062f05CD6c835677B05a8658A351969476861316",
            observedAt: OBSERVED_AT,
          },
        ],
        flags: [
          {
            code: "mint-unknown",
            label: "Mint authority is unknown.",
            severity: "caution",
          },
        ],
        cached: false,
        rights: { metadata: { name: "Chainlink", symbol: "LINK" } },
      },
    });
  });
  await page.route("**/api/history?token=**", async (route) => {
    await route.fulfill({
      contentType: "application/json",
      json: {
        items: [
          {
            block: 70_000_000,
            timestamp: OBSERVED_AT,
            verdict: "thin",
            flags: ["mint-unknown"],
            changes: [
              { field: "Mint authority", from: "present", to: "unknown" },
            ],
          },
        ],
      },
    });
  });

  await page.goto("/");
  await page.getByLabel("Token address").fill(TOKEN);
  await page.getByRole("button", { name: "Check" }).click();

  await expect(page).toHaveURL(new RegExp(`/t/${TOKEN}$`, "i"));
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("thin");
  await expect(page.getByText("Contract rights")).toBeVisible();
  await expect(page.getByText("Mint authority: present -> unknown")).toBeVisible();

  const overflow = await page.evaluate(
    () => document.documentElement.scrollWidth - window.innerWidth,
  );
  expect(overflow).toBeLessThanOrEqual(1);

  await page.screenshot({
    fullPage: true,
    path: testInfo.outputPath("token-result.png"),
  });
});
