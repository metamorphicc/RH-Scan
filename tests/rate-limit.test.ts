import { mkdirSync } from "node:fs";
import { join } from "node:path";
import test from "node:test";
import assert from "node:assert/strict";

const databasePath = join(
  process.cwd(),
  ".test-build",
  "tmp",
  `rate-limit-${process.pid}-${Date.now()}.sqlite`,
);
mkdirSync(join(process.cwd(), ".test-build", "tmp"), { recursive: true });
process.env.RHCHECK_DB_PATH = databasePath;

test("persists and enforces the request limit", async () => {
  const { checkRateLimit } = await import("../lib/rate-limit.js");
  const request = new Request("http://localhost/api/check", {
    headers: { "x-forwarded-for": `test-${process.pid}` },
  });

  for (let index = 0; index < 60; index += 1) {
    assert.equal(checkRateLimit(request).allowed, true);
  }

  const denied = checkRateLimit(request);
  assert.equal(denied.allowed, false);
  assert.equal(denied.remaining, 0);
  assert.ok("retryAfterSeconds" in denied && denied.retryAfterSeconds > 0);
});
