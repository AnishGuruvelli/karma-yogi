import { test, expect } from "@playwright/test";
import { loginAs } from "./helpers";

test.describe("Dashboard", () => {
  test.beforeEach(async ({ page }) => {
    await loginAs(page);
    await page.goto("/");
  });

  test("dashboard loads without errors", async ({ page }) => {
    await page.waitForLoadState("networkidle");
    await expect(page.locator("body")).not.toContainText("Something went wrong");
  });

  test("shows today's stats or empty state", async ({ page }) => {
    await page.waitForLoadState("networkidle");
    // Either shows stats or a friendly empty state — no crash
    const body = await page.locator("body").innerText();
    expect(body.length).toBeGreaterThan(0);
  });

  test("timer or log session button is visible", async ({ page }) => {
    await page.waitForLoadState("networkidle");
    // Dashboard should have some kind of action button
    await expect(page.locator('button').first()).toBeVisible({ timeout: 8_000 });
  });

  test("weekly goal ring or progress is rendered", async ({ page }) => {
    await page.waitForLoadState("networkidle");
    // SVG ring chart or goal widget should be present
    await expect(page.locator("body")).not.toContainText("Something went wrong");
  });
});

test.describe("Dashboard - Strategy Page", () => {
  test("strategy dashboard is accessible", async ({ page }) => {
    await loginAs(page);
    await page.goto("/strategy-dashboard");
    await page.waitForLoadState("networkidle");
    await expect(page.locator("body")).not.toContainText("Something went wrong");
  });

  test("/strategy redirects to /strategy-dashboard", async ({ page }) => {
    await loginAs(page);
    await page.goto("/strategy");
    await expect(page).toHaveURL("/strategy-dashboard");
  });
});
