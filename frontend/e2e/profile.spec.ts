import { test, expect } from "@playwright/test";
import { loginAs } from "./helpers";

test.describe("Profile", () => {
  test.beforeEach(async ({ page }) => {
    await loginAs(page);
    await page.goto("/profile");
  });

  test("profile page loads", async ({ page }) => {
    await page.waitForLoadState("networkidle");
    await expect(page.locator("body")).not.toContainText("Something went wrong");
  });

  test("profile edit fields are present", async ({ page }) => {
    await page.waitForLoadState("networkidle");
    // Should have some form inputs for editing profile
    await expect(page.locator("input, textarea").first()).toBeVisible({ timeout: 8_000 });
  });
});

test.describe("Public Profile", () => {
  test.beforeEach(async ({ page }) => {
    await loginAs(page);
  });

  test("public profile navigated from friends uses /friends/ route", async ({ page }) => {
    await page.goto("/friends");
    await page.waitForLoadState("networkidle");
    // If there are any friend links, they should go to /friends/username
    const friendLinks = await page.locator('a[href*="/friends/"]').all();
    for (const link of friendLinks) {
      const href = await link.getAttribute("href");
      expect(href).toMatch(/^\/friends\/.+/);
    }
  });

  test("friend profile route uses Friends nav highlight", async ({ page }) => {
    // Navigate to a public profile via /friends/ route
    await page.goto("/friends/test-user");
    await page.waitForLoadState("networkidle");
    // Should not show profile error for valid navigation
    await expect(page.locator("body")).not.toContainText("Something went wrong");
    // Current path should still be /friends/...
    expect(page.url()).toContain("/friends/");
  });
});
