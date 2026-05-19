import { test, expect } from "@playwright/test";
import { loginAs } from "./helpers";

test.describe("Mocks — Log Test Modal", () => {
  test.beforeEach(async ({ page }) => {
    await loginAs(page);
    await page.goto("/sessions");
    await page.waitForLoadState("domcontentloaded");
  });

  // ── Tab navigation ───────────────────────────────────────────────
  test("Mocks tab loads without crash", async ({ page }) => {
    await page.locator('button:has-text("Mocks")').first().click();
    await expect(page.locator("body")).not.toContainText("Something went wrong");
  });

  test("Sectional tab loads without crash", async ({ page }) => {
    await page.locator('button:has-text("Sectional")').first().click();
    await expect(page.locator("body")).not.toContainText("Something went wrong");
  });

  test("QOTD tab loads without crash", async ({ page }) => {
    await page.locator('button:has-text("QOTD")').first().click();
    await expect(page.locator("body")).not.toContainText("Something went wrong");
  });

  test("Mocks empty state shows Log Test button", async ({ page }) => {
    await page.locator('button:has-text("Mocks")').first().click();
    await expect(page.locator('button:has-text("Log Test")').first()).toBeVisible({ timeout: 8_000 });
  });

  // ── LogTestModal open/close ──────────────────────────────────────
  test("Log Test button opens the modal", async ({ page }) => {
    await page.locator('button:has-text("Log Test")').first().click();
    await expect(page.locator('h2:has-text("Log a Test")').first()).toBeVisible({ timeout: 10_000 });
    await expect(page.locator('text=step 1 / 2').first()).toBeVisible();
  });

  test("modal shows three test type options", async ({ page }) => {
    await page.locator('button:has-text("Log Test")').first().click();
    await expect(page.locator('text=Full Mock').first()).toBeVisible({ timeout: 10_000 });
    // Modal step 1 shows "Sectional" and "QOTD" (not "Sectional Test"/"Question of the Day")
    await expect(page.locator('button:has-text("Sectional")').nth(1)).toBeVisible();
    await expect(page.locator('text=QOTD').first()).toBeVisible();
  });

  test("modal closes via Escape key", async ({ page }) => {
    await page.locator('button:has-text("Log Test")').first().click();
    await expect(page.locator('h2:has-text("Log a Test")').first()).toBeVisible({ timeout: 10_000 });
    await page.keyboard.press("Escape");
    await expect(page.locator('h2:has-text("Log a Test")')).not.toBeVisible({ timeout: 5_000 });
  });

  test("modal closes on backdrop click", async ({ page }) => {
    await page.locator('button:has-text("Log Test")').first().click();
    await expect(page.locator('h2:has-text("Log a Test")').first()).toBeVisible({ timeout: 10_000 });
    await page.mouse.click(10, 10);
    await expect(page.locator('h2:has-text("Log a Test")')).not.toBeVisible({ timeout: 5_000 });
  });

  test("selecting Full Mock shows full mock form with test name field", async ({ page }) => {
    await page.locator('button:has-text("Log Test")').first().click();
    await expect(page.locator('text=Full Mock').first()).toBeVisible({ timeout: 10_000 });
    await page.locator('button:has-text("Full Mock")').click();
    await expect(page.locator('input[placeholder="e.g. Mock CAT 23"]').first()).toBeVisible({ timeout: 8_000 });
  });

  test("selecting Sectional shows sectional form", async ({ page }) => {
    await page.locator('button:has-text("Log Test")').first().click();
    await expect(page.locator('text=Full Mock').first()).toBeVisible({ timeout: 10_000 });
    // Click the Sectional button inside the modal (nth(1) since tab also says Sectional)
    await page.locator('button:has-text("Sectional")').nth(1).click();
    await expect(page.locator('button:has-text("Save Sectional")').first()).toBeVisible({ timeout: 8_000 });
  });

  test("selecting QOTD shows QOTD form with topic buttons", async ({ page }) => {
    await page.locator('button:has-text("QOTD")').first().click();
    await page.locator('button:has-text("Log Test")').first().click();
    await expect(page.locator('text=Full Mock').first()).toBeVisible({ timeout: 10_000 });
    // Click the QOTD type card in step 1 (the card button, not the tab)
    await page.locator('button').filter({ hasText: /^QOTD$/ }).last().click();
    await expect(page.locator('button:has-text("QUANT")').first()).toBeVisible({ timeout: 8_000 });
    await expect(page.locator('button:has-text("Save QOTD Entry")').first()).toBeVisible();
  });

  test("back button in modal step 2 returns to type selector", async ({ page }) => {
    await page.locator('button:has-text("Log Test")').first().click();
    await expect(page.locator('text=Full Mock').first()).toBeVisible({ timeout: 10_000 });
    await page.locator('button:has-text("Full Mock")').click();
    await expect(page.locator('input[placeholder="e.g. Mock CAT 23"]')).toBeVisible({ timeout: 8_000 });
    await page.locator('button[aria-label="Back"]').click();
    await expect(page.locator('text=Full Mock').first()).toBeVisible({ timeout: 5_000 });
    await expect(page.locator('text=step 1 / 2').first()).toBeVisible();
  });

  // ── Full Mock CRUD ───────────────────────────────────────────────
  test("creates a full mock end-to-end", async ({ page }) => {
    const testName = `E2E Mock ${Date.now()}`;

    await page.locator('button:has-text("Mocks")').first().click();
    await page.locator('button:has-text("Log Test")').first().click();
    await expect(page.locator('text=Full Mock').first()).toBeVisible({ timeout: 10_000 });
    await page.locator('button:has-text("Full Mock")').click();

    await expect(page.locator('input[placeholder="e.g. Mock CAT 23"]').first()).toBeVisible({ timeout: 8_000 });
    await page.fill('input[placeholder="e.g. Mock CAT 23"]', testName);

    await page.locator('button:has-text("Save Full Mock")').click();

    await expect(page.locator('h2:has-text("Log a Test")')).not.toBeVisible({ timeout: 10_000 });
    await expect(page.locator("body")).toContainText(testName, { timeout: 10_000 });

    // Cleanup via API
    const token: string = await page.evaluate(
      () => JSON.parse(localStorage.getItem("karma_auth") ?? "{}").accessToken ?? ""
    );
    const listResp = await page.request.get("http://localhost:8080/api/v1/mocks", {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (listResp.ok()) {
      const mocks = await listResp.json();
      const created = (mocks as Array<{ id: string; testName: string }>).find((m) => m.testName === testName);
      if (created) {
        await page.request.delete(`http://localhost:8080/api/v1/mocks/${created.id}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
      }
    }
  });

  // ── QOTD CRUD ───────────────────────────────────────────────────
  test("creates a QOTD entry end-to-end", async ({ page }) => {
    await page.locator('button:has-text("QOTD")').first().click();
    await page.locator('button:has-text("Log Test")').first().click();
    await expect(page.locator('text=Full Mock').first()).toBeVisible({ timeout: 10_000 });
    await page.locator('button').filter({ hasText: /^QOTD$/ }).last().click();

    await expect(page.locator('button:has-text("QUANT")').first()).toBeVisible({ timeout: 8_000 });
    await page.locator('button:has-text("QUANT")').first().click();

    await page.locator('button:has-text("Save QOTD Entry")').click();

    await expect(page.locator('h2:has-text("Log a Test")')).not.toBeVisible({ timeout: 8_000 });
    await expect(page.locator("body")).not.toContainText("Something went wrong");
  });
});
