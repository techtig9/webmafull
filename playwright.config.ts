import { defineConfig, devices } from "@playwright/test";

/**
 * Two kinds of specs live under e2e/:
 *  - smoke.spec.ts: unauthenticated pages only (landing, login, signup form
 *    validation). Runs against any deployment with zero configuration beyond
 *    a base URL — nothing here touches Supabase, so there's nothing to mock.
 *  - generator-flow.spec.ts: the authenticated generate -> drag-reorder ->
 *    save flow. This exercises real middleware and Server Components, which
 *    make their own server-to-server calls to Supabase — invisible to
 *    Playwright's browser-level page.route() interception. There is no way
 *    to meaningfully fake that without a real backend, so this spec expects
 *    E2E_TEST_EMAIL / E2E_TEST_PASSWORD for a seeded user in a dedicated
 *    Supabase *test* project (never production), and skips itself with a
 *    clear message when they're absent instead of failing opaquely.
 */
export default defineConfig({
  testDir: "./e2e",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? [["github"], ["html", { open: "never" }]] : "list",
  use: {
    baseURL: process.env.E2E_BASE_URL ?? "http://localhost:3000",
    trace: "on-first-retry",
    screenshot: "only-on-failure",
  },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
  webServer: process.env.E2E_BASE_URL
    ? undefined // pointed at an already-running deployment (e.g. a preview URL)
    : {
        command: "npm run build && npm run start",
        url: "http://localhost:3000",
        reuseExistingServer: !process.env.CI,
        timeout: 120_000,
      },
});
