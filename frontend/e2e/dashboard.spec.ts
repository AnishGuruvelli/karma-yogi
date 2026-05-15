import { test, expect } from "@playwright/test";
import { loginAs } from "./helpers";

test.describe("Dashboard", () => {
  test.beforeEach(async ({ page }) => {
    await loginAs(page);
    await page.goto("/");
    await page.waitForLoadState("networkidle");
  });

  test("dashboard loads without errors", async ({ page }) => {
    await expect(page.locator("body")).not.toContainText("Something went wrong");
  });

  test("Begin Session and Log Session buttons are both present", async ({ page }) => {
    await expect(page.locator('button:has-text("Begin Session")').first()).toBeVisible({ timeout: 8_000 });
    await expect(page.locator('button:has-text("Log Session")').first()).toBeVisible({ timeout: 8_000 });
  });

  test("Begin Session opens timer modal", async ({ page }) => {
    await page.locator('button:has-text("Begin Session")').first().click();
    const dialog = page.locator('[role="dialog"]');
    await expect(dialog).toBeVisible({ timeout: 5_000 });
    // TimerModal has no Escape handler — close via the X button
    await dialog.locator("button").first().click();
    await expect(dialog).not.toBeVisible({ timeout: 3_000 });
  });

  test("Log Session opens log modal", async ({ page }) => {
    await page.locator('button:has-text("Log Session")').first().click();
    await expect(page.locator('[role="dialog"]')).toBeVisible({ timeout: 5_000 });
    await page.keyboard.press("Escape");
    await expect(page.locator('[role="dialog"]')).not.toBeVisible({ timeout: 3_000 });
  });

  test("weekly goal ring SVG is rendered with progress text", async ({ page }) => {
    await expect(page.locator('svg[width="150"]').first()).toBeVisible({ timeout: 8_000 });
    await expect(page.locator('text=% complete').first()).toBeVisible({ timeout: 8_000 });
  });

  test("weekly goal ring shows target hours", async ({ page }) => {
    // e.g. "/ 10h" — shows the weekly target
    await expect(page.locator('text=/\\/ \\d+h/').first()).toBeVisible({ timeout: 8_000 });
  });

  test("exam countdown card renders", async ({ page }) => {
    // Wait for store data to finish loading — either state is valid
    const examCard = page
      .locator('text=Set your exam goal')
      .or(page.locator('text=Exam Goal'));
    await expect(examCard.first()).toBeVisible({ timeout: 10_000 });
  });

  test("stats row shows streak, total focus and sessions metrics", async ({ page }) => {
    // Dashboard stat cards use these exact labels
    await expect(page.locator('text=Studied Today').first()).toBeVisible({ timeout: 8_000 });
    await expect(page.locator('text=This Week').first()).toBeVisible({ timeout: 8_000 });
    await expect(page.locator('text=Current Streak').first()).toBeVisible({ timeout: 8_000 });
  });
});

test.describe("Dashboard - Strategy Page", () => {
  test("strategy dashboard is accessible", async ({ page }) => {
    await loginAs(page);
    await page.goto("/strategy-dashboard");
    await page.waitForLoadState("networkidle");
    await expect(page.locator("body")).not.toContainText("Something went wrong");
  });

  test("/strategy redirects away from /strategy (redirect fires)", async ({ page }) => {
    await loginAs(page);
    await page.goto("/strategy");
    // The route <Navigate to="/strategy-dashboard" replace /> fires; the user
    // may then be redirected to "/" if showStrategyPage is off — either way
    // the URL should never stay at "/strategy".
    await page.waitForFunction(() => !window.location.pathname.startsWith("/strategy") || window.location.pathname.startsWith("/strategy-dashboard"), { timeout: 8_000 });
    expect(page.url()).not.toBe("http://localhost:8081/strategy");
  });
});
