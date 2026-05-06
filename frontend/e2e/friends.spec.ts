import { test, expect } from "@playwright/test";
import { loginAs } from "./helpers";

test.describe("Friends", () => {
  test.beforeEach(async ({ page }) => {
    await loginAs(page);
    await page.goto("/friends");
  });

  test("friends page loads", async ({ page }) => {
    await page.waitForLoadState("networkidle");
    await expect(page.locator("body")).not.toContainText("Something went wrong");
  });

  test("friends tabs are visible", async ({ page }) => {
    await page.waitForLoadState("networkidle");
    // Should have tabs for leaderboard, friends, discover, requests
    const tabLabels = ["Friends", "Discover", "Requests"];
    for (const label of tabLabels) {
      await expect(page.locator(`button:has-text("${label}")`).first()).toBeVisible({ timeout: 8_000 });
    }
  });

  test("search input works", async ({ page }) => {
    await page.waitForLoadState("networkidle");
    const searchInput = page.locator('input[placeholder*="Search"]');
    if (await searchInput.isVisible()) {
      await searchInput.fill("test");
      await page.waitForTimeout(300);
      // Should not crash
      await expect(page.locator("body")).not.toContainText("Something went wrong");
    }
  });

  test("friend links use /friends/ prefix", async ({ page }) => {
    await page.waitForLoadState("networkidle");
    const allLinks = await page.locator('a[href*="/profile/"]').all();
    // No links should go to /profile/username — all should be /friends/username
    expect(allLinks.length).toBe(0);
  });

  test("leaderboard tab loads", async ({ page }) => {
    await page.waitForLoadState("networkidle");
    const leaderboardTab = page.locator('button:has-text("Leaderboard"), button:has-text("leaderboard")').first();
    if (await leaderboardTab.isVisible()) {
      await leaderboardTab.click();
      await page.waitForTimeout(500);
      await expect(page.locator("body")).not.toContainText("Something went wrong");
    }
  });
});
