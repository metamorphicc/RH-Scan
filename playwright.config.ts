import { defineConfig } from "@playwright/test";

export default defineConfig({
  testDir: "./e2e",
  fullyParallel: true,
  retries: 1,
  reporter: "line",
  use: {
    baseURL: "http://127.0.0.1:3100",
    trace: "retain-on-failure",
  },
  projects: [
    { name: "mobile", use: { viewport: { width: 320, height: 720 } } },
    { name: "tablet", use: { viewport: { width: 768, height: 1024 } } },
    { name: "desktop", use: { viewport: { width: 1440, height: 900 } } },
  ],
  webServer: {
    command: "corepack pnpm exec next dev -H 127.0.0.1 -p 3100",
    env: {
      RH_CHAIN_ID: "4663",
      RH_RPC_URL: "http://127.0.0.1:1",
    },
    reuseExistingServer: true,
    timeout: 120_000,
    url: "http://127.0.0.1:3100",
  },
});
