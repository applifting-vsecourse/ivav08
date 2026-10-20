import { defineConfig, devices } from "@playwright/test"

// E2E tests run against the app you already have running with `pnpm dev`
// (frontend on 3050, API on 4050, seeded demo users).
export default defineConfig({
  testDir: "./e2e",
  fullyParallel: false,
  reporter: "list",
  use: {
    baseURL: "http://localhost:3050",
    trace: "retain-on-failure",
  },
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
  ],
})
