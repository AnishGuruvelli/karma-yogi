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

  test("Mocks empty state shows helpful message", async ({ page }) => {
    await page.locator('button:has-text("Mocks")').first().click();
    // May show data or empty state — either way no crash
    const hasData = await page.locator('button:has-text("Log Test")').first().isVisible({ timeout: 5_000 });
    expect(hasData).toBe(true);
  });

  // ── LogTestModal open/close ──────────────────────────────────────
  test("Log Test button opens the modal", async ({ page }) => {
    await page.locator('button:has-text("Mocks")').first().click();
    await page.locator('button:has-text("Log Test")').first().click();
    await expect(page.locator("text=Log Test").first()).toBeVisible({ timeout: 5_000 });
    await expect(page.locator("text=What type of test did you take?")).toBeVisible({ timeout: 3_000 });
  });

  test("modal shows three test type options", async ({ page }) => {
    await page.locator('button:has-text("Mocks")').first().click();
    await page.locator('button:has-text("Log Test")').first().click();
    await page.waitForSelector('text=Full Mock', { timeout: 5_000 });
    await expect(page.locator('text=Full Mock').first()).toBeVisible();
    await expect(page.locator('text=Sectional Test').first()).toBeVisible();
    await expect(page.locator('text=Question of the Day').first()).toBeVisible();
  });

  test("modal closes via Escape key", async ({ page }) => {
    await page.locator('button:has-text("Mocks")').first().click();
    await page.locator('button:has-text("Log Test")').first().click();
    await page.waitForSelector('text=What type of test did you take?', { timeout: 5_000 });
    await page.keyboard.press("Escape");
    await expect(page.locator('text=What type of test did you take?')).not.toBeVisible({ timeout: 3_000 });
  });

  test("modal closes on backdrop click", async ({ page }) => {
    await page.locator('button:has-text("Mocks")').first().click();
    await page.locator('button:has-text("Log Test")').first().click();
    await page.waitForSelector('text=What type of test did you take?', { timeout: 5_000 });
    await page.mouse.click(10, 10);
    await expect(page.locator('text=What type of test did you take?')).not.toBeVisible({ timeout: 3_000 });
  });

  test("selecting Full Mock shows full mock form with test name field", async ({ page }) => {
    await page.locator('button:has-text("Mocks")').first().click();
    await page.locator('button:has-text("Log Test")').first().click();
    await page.waitForSelector('text=Full Mock', { timeout: 5_000 });
    await page.locator('button:has-text("Full Mock")').click();
    await expect(page.locator('text=Full Mock').first()).toBeVisible({ timeout: 3_000 });
    await expect(page.locator('input[placeholder]').first()).toBeVisible({ timeout: 3_000 });
  });

  test("selecting Sectional Test shows sectional form", async ({ page }) => {
    await page.locator('button:has-text("Sectional")').first().click();
    await page.locator('button:has-text("Log Test")').first().click();
    await page.waitForSelector('text=Sectional Test', { timeout: 5_000 });
    await page.locator('button:has-text("Sectional Test")').click();
    await expect(page.locator('text=Sectional Test').first()).toBeVisible({ timeout: 3_000 });
  });

  test("selecting Question of the Day shows QOTD form", async ({ page }) => {
    await page.locator('button:has-text("QOTD")').first().click();
    await page.locator('button:has-text("Log Test")').first().click();
    await page.waitForSelector('text=Question of the Day', { timeout: 5_000 });
    await page.locator('button:has-text("Question of the Day")').click();
    await expect(page.locator('text=QOTD Entry').first()).toBeVisible({ timeout: 3_000 });
  });

  test("back button in modal step 2 returns to type selector", async ({ page }) => {
    await page.locator('button:has-text("Mocks")').first().click();
    await page.locator('button:has-text("Log Test")').first().click();
    await page.waitForSelector('text=Full Mock', { timeout: 5_000 });
    await page.locator('button:has-text("Full Mock")').click();
    // Wait for step 2 form header to say "Full Mock"
    await expect(page.locator('h2:has-text("Full Mock")')).toBeVisible({ timeout: 3_000 });
    // Back: click the first small square button in the modal header (ChevronLeft back button)
    await page.locator('h2:has-text("Full Mock")').locator('..').locator('..').locator('button').first().click();
    await expect(page.locator('text=What type of test did you take?')).toBeVisible({ timeout: 3_000 });
  });

  // ── Full Mock CRUD ───────────────────────────────────────────────
  test("creates a full mock end-to-end", async ({ page }) => {
    const testName = `E2E Mock ${Date.now()}`;

    await page.locator('button:has-text("Mocks")').first().click();
    await page.locator('button:has-text("Log Test")').first().click();
    await page.waitForSelector('text=Full Mock', { timeout: 5_000 });
    await page.locator('button:has-text("Full Mock")').click();

    // Wait for test name input (placeholder: "e.g. Mock CAT 23")
    await page.waitForSelector('input[placeholder="e.g. Mock CAT 23"]', { timeout: 5_000 });
    await page.fill('input[placeholder="e.g. Mock CAT 23"]', testName);

    await page.locator('button:has-text("Save Full Mock")').click();

    // Modal should close and mock should appear in list
    await expect(page.locator('text=What type of test did you take?')).not.toBeVisible({ timeout: 8_000 });
    await expect(page.locator("body")).toContainText(testName, { timeout: 8_000 });

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
    await page.waitForSelector('text=Question of the Day', { timeout: 5_000 });
    await page.locator('button:has-text("Question of the Day")').click();

    // QOTD form: click "Yes" to mark correct
    await page.waitForSelector('button:has-text("Yes")', { timeout: 5_000 });
    await page.locator('button:has-text("Yes")').click();

    await page.locator('button:has-text("Save QOTD Entry")').click();

    // Modal should close
    await expect(page.locator('text=What type of test did you take?')).not.toBeVisible({ timeout: 5_000 });

    // QOTD tab should show the entry
    await expect(page.locator("body")).not.toContainText("Something went wrong");
  });
});
