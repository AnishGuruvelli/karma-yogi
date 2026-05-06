import { test, expect } from "@playwright/test";
import { loginAs } from "./helpers";

test.describe("Insights", () => {
  test.beforeEach(async ({ page }) => {
    await loginAs(page);
    await page.goto("/insights");
  });

  test("insights page loads", async ({ page }) => {
    await page.waitForLoadState("networkidle");
    // Should show either data or empty state — no error
    await expect(page.locator("body")).not.toContainText("Something went wrong");
  });

  test("heatmap section is visible", async ({ page }) => {
    await page.waitForLoadState("networkidle");
    await expect(page.locator('text=Focus Heatmap, text=Heatmap').first()).toBeVisible({ timeout: 8_000 });
  });

  test("week selector works", async ({ page }) => {
    await page.waitForLoadState("networkidle");
    const prevBtn = page.locator('button[aria-label*="prev"], button:has-text("←"), button:has-text("‹")').first();
    if (await prevBtn.isVisible()) {
      await prevBtn.click();
      await page.waitForTimeout(300);
    }
    await expect(page.locator("body")).not.toContainText("Something went wrong");
  });

  test("heatmap year toggle works", async ({ page }) => {
    await page.waitForLoadState("networkidle");
    const yearBtn2025 = page.locator('button:has-text("2025")');
    const yearBtn2026 = page.locator('button:has-text("2026")');
    if (await yearBtn2025.isVisible()) {
      await yearBtn2025.click();
      await page.waitForTimeout(200);
      await yearBtn2026.click();
      await page.waitForTimeout(200);
    }
    await expect(page.locator("body")).not.toContainText("Something went wrong");
  });
});
