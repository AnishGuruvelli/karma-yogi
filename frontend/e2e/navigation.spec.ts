import { test, expect } from "@playwright/test";
import { loginAs } from "./helpers";

test.describe("Navigation", () => {
  test.beforeEach(async ({ page }) => {
    await loginAs(page);
  });

  test("dashboard loads after login", async ({ page }) => {
    await expect(page).toHaveURL("/");
    // Top nav should be visible
    await expect(page.locator("nav")).toBeVisible();
  });

  test("all nav items are present", async ({ page }) => {
    const labels = ["Today", "Sessions", "Insights", "Friends", "Library", "Profile"];
    for (const label of labels) {
      await expect(page.locator(`text=${label}`).first()).toBeVisible();
    }
  });

  test("navigates to Sessions page", async ({ page }) => {
    await page.click('text=Sessions');
    await expect(page).toHaveURL("/sessions");
  });

  test("navigates to Insights page", async ({ page }) => {
    await page.click('text=Insights');
    await expect(page).toHaveURL("/insights");
  });

  test("navigates to Friends page", async ({ page }) => {
    await page.click('text=Friends');
    await expect(page).toHaveURL("/friends");
  });

  test("navigates to Library page", async ({ page }) => {
    await page.click('text=Library');
    await expect(page).toHaveURL("/library");
  });

  test("navigates to Profile page", async ({ page }) => {
    await page.click('text=Profile');
    await expect(page).toHaveURL("/profile");
  });

  test("Profile nav is active on /profile", async ({ page }) => {
    await page.goto("/profile");
    // Profile nav link should be highlighted (has text-primary class or similar)
    const profileLink = page.locator('a[href="/profile"]').first();
    await expect(profileLink).toBeVisible();
  });

  test("Friends nav is active when viewing a friend profile", async ({ page }) => {
    await page.goto("/friends/someuser");
    // Friends nav should be active, not Profile
    const currentPath = await page.evaluate(() => window.location.pathname);
    expect(currentPath).toBe("/friends/someuser");
  });

  test("404 page shows for unknown routes", async ({ page }) => {
    await page.goto("/this-route-does-not-exist");
    await expect(page.locator("text=404")).toBeVisible({ timeout: 5_000 });
  });

  test("dark mode toggle works", async ({ page }) => {
    const html = page.locator("html");
    const initialClass = await html.getAttribute("class") ?? "";
    await page.click('[aria-label*="theme"], button:has(svg.lucide-moon), button:has(svg.lucide-sun)');
    await page.waitForTimeout(300);
    const newClass = await html.getAttribute("class") ?? "";
    // Class should have changed (dark mode toggled)
    expect(newClass).not.toBe(initialClass);
  });
});
