import { defineConfig, devices } from "@playwright/test"

import {
  BACKEND_PORT,
  BACKEND_URL,
  STOREFRONT_PORT,
  STOREFRONT_URL,
  readEnvFile,
  storefrontDir,
} from "./e2e/support/env"

// Runs its own backend on 9001 and a production storefront build on 3001, so a
// dev pair on 9000/8000 is left alone. RESEND_API_KEY and REDIS_URL are empty:
// no mail is sent and no queues are shared. The storefront build waits for the
// backend's health endpoint because prerendering needs the API.
export default defineConfig({
  testDir: "./e2e",
  // The flows share one database and one backend, and each one places orders.
  fullyParallel: false,
  workers: 1,
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? 1 : 0,
  timeout: 180_000,
  expect: { timeout: 20_000 },
  reporter: process.env.CI ? [["list"], ["html", { open: "never" }]] : [["list"]],
  use: {
    ...devices["Desktop Chrome"],
    // The installed Chrome, not a downloaded Playwright build.
    channel: "chrome",
    baseURL: STOREFRONT_URL,
    viewport: { width: 1280, height: 900 },
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
  },
  webServer: [
    {
      name: "backend",
      cwd: "../backend",
      command: "pnpm exec medusa develop",
      url: `${BACKEND_URL}/health`,
      reuseExistingServer: !process.env.CI,
      timeout: 240_000,
      env: {
        PORT: String(BACKEND_PORT),
        STORE_CORS: STOREFRONT_URL,
        ADMIN_CORS: STOREFRONT_URL,
        AUTH_CORS: STOREFRONT_URL,
        RESEND_API_KEY: "",
        RESEND_FROM: "",
        REDIS_URL: "",
      },
    },
    {
      name: "storefront",
      cwd: storefrontDir,
      command: `sh -c "until curl -sf ${BACKEND_URL}/health > /dev/null; do sleep 1; done; pnpm run build && pnpm exec next start -p ${STOREFRONT_PORT}"`,
      url: `${STOREFRONT_URL}/api/health`,
      reuseExistingServer: !process.env.CI,
      timeout: 420_000,
      env: {
        NEXT_PUBLIC_MEDUSA_BACKEND_URL: BACKEND_URL,
        MEDUSA_BACKEND_URL: BACKEND_URL,
        NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY:
          readEnvFile(`${storefrontDir}/.env.local`)
            .NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY ?? "",
        NEXT_PUBLIC_SITE_URL: STOREFRONT_URL,
      },
    },
  ],
})
