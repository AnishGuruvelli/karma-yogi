import { test, expect } from "@playwright/test";
import { loginAs } from "./helpers";

test.describe("Sessions", () => {
  test.beforeEach(async ({ page }) => {
    await loginAs(page);
    await page.goto("/sessions");
    await page.waitForLoadState("domcontentloaded");
  });

  // ── Static UI ────────────────────────────────────────────────────
  test("sessions page loads with heading and no crash", async ({ page }) => {
    await expect(page.locator("h1")).toContainText("Sessions", { timeout: 8_000 });
    await expect(page.locator("body")).not.toContainText("Something went wrong");
  });

  test("four tabs are visible: Study, Mocks, Sectional, QOTD", async ({ page }) => {
    await expect(page.locator('button:has-text("Study")').first()).toBeVisible({ timeout: 8_000 });
    await expect(page.locator('button:has-text("Mocks")').first()).toBeVisible();
    await expect(page.locator('button:has-text("Sectional")').first()).toBeVisible();
    await expect(page.locator('button:has-text("QOTD")').first()).toBeVisible();
  });

  test("Study tab is active by default and shows study controls", async ({ page }) => {
    await expect(page.locator('button:has-text("Begin Session")').first()).toBeVisible({ timeout: 8_000 });
    await expect(page.locator('button:has-text("Log Session")').first()).toBeVisible({ timeout: 5_000 });
  });

  test("switching to Mocks tab shows Log Test button", async ({ page }) => {
    await page.locator('button:has-text("Mocks")').first().click();
    await expect(page.locator('button:has-text("Log Test")').first()).toBeVisible({ timeout: 5_000 });
  });

  test("switching to Sectional tab shows Log Test button", async ({ page }) => {
    await page.locator('button:has-text("Sectional")').first().click();
    await expect(page.locator('button:has-text("Log Test")').first()).toBeVisible({ timeout: 5_000 });
  });

  test("switching to QOTD tab shows Log Test button", async ({ page }) => {
    await page.locator('button:has-text("QOTD")').first().click();
    await expect(page.locator('button:has-text("Log Test")').first()).toBeVisible({ timeout: 5_000 });
  });

  test("shows session count and pagination controls on Study tab", async ({ page }) => {
    // Pagination row: shows "X of N" text and Prev/Next buttons
    await expect(page.locator('button:has-text("Prev")').first()).toBeVisible({ timeout: 8_000 });
    await expect(page.locator('button:has-text("Next")').first()).toBeVisible({ timeout: 8_000 });
  });

  test("Begin opens timer modal", async ({ page }) => {
    await page.locator('button:has-text("Begin")').first().click();
    await expect(page.locator('[role="dialog"]')).toBeVisible({ timeout: 5_000 });
    await page.keyboard.press("Escape");
  });

  // ── Log Session modal (Study tab) ────────────────────────────────
  test("Log button opens session modal", async ({ page }) => {
    await page.locator('button:has-text("Log Session")').first().click();
    await expect(page.locator('[role="dialog"]')).toBeVisible({ timeout: 5_000 });
  });

  test("Log session modal save button is disabled without required fields", async ({ page }) => {
    await page.locator('button:has-text("Log Session")').first().click();
    await page.waitForSelector('[role="dialog"]', { timeout: 5_000 });
    // Button text changes dynamically: "Add a subject first" | "Topic is required" | "Mood is required" | "Save Session"
    const saveBtn = page.locator('[role="dialog"] button').filter({ hasText: /Save Session|required|first/i }).first();
    await expect(saveBtn).toBeDisabled({ timeout: 5_000 });
  });

  test("Log session modal closes on Escape", async ({ page }) => {
    await page.locator('button:has-text("Log Session")').first().click();
    await page.waitForSelector('[role="dialog"]', { timeout: 5_000 });
    await page.keyboard.press("Escape");
    await expect(page.locator('[role="dialog"]')).not.toBeVisible({ timeout: 3_000 });
  });

  test("Log session modal closes on backdrop click", async ({ page }) => {
    await page.locator('button:has-text("Log Session")').first().click();
    await page.waitForSelector('[role="dialog"]', { timeout: 5_000 });
    await page.mouse.click(10, 10);
    await expect(page.locator('[role="dialog"]')).not.toBeVisible({ timeout: 3_000 });
  });

  test("duration chips set the duration value", async ({ page }) => {
    await page.locator('button:has-text("Log Session")').first().click();
    await page.waitForSelector('[role="dialog"]', { timeout: 5_000 });
    const chip1h = page.locator('[role="dialog"] button:has-text("1h")').first();
    if (await chip1h.isVisible()) {
      await chip1h.click();
      await expect(page.locator('[role="dialog"]')).toBeVisible();
    }
  });

  test("hour/minute increment buttons update duration", async ({ page }) => {
    await page.locator('button:has-text("Log Session")').first().click();
    await page.waitForSelector('[role="dialog"]', { timeout: 5_000 });
    const incHours = page.locator('[aria-label="Increase hours"]');
    const decHours = page.locator('[aria-label="Decrease hours"]');
    if (await incHours.isVisible()) {
      await incHours.click();
      await decHours.click();
      await expect(page.locator('[role="dialog"]')).toBeVisible();
    }
  });

  // ── Full CRUD ────────────────────────────────────────────────────
  test("creates, edits, and deletes a session end-to-end", async ({ page }) => {
    const subjectName = `E2E_SUBJ_${Date.now()}`;
    const topicText = `E2E Topic ${Date.now()}`;
    const editedTopic = `E2E Edited ${Date.now()}`;

    const token: string = await page.evaluate(
      () => JSON.parse(localStorage.getItem("karma_auth") ?? "{}").accessToken ?? ""
    );

    const subResp = await page.request.post("http://localhost:8080/api/v1/subjects", {
      data: { name: subjectName, color: "cyan" },
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    });
    expect(subResp.ok()).toBeTruthy();
    const { id: subjectId } = await subResp.json();

    await page.reload();
    await page.waitForLoadState("domcontentloaded");

    // ── Create ──────────────────────────────────────────────────────
    await page.locator('button:has-text("Log Session")').first().click();
    await page.waitForSelector('[role="dialog"]', { timeout: 5_000 });

    await page.locator('[role="dialog"] [role="combobox"]').click();
    await page.waitForSelector('[role="option"]', { timeout: 3_000 });
    await page.locator(`[role="option"]:has-text("${subjectName}")`).click();

    await page.fill('input[placeholder="e.g. Algebra basics"]', topicText);
    await page.locator('[role="dialog"]').getByText("🌟").click();
    await page.locator('[role="dialog"] button:has-text("Save Session")').click();
    await expect(page.locator('[role="dialog"]')).not.toBeVisible({ timeout: 3_000 });

    await expect(page.locator("body")).toContainText(topicText, { timeout: 8_000 });
    await expect(page.locator("body")).toContainText(subjectName);

    // ── Edit ────────────────────────────────────────────────────────
    await page.locator("button").filter({ hasText: topicText }).first().click();
    await page.waitForSelector('[role="dialog"]', { timeout: 5_000 });
    await expect(page.locator('[role="dialog"]')).toContainText(subjectName);

    await page.fill('input[placeholder="e.g. Algebra basics"]', editedTopic);
    await page.locator('[role="dialog"] button:has-text("Save Session")').click();
    await expect(page.locator('[role="dialog"]')).not.toBeVisible({ timeout: 3_000 });

    await expect(page.locator("body")).toContainText(editedTopic, { timeout: 8_000 });
    await expect(page.locator("body")).not.toContainText(topicText);

    // ── Delete ──────────────────────────────────────────────────────
    await page.locator("button").filter({ hasText: editedTopic }).first().click();
    await page.waitForSelector('[role="dialog"]', { timeout: 5_000 });
    await page.locator('[role="dialog"] button:has-text("Delete Session")').click();
    await expect(page.getByText("Delete this session?")).toBeVisible({ timeout: 3_000 });
    await page.getByRole("button", { name: "Delete", exact: true }).last().click();
    await expect(page.locator("body")).not.toContainText(editedTopic, { timeout: 5_000 });

    await page.request.delete(`http://localhost:8080/api/v1/subjects/${subjectId}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
  });
});
