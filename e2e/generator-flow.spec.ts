import { test, expect } from "@playwright/test";

/**
 * These tests exercise the real generator UI end to end, including actual
 * pointer-drag physics for the section-reorder panel — something jsdom-based
 * component tests can't reliably do, since dnd-kit depends on real layout and
 * getBoundingClientRect. A real browser makes this the right place to test it.
 *
 * REQUIREMENTS (not something this file fakes):
 *   E2E_TEST_EMAIL / E2E_TEST_PASSWORD - a real user in a dedicated Supabase
 *     *test* project (never production). Login goes through the real UI and
 *     real middleware, which makes a server-to-server call to Supabase that
 *     Playwright's browser-level page.route() cannot see or intercept, so
 *     there's no meaningful way to mock this away.
 *   E2E_TEST_PROJECT_ID - an existing seeded project belonging to that user,
 *     with at least 3 sections on its home page. Reusing a fixed project
 *     avoids spending real AI generation credits on every CI run — this spec
 *     tests editing an existing site, not the generation step itself.
 *
 * Missing env vars => the whole file skips with a clear reason instead of
 * failing opaquely, so a plain `npx playwright test` locally (or in a CI job
 * that hasn't configured a test project yet) doesn't look like a broken test.
 */
const email = process.env.E2E_TEST_EMAIL;
const password = process.env.E2E_TEST_PASSWORD;
const projectId = process.env.E2E_TEST_PROJECT_ID;
const hasCredentials = Boolean(email && password && projectId);

test.describe("Authenticated generator flow", () => {
  test.skip(!hasCredentials, "Requires E2E_TEST_EMAIL, E2E_TEST_PASSWORD, and E2E_TEST_PROJECT_ID for a seeded Supabase test project — see file header.");

  test.beforeEach(async ({ page }) => {
    await page.goto("/login");
    await page.getByLabel(/email/i).fill(email!);
    await page.getByLabel(/password/i).fill(password!);
    await page.getByRole("button", { name: /log in|sign in/i }).click();
    await expect(page).toHaveURL(/\/dashboard/);
  });

  test("opens an existing project into the visual editor", async ({ page }) => {
    await page.goto(`/dashboard/generator?project=${projectId}`);
    await expect(page.getByText(/live preview/i)).toBeVisible();
  });

  test("reorders sections by dragging in the Layers panel, and it persists across reload", async ({ page }) => {
    await page.goto(`/dashboard/generator?project=${projectId}`);

    const layoutPanel = page.getByText("Layout order").locator("..");
    await expect(layoutPanel).toBeVisible();

    const rows = layoutPanel.locator("li");
    const rowCount = await rows.count();
    expect(rowCount).toBeGreaterThanOrEqual(3); // the fixture project needs >= 3 sections

    const firstLabel = (await rows.nth(0).textContent())?.trim();
    const secondLabel = (await rows.nth(1).textContent())?.trim();
    expect(firstLabel).toBeTruthy();
    expect(secondLabel).toBeTruthy();

    // Drag the first handle down past the second row — dnd-kit's pointer
    // sensor needs a real mousedown -> multiple intermediate moves -> mouseup
    // sequence to register as a drag rather than a click; a single dragTo()
    // sometimes fires too few move events for the activation constraint.
    const firstHandle = rows.nth(0).getByRole("button", { name: /drag to reorder/i });
    const firstBox = await firstHandle.boundingBox();
    const secondBox = await rows.nth(1).boundingBox();
    if (!firstBox || !secondBox) throw new Error("Could not measure row positions.");

    await page.mouse.move(firstBox.x + firstBox.width / 2, firstBox.y + firstBox.height / 2);
    await page.mouse.down();
    await page.mouse.move(secondBox.x + secondBox.width / 2, secondBox.y + secondBox.height + 4, { steps: 8 });
    await page.mouse.up();

    // Order should have visibly swapped in the panel...
    await expect(rows.nth(0)).toHaveText(secondLabel!);
    await expect(rows.nth(1)).toHaveText(firstLabel!);

    // ...and the "Saving…" indicator should appear then clear, confirming the
    // /api/projects/reorder-sections request actually round-tripped rather
    // than only updating local state.
    await expect(page.getByText("Saving…")).toBeVisible();
    await expect(page.getByText("Saving…")).not.toBeVisible({ timeout: 5000 });

    // Reload and confirm the new order came back from the server, not just
    // from client-side state that a refresh would have discarded anyway.
    await page.reload();
    const rowsAfterReload = page.getByText("Layout order").locator("..").locator("li");
    await expect(rowsAfterReload.nth(0)).toHaveText(secondLabel!);
    await expect(rowsAfterReload.nth(1)).toHaveText(firstLabel!);
  });

  test("keyboard-only reorder works for accessibility", async ({ page }) => {
    await page.goto(`/dashboard/generator?project=${projectId}`);
    const rows = page.getByText("Layout order").locator("..").locator("li");
    const firstLabel = (await rows.nth(0).textContent())?.trim();

    const firstHandle = rows.nth(0).getByRole("button", { name: /drag to reorder/i });
    await firstHandle.focus();
    await page.keyboard.press("Space"); // pick up
    await page.keyboard.press("ArrowDown"); // move down one position
    await page.keyboard.press("Space"); // drop

    await expect(rows.nth(1)).toHaveText(firstLabel!);
  });
});
