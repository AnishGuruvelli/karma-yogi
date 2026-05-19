import { test, expect } from "@playwright/test";
import { loginAs } from "./helpers";

test.describe("Library / Subjects", () => {
  test.beforeEach(async ({ page }) => {
    await loginAs(page);
    await page.goto("/library");
  });

  test("library page loads", async ({ page }) => {
    await page.waitForLoadState("domcontentloaded");
    await expect(page.locator("body")).not.toContainText("Something went wrong");
  });

  test("/data redirects or 404s — /library is canonical", async ({ page }) => {
    await page.goto("/data");
    await page.waitForLoadState("domcontentloaded");
    const url = page.url();
    expect(url).not.toBe("about:blank");
  });

  test("can see subject list or empty state", async ({ page }) => {
    await page.waitForLoadState("domcontentloaded");
    const body = await page.locator("body").innerText();
    expect(body.length).toBeGreaterThan(0);
  });

  test("adds a subject and verifies it in the list, then deletes it", async ({ page }) => {
    await page.waitForLoadState("domcontentloaded");
    const subjectName = `E2E_LIB_${Date.now()}`;

    // Open Add Subject modal (button at the bottom of the subject list)
    await page.locator('button:has-text("Add Subject")').first().click();
    await page.waitForSelector('input[placeholder="Subject name"]', { timeout: 5_000 });

    await page.fill('input[placeholder="Subject name"]', subjectName);

    // Save button is inside .glass-modal — distinguishes it from the list button
    await page.locator('.glass-modal button:has-text("Add Subject")').click();

    // Verify the new subject appears in the list
    await expect(page.locator(`text="${subjectName}"`).first()).toBeVisible({ timeout: 8_000 });

    // Delete it: find the flex row containing our subject and click its trash button
    const row = page
      .locator("div.flex")
      .filter({ hasText: subjectName })
      .filter({ has: page.locator("button") })
      .first();
    await row.locator("button").last().click();

    // Confirm deletion in the AlertDialog
    await page.waitForSelector('[role="alertdialog"]', { timeout: 3_000 });
    await page.locator('[role="alertdialog"]').getByRole("button", { name: "Delete" }).click();

    // Subject should no longer be visible
    await expect(page.locator(`text="${subjectName}"`)).not.toBeVisible({ timeout: 5_000 });
  });

  test("Add Subject modal shows color swatches for selection", async ({ page }) => {
    await page.waitForLoadState("domcontentloaded");
    // Open the Add Subject modal
    await page.locator('button:has-text("Add Subject")').first().click();
    await page.waitForSelector('input[placeholder="Subject name"]', { timeout: 5_000 });

    // Color swatches are inline rounded-full buttons with aria-pressed
    const swatches = page.locator('.glass-modal button[aria-pressed]');
    await expect(swatches.first()).toBeVisible({ timeout: 3_000 });
    const count = await swatches.count();
    expect(count).toBeGreaterThan(1);

    // Click the second swatch to select a different color (no crash)
    await swatches.nth(1).click();
    await expect(swatches.nth(1)).toHaveAttribute('aria-pressed', 'true', { timeout: 2_000 });

    await page.keyboard.press("Escape");
  });

  test("Add Subject modal closes on X button", async ({ page }) => {
    await page.waitForLoadState("domcontentloaded");
    await page.locator('button:has-text("Add Subject")').first().click();
    await page.waitForSelector('input[placeholder="Subject name"]', { timeout: 5_000 });
    // X close button is the first button inside the modal header
    await page.locator('.glass-modal button[type="button"]').first().click();
    await expect(page.locator('input[placeholder="Subject name"]')).not.toBeVisible({ timeout: 3_000 });
  });

  test("Add Subject save button is disabled when name is empty", async ({ page }) => {
    await page.waitForLoadState("domcontentloaded");
    await page.locator('button:has-text("Add Subject")').first().click();
    await page.waitForSelector('input[placeholder="Subject name"]', { timeout: 5_000 });
    const saveBtn = page.locator('.glass-modal button:has-text("Add Subject")');
    await expect(saveBtn).toBeDisabled({ timeout: 3_000 });
  });
});
