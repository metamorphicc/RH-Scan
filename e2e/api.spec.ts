import { expect, test } from "@playwright/test";

test("API validation and hardening headers are active", async ({ request }) => {
  const missingToken = await request.get("/api/check");
  expect(missingToken.status()).toBe(400);
  expect(missingToken.headers()["x-ratelimit-limit"]).toBe("60");
  expect(missingToken.headers()["cache-control"]).toContain("no-store");
  expect(missingToken.headers()["x-content-type-options"]).toBe("nosniff");

  const invalidHistory = await request.get("/api/history?token=not-an-address");
  expect(invalidHistory.status()).toBe(400);

  const health = await request.get("/api/health");
  expect(health.status()).toBe(200);
  await expect(health.json()).resolves.toMatchObject({
    status: "ok",
    database: true,
    rpcConfigured: true,
  });
});
