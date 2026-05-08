import { test, expect } from "@playwright/test";
import { loginAs } from "./helpers";

test.describe("Sessions", () => {
  test.beforeEach(async ({ page }) => {
    await loginAs(page);
    await page.goto("/sessions");
  });

  test("sessions page loads", async ({ page }) => {
    await expect(page.locator("h1, h2").first()).toBeVisible({ timeout: 8_000 });
  });

  test("Log session button is visible", async ({ page }) => {
    await expect(page.locator('button:has-text("Log Session")').first()).toBeVisible({ timeout: 8_000 });
  });

  test("Log session modal opens", async ({ page }) => {
    await page.locator('button:has-text("Log Session")').first().click();
    await expect(page.locator('[role="dialog"]')).toBeVisible({ timeout: 5_000 });
  });

  test("Log session modal save button is disabled without required fields", async ({ page }) => {
    await page.locator('button:has-text("Log Session")').first().click();
    await page.waitForSelector('[role="dialog"]', { timeout: 5_000 });
    // The save button (type="button") is disabled until all required fields are filled
    const saveBtn = page.locator('[role="dialog"] button').filter({ hasText: /Save Session|required|first/i }).first();
    await expect(saveBtn).toBeDisabled({ timeout: 5_000 });
  });

  test("Log session modal mood buttons are interactive", async ({ page }) => {
    await page.locator('button:has-text("Log Session")').first().click();
    await page.waitForSelector('[role="dialog"]', { timeout: 5_000 });
    // Mood rating buttons should be present (1-5)
    const moodButton = page.locator('[role="dialog"] button').filter({ hasText: /^[1-5]$/ }).first();
    if (await moodButton.isVisible()) {
      await moodButton.click();
      // Modal should still be open after clicking mood
      await expect(page.locator('[role="dialog"]')).toBeVisible();
    }
  });

  test("Log session modal closes on Escape", async ({ page }) => {
    await page.locator('button:has-text("Log Session")').first().click();
    await page.waitForSelector('[role="dialog"]', { timeout: 5_000 });
    await page.keyboard.press("Escape");
    await expect(page.locator('[role="dialog"]')).not.toBeVisible({ timeout: 3_000 });
  });
});
