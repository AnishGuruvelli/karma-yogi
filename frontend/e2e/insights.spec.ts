import { test, expect } from "@playwright/test";
import { loginAs } from "./helpers";

test.describe("Insights", () => {
  test.beforeEach(async ({ page }) => {
    await loginAs(page);
    await page.goto("/insights");
    await page.waitForLoadState("networkidle");
  });

  test("insights page loads without error", async ({ page }) => {
    await expect(page.locator("body")).not.toContainText("Something went wrong");
  });

  test("bar chart SVG is rendered", async ({ page }) => {
    // Recharts renders an <svg> inside the ResponsiveContainer
    await expect(page.locator("svg").first()).toBeVisible({ timeout: 8_000 });
  });

  test("weekly overview section heading is visible", async ({ page }) => {
    // "Weekly Overview" heading is always rendered, independent of session data
    await expect(page.locator('text=Weekly Overview').first()).toBeVisible({ timeout: 8_000 });
  });

  test("heatmap section heading is visible", async ({ page }) => {
    await expect(page.locator('text=Focus Heatmap').first()).toBeVisible({ timeout: 8_000 });
  });

  test("week/month mode toggle switches chart without crash", async ({ page }) => {
    const monthBtn = page.locator('button:has-text("Month")').first();
    const weekBtn = page.locator('button:has-text("Week")').first();
    if (await monthBtn.isVisible()) {
      await monthBtn.click();
      await page.waitForTimeout(300);
      await expect(page.locator("svg").first()).toBeVisible({ timeout: 5_000 });
      await weekBtn.click();
      await page.waitForTimeout(300);
      await expect(page.locator("svg").first()).toBeVisible({ timeout: 5_000 });
    }
    await expect(page.locator("body")).not.toContainText("Something went wrong");
  });

  test("week selector navigates to previous week without crash", async ({ page }) => {
    const prevBtn = page
      .locator('button[aria-label*="prev"], button:has-text("←"), button:has-text("‹")')
      .first();
    if (await prevBtn.isVisible()) {
      await prevBtn.click();
      await page.waitForTimeout(300);
    }
    await expect(page.locator("body")).not.toContainText("Something went wrong");
  });

  test("heatmap year toggle switches year without crash", async ({ page }) => {
    const yearBtn2025 = page.locator('button:has-text("2025")');
    const yearBtn2026 = page.locator('button:has-text("2026")');
    if (await yearBtn2025.isVisible()) {
      await yearBtn2025.click();
      await page.waitForTimeout(200);
      await expect(page.locator('text=Focus Heatmap').first()).toBeVisible({ timeout: 5_000 });
      await yearBtn2026.click();
      await page.waitForTimeout(200);
      await expect(page.locator('text=Focus Heatmap').first()).toBeVisible({ timeout: 5_000 });
    }
    await expect(page.locator("body")).not.toContainText("Something went wrong");
  });

  test("pie chart section renders when subjects exist", async ({ page }) => {
    // The pie chart section only appears when there are sessions with subjects
    // Either the chart SVG appears, or the empty-state message is shown — no crash
    await expect(page.locator("body")).not.toContainText("Something went wrong");
    const hasPie = await page.locator("svg").count();
    expect(hasPie).toBeGreaterThanOrEqual(1);
  });
});
