import { expect, Locator, Page, test } from '@playwright/test';

class AuthenticatedApp {
  constructor(private readonly page: Page) {}

  private get userMenuTrigger(): Locator {
    // Prefer explicit user-facing controls; fall back to common patterns.
    return this.page
      .getByRole('button', { name: /account|profile|user|menu/i })
      .or(this.page.getByRole('link', { name: /account|profile/i }))
      .or(this.page.getByLabel(/account|profile|user menu/i))
      .or(this.page.locator('[aria-label*="account" i], [aria-label*="profile" i], [data-testid*="avatar" i]'));
  }

  private get logoutControl(): Locator {
    return this.page
      .getByRole('button', { name: /log out|logout|sign out/i })
      .or(this.page.getByRole('link', { name: /log out|logout|sign out/i }))
      .or(this.page.getByText(/log out|logout|sign out/i));
  }

  private get loginCta(): Locator {
    return this.page.getByRole('link', { name: /log in|login|sign in/i });
  }

  async gotoHome(): Promise<void> {
    const baseUrl = process.env.BASE_URL;
    test.skip(!baseUrl, 'Missing BASE_URL environment variable for UI tests.');

    const root = baseUrl.replace(/\/$/, '');
    await this.page.goto(`${root}/`);
  }

  async loginWithEnvCredentials(): Promise<void> {
    const username = process.env.TEST_USERNAME ?? process.env.APP_USERNAME;
    const password = process.env.TEST_PASSWORD ?? process.env.APP_PASSWORD;
    test.skip(!username || !password, 'Missing TEST_USERNAME/TEST_PASSWORD (or APP_USERNAME/APP_PASSWORD).');

    const baseUrl = process.env.BASE_URL;
    test.skip(!baseUrl, 'Missing BASE_URL environment variable for UI tests.');

    const root = baseUrl.replace(/\/$/, '');

    // If already authenticated (common in CI with persisted storage), skip login.
    await this.page.goto(`${root}/`);
    if (await this.isAuthenticated().catch(() => false)) return;

    // Try common login routes.
    const loginPaths = ['/login', '/signin', '/sign-in', '/auth/login'];
    const usernameField = this.page
      .getByLabel(/email|e-mail|username|user name/i)
      .or(this.page.getByPlaceholder(/email|e-mail|username/i))
      .or(this.page.locator('input[type="email"], input[autocomplete="username"], input[name*="email" i], input[id*="email" i], input[name*="user" i], input[id*="user" i]'));

    const passwordField = this.page
      .getByLabel(/password/i)
      .or(this.page.getByPlaceholder(/password/i))
      .or(this.page.locator('input[type="password"], input[autocomplete="current-password"]'));

    for (const p of loginPaths) {
      await this.page.goto(`${root}${p}`);
      if ((await usernameField.count().catch(() => 0)) > 0) break;
    }

    await expect(usernameField).toBeVisible({ timeout: 15000 });
    await usernameField.fill(username);

    await expect(passwordField).toBeVisible({ timeout: 15000 });
    await passwordField.fill(password);

    const submit = this.page
      .getByRole('button', { name: /log in|login|sign in|continue/i })
      .or(this.page.getByRole('button', { name: /submit/i }));
    await expect(submit).toBeEnabled();
    await submit.click();

    await this.assertAuthenticated();
  }

  async isAuthenticated(): Promise<boolean> {
    if (await this.logoutControl.isVisible().catch(() => false)) return true;
    if (await this.userMenuTrigger.isVisible().catch(() => false)) return true;
    if ((await this.loginCta.count().catch(() => 0)) > 0) return false;
    return false;
  }

  async assertAuthenticated(): Promise<void> {
    // Primary: logout is visible (possibly after opening user menu).
    if (await this.logoutControl.isVisible().catch(() => false)) {
      await expect(this.logoutControl).toBeVisible();
      return;
    }

    // Secondary: open user menu and look for logout.
    if (await this.userMenuTrigger.isVisible().catch(() => false)) {
      await this.userMenuTrigger.click();
      await expect(this.logoutControl).toBeVisible();
      return;
    }

    // Tertiary: ensure we are not seeing login CTA.
    await expect(this.loginCta).toHaveCount(0);
  }

  async refreshAndWaitForReady(): Promise<void> {
    await this.page.reload();
    await this.page.waitForLoadState('domcontentloaded');
  }

  async navigateToAnotherPageAndAssertSessionPersists(): Promise<void> {
    // Prefer a deterministic navigation target if present.
    const candidates: Array<{ name: RegExp; path: string }> = [
      { name: /dashboard/i, path: '/dashboard' },
      { name: /profile|account/i, path: '/profile' },
      { name: /settings/i, path: '/settings' },
    ];

    for (const c of candidates) {
      const link = this.page.getByRole('link', { name: c.name });
      if (await link.isVisible().catch(() => false)) {
        await link.click();
        await this.page.waitForLoadState('domcontentloaded');
        await this.assertAuthenticated();
        return;
      }
    }

    // Fallback: direct navigation to a common authenticated page.
    const baseUrl = process.env.BASE_URL;
    test.skip(!baseUrl, 'Missing BASE_URL environment variable for UI tests.');
    const root = baseUrl.replace(/\/$/, '');

    await this.page.goto(`${root}/dashboard`);
    await this.page.waitForLoadState('domcontentloaded');
    await this.assertAuthenticated();
  }
}

test.describe('AT-TC-29 - Verify user remains logged in after refreshing the page post-signup', {
  tag: ['@functional', '@secure'],
}, () => {
  test('AT-TC-29 - Session persists after refresh and navigation', async ({ page }) => {
    const app = new AuthenticatedApp(page);

    // Arrange (precondition: user is authenticated). We satisfy it via env-based login.
    await app.loginWithEnvCredentials();
    await app.gotoHome();
    await app.assertAuthenticated();

    // Act: refresh the page
    await app.refreshAndWaitForReady();

    // Assert: user remains authenticated after refresh
    await app.assertAuthenticated();

    // Act + Assert: navigate elsewhere and confirm session persists
    await app.navigateToAnotherPageAndAssertSessionPersists();
  });
});
