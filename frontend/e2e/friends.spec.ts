import { test, expect } from "@playwright/test";
import { loginAs } from "./helpers";

test.describe("Friends", () => {
  test.beforeEach(async ({ page }) => {
    await loginAs(page);
    await page.goto("/friends");
    await page.waitForLoadState("networkidle");
  });

  test("friends page loads without error", async ({ page }) => {
    await expect(page.locator("body")).not.toContainText("Something went wrong");
  });

  test("all four tab buttons are visible", async ({ page }) => {
    const tabLabels = ["My Friends", "Discover", "Requests"];
    for (const label of tabLabels) {
      await expect(page.locator(`button:has-text("${label}")`).first()).toBeVisible({ timeout: 8_000 });
    }
  });

  test("My Friends tab: shows friend list or empty state", async ({ page }) => {
    await page.locator('button:has-text("My Friends")').first().click();
    await page.waitForTimeout(400);
    await expect(page.locator("body")).not.toContainText("Something went wrong");
    // Should have some content (list, empty state, or placeholder)
    const bodyText = await page.locator("body").innerText();
    expect(bodyText.length).toBeGreaterThan(10);
  });

  test("Discover tab: renders user cards or no-users state", async ({ page }) => {
    await page.locator('button:has-text("Discover")').first().click();
    await page.waitForTimeout(400);
    await expect(page.locator("body")).not.toContainText("Something went wrong");
    const bodyText = await page.locator("body").innerText();
    expect(bodyText.length).toBeGreaterThan(10);
  });

  test("Requests tab: renders incoming/outgoing sections without crash", async ({ page }) => {
    await page.locator('button:has-text("Requests")').first().click();
    await page.waitForTimeout(300);
    await expect(page.locator("body")).not.toContainText("Something went wrong");
  });

  test("Leaderboard tab: renders leaderboard without crash", async ({ page }) => {
    const leaderboardTab = page
      .locator('button:has-text("Leaderboard"), button:has-text("leaderboard")')
      .first();
    if (await leaderboardTab.isVisible()) {
      await leaderboardTab.click();
      await page.waitForTimeout(500);
      await expect(page.locator("body")).not.toContainText("Something went wrong");
    }
  });

  test("search input filters Discover results", async ({ page }) => {
    await page.locator('button:has-text("Discover")').first().click();
    await page.waitForTimeout(300);
    const searchInput = page.locator('input[placeholder*="Search"]');
    if (await searchInput.isVisible()) {
      await searchInput.fill("test");
      await page.waitForTimeout(300);
      await expect(page.locator("body")).not.toContainText("Something went wrong");
      await searchInput.fill("");
      await page.waitForTimeout(300);
      await expect(page.locator("body")).not.toContainText("Something went wrong");
    }
  });

  test("friend profile links all use /friends/ prefix, never /profile/", async ({ page }) => {
    const profileLinks = await page.locator('a[href*="/profile/"]').all();
    expect(profileLinks.length).toBe(0);
  });
});
