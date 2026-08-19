import { test, expect } from "@playwright/test";

test.describe("Landing page", () => {
  test("loads and has a working sign-up link", async ({ page }) => {
    await page.goto("/");
    await expect(page).toHaveTitle(/webma/i);
    await page.getByRole("link", { name: /get started|sign up|start/i }).first().click();
    await expect(page).toHaveURL(/\/signup/);
  });
});

test.describe("Login page", () => {
  test("renders the form and requires both fields before submitting", async ({ page }) => {
    await page.goto("/login");
    const submit = page.getByRole("button", { name: /log in|sign in/i });
    await submit.click();

    // Browser-native required-field validation blocks submission before any
    // network request fires, so we're asserting we never left the page —
    // no Supabase call happens, nothing to mock.
    await expect(page).toHaveURL(/\/login/);
  });

  test("has a link to create an account", async ({ page }) => {
    await page.goto("/login");
    await page.getByRole("link", { name: /sign up|create an account/i }).click();
    await expect(page).toHaveURL(/\/signup/);
  });
});

test.describe("Signup page", () => {
  test("enforces the minimum password length client-side", async ({ page }) => {
    await page.goto("/signup");
    await page.getByLabel(/email/i).fill("newuser@example.com");
    const passwordField = page.getByLabel(/password/i);
    await passwordField.fill("short");
    await page.getByRole("button", { name: /create account|sign up/i }).click();

    // minLength=8 on the input — the browser rejects "short" (5 chars)
    // without ever calling supabase.auth.signUp, so we're still on /signup.
    await expect(page).toHaveURL(/\/signup/);
    const validationMessage = await passwordField.evaluate((el: HTMLInputElement) => el.validationMessage);
    expect(validationMessage.length).toBeGreaterThan(0);
  });
});
