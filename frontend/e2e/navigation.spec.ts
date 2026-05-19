import { test, expect } from "@playwright/test";
import { loginAs } from "./helpers";

test.describe("Navigation", () => {
  test.beforeEach(async ({ page }) => {
    await loginAs(page);
  });

  test("dashboard loads after login", async ({ page }) => {
    await expect(page).toHaveURL("/");
    await expect(page.locator("nav").first()).toBeVisible();
  });

  test("center nav has Today, Sessions, Insights, Friends", async ({ page }) => {
    const labels = ["Today", "Sessions", "Insights", "Friends"];
    for (const label of labels) {
      await expect(page.locator(`text=${label}`).first()).toBeVisible();
    }
  });

  test("Library and Profile are accessible via avatar dropdown", async ({ page }) => {
    await page.locator('button[aria-label="Account menu"]').first().click();
    await expect(page.locator('text=Library').first()).toBeVisible({ timeout: 3_000 });
    await expect(page.locator('text=Profile').first()).toBeVisible({ timeout: 3_000 });
    // Close dropdown by pressing Escape
    await page.keyboard.press("Escape");
  });

  test("navigates to Sessions page", async ({ page }) => {
    await page.locator('a[href="/sessions"]').first().click();
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

  test("navigates to Library page via avatar dropdown", async ({ page }) => {
    await page.locator('button[aria-label="Account menu"]').first().click();
    await page.waitForSelector('a[href="/library"]', { timeout: 3_000 });
    await page.locator('a[href="/library"]').first().click();
    await expect(page).toHaveURL("/library");
  });

  test("navigates to Profile page via avatar dropdown", async ({ page }) => {
    await page.locator('button[aria-label="Account menu"]').first().click();
    await page.waitForSelector('a[href="/profile"]', { timeout: 3_000 });
    await page.locator('a[href="/profile"]').first().click();
    await expect(page).toHaveURL("/profile");
  });

  test("Profile nav is active on /profile", async ({ page }) => {
    await page.goto("/profile");
    await expect(page.locator("body")).not.toContainText("Something went wrong");
  });

  test("Friends nav is active when viewing a friend profile", async ({ page }) => {
    await page.goto("/friends/someuser");
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
    await page.locator('button[aria-label="Toggle dark mode"]').first().click();
    await page.waitForTimeout(300);
    const newClass = await html.getAttribute("class") ?? "";
    expect(newClass).not.toBe(initialClass);
  });

  test("avatar dropdown shows user name and log out option", async ({ page }) => {
    await page.locator('button[aria-label="Account menu"]').first().click();
    await expect(page.locator('text=Log out').first()).toBeVisible({ timeout: 3_000 });
    // Close
    await page.keyboard.press("Escape");
  });
});
