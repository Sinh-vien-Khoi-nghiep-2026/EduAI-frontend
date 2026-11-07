import { defineConfig } from "@playwright/test";

export default defineConfig({
  testDir: "tests",
  // `.e2e.ts` keeps Playwright specs out of the `bun test` unit glob.
  testMatch: "**/*.e2e.ts",
  timeout: 60_000,
  fullyParallel: false,
  workers: 1,
  reporter: [["list"]],
  use: {
    baseURL: process.env.E2E_BASE_URL ?? "http://localhost:8081",
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
  },
  // Local dev stack: API :8000, dev IdP :8099, frontend :8081 (see docs/admin-console.md).
});
