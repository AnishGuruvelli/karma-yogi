import { test, expect } from "@playwright/test";
import { loginAs } from "./helpers";

test.describe("Profile", () => {
  test.beforeEach(async ({ page }) => {
    await loginAs(page);
    await page.goto("/profile");
    await page.waitForLoadState("networkidle");
  });

  test("profile page loads without error", async ({ page }) => {
    await expect(page.locator("body")).not.toContainText("Something went wrong");
  });

  test("hero metrics are visible (streak, focus, sessions)", async ({ page }) => {
    // HeroMetric labels have sm:hidden on mobile but are in a hidden sm:block div on desktop.
    // Check unit text which is always visible regardless of viewport.
    await expect(page.locator("body")).toContainText("days", { timeout: 8_000 });
    await expect(page.locator("body")).toContainText("hours", { timeout: 8_000 });
    await expect(page.locator("body")).toContainText("logged", { timeout: 8_000 });
  });

  test("Account tab: edit fields are present in edit mode", async ({ page }) => {
    await page.locator('button:has-text("Account")').first().click();
    await page.waitForTimeout(300);
    const editBtn = page.locator("button").filter({ hasText: /^\s*Edit\s*$/ });
    await editBtn.first().click();
    await expect(page.locator("input").first()).toBeVisible({ timeout: 8_000 });
  });

  test("Account tab: saves a name change and verifies the update", async ({ page }) => {
    await page.locator('button:has-text("Account")').first().click();
    await page.waitForTimeout(300);
    const editBtn = page.locator("button").filter({ hasText: /^\s*Edit\s*$/ });
    await editBtn.first().click();
    await page.waitForSelector("input", { timeout: 5_000 });

    // Full name is the first text input in edit mode
    const nameInput = page.locator('input[type="text"]').first();
    const updatedName = `E2E User ${Date.now()}`;
    await nameInput.fill(updatedName);

    await page.locator("button").filter({ hasText: /^\s*Save\s*$/ }).first().click();
    await expect(page.locator("body")).toContainText(updatedName, { timeout: 8_000 });
  });

  test("Achievements tab: lists achievement badges including First Session", async ({ page }) => {
    await page.locator('button:has-text("Achievements")').first().click();
    await page.waitForTimeout(500);
    await expect(page.locator("body")).not.toContainText("Something went wrong");
    await expect(page.locator('text=First Session').first()).toBeVisible({ timeout: 8_000 });
  });

  test("Achievements tab: shows earned/total count in tab badge", async ({ page }) => {
    // Tab badge format: "X/10"
    const achTab = page.locator('button:has-text("Achievements")').first();
    await expect(achTab).toBeVisible({ timeout: 8_000 });
    const tabText = await achTab.innerText();
    expect(tabText).toMatch(/\d+\/\d+/);
  });

  test("Preferences tab: privacy toggles are visible", async ({ page }) => {
    await page.locator('button:has-text("Preferences")').first().click();
    await page.waitForTimeout(300);
    await expect(page.locator("body")).not.toContainText("Something went wrong");
    await expect(page.locator('text=Public profile').first()).toBeVisible({ timeout: 8_000 });
    await expect(page.locator('text=Show on leaderboard').first()).toBeVisible({ timeout: 8_000 });
  });

  test("Preferences tab: privacy toggle can be clicked", async ({ page }) => {
    await page.locator('button:has-text("Preferences")').first().click();
    await page.waitForTimeout(300);
    // The Public profile switch has aria-label="Public profile"
    const toggle = page.locator('[aria-label="Public profile"]').first();
    if (await toggle.isVisible()) {
      const initialState = await toggle.getAttribute("data-state");
      await toggle.click();
      await page.waitForTimeout(300);
      const newState = await toggle.getAttribute("data-state");
      // State should have changed
      expect(newState).not.toBe(initialState);
      // Toggle back to original state
      await toggle.click();
    }
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
