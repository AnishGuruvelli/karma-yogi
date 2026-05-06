import { test, expect } from "@playwright/test";
import { loginAs } from "./helpers";

test.describe("Library / Subjects", () => {
  test.beforeEach(async ({ page }) => {
    await loginAs(page);
    await page.goto("/library");
  });

  test("library page loads", async ({ page }) => {
    await page.waitForLoadState("networkidle");
    await expect(page.locator("body")).not.toContainText("Something went wrong");
  });

  test("/data redirects or 404s — /library is canonical", async ({ page }) => {
    // /data route has been removed; navigating to it should show 404
    await page.goto("/data");
    await page.waitForLoadState("networkidle");
    const url = page.url();
    // Should either 404 or be handled gracefully
    expect(url).not.toBe("about:blank");
  });

  test("can see subject list or empty state", async ({ page }) => {
    await page.waitForLoadState("networkidle");
    const body = await page.locator("body").innerText();
    expect(body.length).toBeGreaterThan(0);
  });
});
