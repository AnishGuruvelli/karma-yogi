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
    await expect(page.locator('button:has-text("Log"), button:has-text("log"), button:has-text("Session")')).toBeVisible({ timeout: 8_000 });
  });

  test("Log session modal opens", async ({ page }) => {
    await page.click('button:has-text("Log"), button:has-text("Session")');
    await expect(page.locator('[role="dialog"]')).toBeVisible({ timeout: 5_000 });
  });

  test("Log session modal requires mood selection", async ({ page }) => {
    await page.click('button:has-text("Log"), button:has-text("Session")');
    await page.waitForSelector('[role="dialog"]', { timeout: 5_000 });
    // Submit button should say "Mood is required" or be disabled
    const submitBtn = page.locator('[role="dialog"] button[type="submit"]');
    const btnText = await submitBtn.innerText();
    expect(btnText).toContain("Mood");
  });

  test("Log session modal submit enabled after mood selection", async ({ page }) => {
    await page.click('button:has-text("Log"), button:has-text("Session")');
    await page.waitForSelector('[role="dialog"]', { timeout: 5_000 });
    // Click a mood option (mood rating buttons)
    const moodButton = page.locator('[role="dialog"] button').filter({ hasText: /^[1-5]$/ }).first();
    if (await moodButton.isVisible()) {
      await moodButton.click();
    }
    const submitBtn = page.locator('[role="dialog"] button[type="submit"]');
    await expect(submitBtn).not.toBeDisabled({ timeout: 2_000 });
  });

  test("Log session modal closes on cancel", async ({ page }) => {
    await page.click('button:has-text("Log"), button:has-text("Session")');
    await page.waitForSelector('[role="dialog"]', { timeout: 5_000 });
    await page.keyboard.press("Escape");
    await expect(page.locator('[role="dialog"]')).not.toBeVisible({ timeout: 3_000 });
  });
});
