import { expect, Locator, Page, test } from '@playwright/test';

function getBaseUrl(): string {
  const baseUrl = process.env.BASE_URL;
  test.skip(!baseUrl, 'Missing BASE_URL environment variable.');
  return baseUrl!.replace(/\/$/, '');
}

function getCredentials(): { username: string; password: string } {
  const username = process.env.TEST_USERNAME ?? process.env.APP_USERNAME;
  const password = process.env.TEST_PASSWORD ?? process.env.APP_PASSWORD;
  if (!username || !password) {
    throw new Error(
      'Missing credentials. Set TEST_USERNAME/TEST_PASSWORD (preferred) or APP_USERNAME/APP_PASSWORD environment variables.',
    );
  }
  return { username, password };
}

class LoginPage {
  constructor(private readonly page: Page) {}

  private get usernameTextbox(): Locator {
    return this.page.getByRole('textbox', { name: /email|username/i });
  }

  private get passwordTextbox(): Locator {
    return this.page.getByRole('textbox', { name: /^password$/i });
  }

  private get loginButton(): Locator {
    return this.page.getByRole('button', { name: /log in|login|sign in/i });
  }

  private get usernameOrPasswordField(): Locator {
    return this.page
      .getByRole('textbox', { name: /email|username/i })
      .or(this.page.getByRole('textbox', { name: /^password$/i }));
  }

  private get loginHeading(): Locator {
    return this.page.getByRole('heading', { name: /log in|login|sign in/i });
  }

  private get loginForm(): Locator {
    return this.page.getByRole('form').filter({ has: this.loginButton });
  }

  async gotoCanonicalLogin(): Promise<void> {
    await this.page.goto('/login', { waitUntil: 'domcontentloaded' });
    await this.assertOnLoginPage();
  }

  async assertOnLoginPage(): Promise<void> {
    await expect(this.page).toHaveURL(/\/login(?:\?.*)?$/);

    // Some apps render login without a heading/button name; rely on presence of form fields as well.
    await expect(
      this.loginHeading.or(this.loginButton).or(this.usernameOrPasswordField).or(this.loginForm),
    ).toBeVisible({ timeout: 15000 });
  }

  async login(username: string, password: string): Promise<void> {
    await expect(this.usernameTextbox).toBeVisible();
    await this.usernameTextbox.fill(username);
    await expect(this.passwordTextbox).toBeVisible();
    await this.passwordTextbox.fill(password);
    await expect(this.loginButton).toBeEnabled();
    await this.loginButton.click();

    // Post-login: wait until we are no longer on /login.
    await expect(this.page).not.toHaveURL(/\/login(?:\?.*)?$/);
  }
}

class LeftNavProfileMenu {
  constructor(private readonly page: Page) {}

  private get profileMenuButton(): Locator {
    // Best-effort: profile/account button in left navigation.
    return this.page
      .getByRole('navigation')
      .getByRole('button', { name: /profile|account|user|me|settings|menu/i })
      .first();
  }

  private get logoutMenuItem(): Locator {
    return this.page.getByRole('menuitem', { name: /log out|logout|sign out/i }).or(
      this.page.getByRole('button', { name: /log out|logout|sign out/i }),
    );
  }

  async open(): Promise<void> {
    await expect(this.profileMenuButton).toBeVisible({ timeout: 15000 });
    await this.profileMenuButton.click();

    // Menu may render as a menu, list, or dialog; just ensure logout is now visible.
    await expect(this.logoutMenuItem).toBeVisible({ timeout: 15000 });
  }

  async logout(): Promise<void> {
    await expect(this.logoutMenuItem).toBeVisible();
    await this.logoutMenuItem.click();
  }
}

class SessionAssertions {
  constructor(private readonly page: Page) {}

  async assertNoAuthTokensInStorage(): Promise<void> {
    const snapshot = await this.page.evaluate(() => {
      const safeEntries = (s: Storage): Array<[string, string]> => {
        const out: Array<[string, string]> = [];
        for (let i = 0; i < s.length; i++) {
          const k = s.key(i);
          if (!k) continue;
          out.push([k, s.getItem(k) ?? '']);
        }
        return out;
      };

      return {
        localStorage: safeEntries(window.localStorage),
        sessionStorage: safeEntries(window.sessionStorage),
        cookies: document.cookie,
      };
    });

    const combined = [...snapshot.localStorage, ...snapshot.sessionStorage]
      .map(([k, v]) => `${k}=${v}`)
      .join('\n');

    // Heuristic: ensure no obvious auth artifacts remain.
    const forbidden = /(access[_-]?token|refresh[_-]?token|id[_-]?token|auth|authorization|bearer|jwt|session)/i;
    expect(combined, 'No auth-like keys/values should remain in local/session storage').not.toMatch(forbidden);
    expect(snapshot.cookies, 'No auth-like cookies should remain').not.toMatch(forbidden);
  }

  async assertCanonicalLoginUrlNoParams(): Promise<void> {
    await expect(this.page).toHaveURL(/\/login$/);

    const url = new URL(this.page.url());
    expect(url.pathname, 'Pathname is exactly /login').toBe('/login');
    expect(url.search, 'No locale/intent parameters should be preserved').toBe('');
    expect(url.hash, 'No hash fragment should be preserved').toBe('');
  }
}

class ProtectedPage {
  constructor(private readonly page: Page) {}

  async gotoLikelyProtected(): Promise<void> {
    // Best-effort: common protected routes.
    const candidates = ['/dashboard', '/app', '/home', '/settings', '/profile'];
    for (const path of candidates) {
      const response = await this.page.goto(path, { waitUntil: 'domcontentloaded' });
      if (response && response.status() !== 404) return;
    }

    // Fallback: root (often protected in SPAs).
    await this.page.goto('/', { waitUntil: 'domcontentloaded' });
  }

  async assertRedirectedToLogin(): Promise<void> {
    await expect(this.page).toHaveURL(/\/login(?:\?.*)?$/);
  }
}

test.describe('AT-TC-43 - Logout redirects to canonical /login and clears session', {
  tag: ['@functional', '@secure'],
}, () => {
  test('Successful logout via profile menu redirects to canonical /login with session cleared', async ({ page }) => {
    // Arrange
    getBaseUrl(); // ensures BASE_URL is set (skip otherwise)
    const { username, password } = getCredentials();

    const loginPage = new LoginPage(page);
    const profileMenu = new LeftNavProfileMenu(page);
    const session = new SessionAssertions(page);
    const protectedPage = new ProtectedPage(page);

    // Act: login
    await loginPage.gotoCanonicalLogin();
    await loginPage.login(username, password);

    // Create in-progress/unsaved work marker (best-effort) to ensure it doesn't persist after logout.
    const unsavedMarkerKey = `pw-unsaved-${Date.now()}`;
    await page.evaluate((k) => window.sessionStorage.setItem(k, 'dirty'), unsavedMarkerKey);

    // Act: logout via profile menu in left navigation
    await profileMenu.open();
    await profileMenu.logout();

    // Assert: login page loads and URL is canonical /login with no params
    await loginPage.assertOnLoginPage();
    await session.assertCanonicalLoginUrlNoParams();

    // Assert: session cleared (no auth tokens remain)
    await session.assertNoAuthTokensInStorage();

    // Assert: unsaved work discarded (marker removed)
    await expect
      .poll(async () =>
        page.evaluate((k) => window.sessionStorage.getItem(k), unsavedMarkerKey),
      )
      .toBeNull();

    // Assert: protected page access redirects to /login
    await protectedPage.gotoLikelyProtected();
    await protectedPage.assertRedirectedToLogin();
    await session.assertCanonicalLoginUrlNoParams();
  });
});
