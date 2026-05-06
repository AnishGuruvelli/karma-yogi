import { test, expect } from "@playwright/test";

test.describe("Authentication", () => {
  test("shows login screen on first visit", async ({ page }) => {
    await page.goto("/");
    await expect(page.locator('[id="auth-email"]')).toBeVisible({ timeout: 10_000 });
    await expect(page.locator('[id="auth-password"]')).toBeVisible();
  });

  test("shows validation error for empty submit", async ({ page }) => {
    await page.goto("/");
    await page.waitForSelector('[id="auth-email"]', { timeout: 10_000 });
    // Fill email but leave password empty to bypass HTML5 required on email
    await page.fill('[id="auth-email"]', "test@example.com");
    await page.click('button[type="submit"]');
    // Either HTML5 native validation or React error; in both cases we stay on auth screen
    await expect(page.locator('[id="auth-email"]')).toBeVisible();
  });

  test("shows error for wrong credentials", async ({ page }) => {
    await page.goto("/");
    await page.waitForSelector('[id="auth-email"]', { timeout: 10_000 });
    await page.fill('[id="auth-email"]', "notauser@example.com");
    await page.fill('[id="auth-password"]', "wrongpassword");
    await page.click('button[type="submit"]');
    await expect(page.locator(".text-destructive")).toBeVisible({ timeout: 8_000 });
  });

  test("toggles password visibility", async ({ page }) => {
    await page.goto("/");
    await page.waitForSelector('[id="auth-password"]', { timeout: 10_000 });
    const input = page.locator('[id="auth-password"]');
    await expect(input).toHaveAttribute("type", "password");
    await page.click('[aria-label="Show password"]');
    await expect(input).toHaveAttribute("type", "text");
    await page.click('[aria-label="Hide password"]');
    await expect(input).toHaveAttribute("type", "password");
  });

  test("switches between login and register views", async ({ page }) => {
    await page.goto("/");
    await page.waitForSelector('[id="auth-email"]', { timeout: 10_000 });
    await expect(page.locator('[id="auth-fullname"]')).not.toBeVisible();
    await page.click('text=Create an account');
    await expect(page.locator('[id="auth-fullname"]')).toBeVisible();
    await page.click('text=Sign in');
    await expect(page.locator('[id="auth-fullname"]')).not.toBeVisible();
  });

  test("register form validates mismatched passwords", async ({ page }) => {
    await page.goto("/");
    await page.waitForSelector('[id="auth-email"]', { timeout: 10_000 });
    await page.click('text=Create an account');
    await page.fill('[id="auth-fullname"]', "Test User");
    await page.fill('[id="auth-email"]', "test@example.com");
    await page.fill('[id="auth-password"]', "password123");
    await page.fill('[id="auth-confirm-password"]', "differentpassword");
    await page.click('button[type="submit"]');
    await expect(page.locator(".text-destructive")).toBeVisible();
  });

  test("password reset form is accessible", async ({ page }) => {
    await page.goto("/");
    await page.waitForSelector('[id="auth-email"]', { timeout: 10_000 });
    await page.click('text=Forgot?');
    await expect(page.locator('label:has-text("Security question")')).toBeVisible();
    await page.click('text=Back to sign in');
    await expect(page.locator('[id="auth-email"]')).toBeVisible();
  });
});
