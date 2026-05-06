import type { Page } from "@playwright/test";

export const TEST_EMAIL = "e2e@test.karmayogi.local";
export const TEST_PASSWORD = "e2eTestPass123";
export const TEST_NAME = "E2E Tester";

export async function loginAs(page: Page, email = TEST_EMAIL, password = TEST_PASSWORD) {
  await page.goto("/");
  await page.waitForSelector('[id="auth-email"]', { timeout: 10_000 });
  await page.fill('[id="auth-email"]', email);
  await page.fill('[id="auth-password"]', password);
  await page.click('button[type="submit"]');
  await page.waitForURL("/", { timeout: 15_000 });
}

export async function registerAndLogin(page: Page) {
  await page.goto("/");
  await page.waitForSelector('[id="auth-email"]', { timeout: 10_000 });
  // Switch to register
  await page.click('text=Sign up');
  await page.fill('[id="auth-fullname"]', TEST_NAME);
  await page.fill('[id="auth-email"]', `e2e_${Date.now()}@test.local`);
  await page.fill('[id="auth-password"]', TEST_PASSWORD);
  await page.fill('[id="auth-confirm-password"]', TEST_PASSWORD);
  await page.click('button[type="submit"]');
  await page.waitForURL("/", { timeout: 15_000 });
}

export async function waitForNav(page: Page) {
  await page.waitForLoadState("networkidle");
}
