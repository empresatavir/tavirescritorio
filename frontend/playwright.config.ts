import { defineConfig } from "@playwright/test";

export default defineConfig({
  testDir: "./tests",
  fullyParallel: true,
  retries: 0,
  use: {
    browserName: "chromium",
    baseURL: "http://127.0.0.1:9002",
  },
  webServer: {
    command: "npm run dev -- --host 127.0.0.1 --port 9002",
    url: "http://127.0.0.1:9002",
    reuseExistingServer: true,
    timeout: 120_000,
  },
});
