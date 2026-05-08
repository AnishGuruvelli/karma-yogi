import type { Page } from "@playwright/test";

export const TEST_EMAIL = "e2e@test.karmayogi.local";
export const TEST_PASSWORD = "e2eTestPass123";
export const TEST_NAME = "E2E Tester";
export const TEST_SECRET_ANSWER = "TestCity";

export async function loginAs(page: Page, email = TEST_EMAIL, password = TEST_PASSWORD) {
  await page.goto("/");
  await page.waitForSelector('[id="auth-email"]', { timeout: 10_000 });
  await page.fill('[id="auth-email"]', email);
  await page.fill('[id="auth-password"]', password);
  await page.click('button[type="submit"]');

  // Wait for nav (login success + splash screen ~2.1s) with a generous timeout
  const navShown = await page.waitForSelector("nav", { timeout: 8_000 }).then(() => true).catch(() => false);

  if (!navShown) {
    // Login failed (account doesn't exist) — register it
    await page.locator('button[type="button"]:has-text("Create an account")').click();
    await page.waitForSelector('[id="auth-fullname"]', { timeout: 5_000 });
    await page.fill('[id="auth-fullname"]', TEST_NAME);
    await page.fill('[id="auth-email"]', email);
    await page.fill('[id="auth-password"]', password);
    await page.fill('[id="auth-confirm-password"]', password);
    await page.locator('input[placeholder="Your answer"]').fill(TEST_SECRET_ANSWER);
    await page.click('button[type="submit"]');
    await page.waitForSelector("nav", { timeout: 15_000 });
  }
}

export async function registerAndLogin(page: Page) {
  await page.goto("/");
  await page.waitForSelector('[id="auth-email"]', { timeout: 10_000 });
  await page.click('button[type="button"]:has-text("Create an account")');
  await page.fill('[id="auth-fullname"]', TEST_NAME);
  await page.fill('[id="auth-email"]', `e2e_${Date.now()}@test.local`);
  await page.fill('[id="auth-password"]', TEST_PASSWORD);
  await page.fill('[id="auth-confirm-password"]', TEST_PASSWORD);
  await page.locator('input[placeholder="Your answer"]').fill(TEST_SECRET_ANSWER);
  await page.click('button[type="submit"]');
  await page.waitForSelector("nav", { timeout: 15_000 });
}

export async function waitForNav(page: Page) {
  await page.waitForLoadState("networkidle");
}
