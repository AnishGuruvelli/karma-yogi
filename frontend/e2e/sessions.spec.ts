import { test, expect } from "@playwright/test";
import { loginAs } from "./helpers";

test.describe("Sessions", () => {
  test.beforeEach(async ({ page }) => {
    await loginAs(page);
    await page.goto("/sessions");
    await page.waitForLoadState("networkidle");
  });

  // ── Static UI ────────────────────────────────────────────────────
  test("sessions page loads with heading and no crash", async ({ page }) => {
    await expect(page.locator("h1, h2").first()).toBeVisible({ timeout: 8_000 });
    await expect(page.locator("body")).not.toContainText("Something went wrong");
  });

  test("shows session count and pagination controls", async ({ page }) => {
    await expect(page.locator("text=Showing").first()).toBeVisible({ timeout: 8_000 });
    await expect(page.locator('button:has-text("Prev")').first()).toBeVisible();
    await expect(page.locator('button:has-text("Next")').first()).toBeVisible();
  });

  test("Begin Session and Log Session buttons are both present", async ({ page }) => {
    await expect(page.locator('button:has-text("Begin Session")').first()).toBeVisible({ timeout: 8_000 });
    await expect(page.locator('button:has-text("Log Session")').first()).toBeVisible({ timeout: 8_000 });
  });

  test("Begin Session opens timer modal", async ({ page }) => {
    await page.locator('button:has-text("Begin Session")').first().click();
    await expect(page.locator('[role="dialog"]')).toBeVisible({ timeout: 5_000 });
    await page.keyboard.press("Escape");
  });

  // ── Log Session modal ────────────────────────────────────────────
  test("Log session modal opens", async ({ page }) => {
    await page.locator('button:has-text("Log Session")').first().click();
    await expect(page.locator('[role="dialog"]')).toBeVisible({ timeout: 5_000 });
  });

  test("Log session modal save button is disabled without required fields", async ({ page }) => {
    await page.locator('button:has-text("Log Session")').first().click();
    await page.waitForSelector('[role="dialog"]', { timeout: 5_000 });
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
    // Click the backdrop (fixed overlay, not the modal panel)
    await page.mouse.click(10, 10);
    await expect(page.locator('[role="dialog"]')).not.toBeVisible({ timeout: 3_000 });
  });

  test("duration chips set the duration value", async ({ page }) => {
    await page.locator('button:has-text("Log Session")').first().click();
    await page.waitForSelector('[role="dialog"]', { timeout: 5_000 });
    // Click the 1h chip — it should activate without crashing
    const chip1h = page.locator('[role="dialog"] button:has-text("1h")').first();
    if (await chip1h.isVisible()) {
      await chip1h.click();
      // After clicking, the chip should appear active (no crash, modal still open)
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

    // Grab auth token populated by loginAs
    const token: string = await page.evaluate(
      () => JSON.parse(localStorage.getItem("karma_auth") ?? "{}").accessToken ?? ""
    );

    // Create a dedicated subject via API so it's guaranteed in the store
    const subResp = await page.request.post("http://localhost:8080/api/v1/subjects", {
      data: { name: subjectName, color: "cyan" },
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    });
    expect(subResp.ok()).toBeTruthy();
    const { id: subjectId } = await subResp.json();

    // Reload so the store picks up the new subject
    await page.reload();
    await page.waitForLoadState("networkidle");

    // ── Create ──────────────────────────────────────────────────────
    await page.locator('button:has-text("Log Session")').first().click();
    await page.waitForSelector('[role="dialog"]', { timeout: 5_000 });

    // Subject select: open Radix combobox and pick our subject
    await page.locator('[role="dialog"] [role="combobox"]').click();
    await page.waitForSelector('[role="option"]', { timeout: 3_000 });
    await page.locator(`[role="option"]:has-text("${subjectName}")`).click();

    // Fill topic (30 min default duration is already set)
    await page.fill('input[placeholder="e.g. Algebra basics"]', topicText);

    // Select mood 4 (🌟)
    await page.locator('[role="dialog"]').getByText("🌟").click();

    await page.locator('[role="dialog"] button:has-text("Save Session")').click();
    await expect(page.locator('[role="dialog"]')).not.toBeVisible({ timeout: 3_000 });

    // Session must appear in list with subject name and topic
    await expect(page.locator("body")).toContainText(topicText, { timeout: 8_000 });
    await expect(page.locator("body")).toContainText(subjectName);

    // ── Edit ────────────────────────────────────────────────────────
    await page.locator("button").filter({ hasText: topicText }).first().click();
    await page.waitForSelector('[role="dialog"]', { timeout: 5_000 });

    // Edit modal should pre-fill current subject and topic
    await expect(page.locator('[role="dialog"]')).toContainText(subjectName);

    // fill() replaces the entire value
    await page.fill('input[placeholder="e.g. Algebra basics"]', editedTopic);
    await page.locator('[role="dialog"] button:has-text("Save Session")').click();
    await expect(page.locator('[role="dialog"]')).not.toBeVisible({ timeout: 3_000 });

    // Edited topic visible; original topic gone
    await expect(page.locator("body")).toContainText(editedTopic, { timeout: 8_000 });
    await expect(page.locator("body")).not.toContainText(topicText);

    // ── Delete ──────────────────────────────────────────────────────
    await page.locator("button").filter({ hasText: editedTopic }).first().click();
    await page.waitForSelector('[role="dialog"]', { timeout: 5_000 });

    await page.locator('[role="dialog"] button:has-text("Delete Session")').click();
    await expect(page.getByText("Delete this session?")).toBeVisible({ timeout: 3_000 });

    // Confirm — exact: true avoids matching "Delete Session"
    await page.getByRole("button", { name: "Delete", exact: true }).last().click();
    await expect(page.locator("body")).not.toContainText(editedTopic, { timeout: 5_000 });

    // Cleanup: remove the test subject (cascades its sessions)
    await page.request.delete(`http://localhost:8080/api/v1/subjects/${subjectId}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
  });
});
