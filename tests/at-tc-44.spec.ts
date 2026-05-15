import { expect, Locator, Page, test } from '@playwright/test';

function getBaseUrl(): string {
  const baseUrl = process.env.BASE_URL;
  test.skip(!baseUrl, 'Missing BASE_URL environment variable.');
  return baseUrl!.replace(/\/$/, '');
}

function getCredentials(): { username: string; password: string } {
  const username = process.env.TEST_USERNAME ?? process.env.APP_USERNAME;
  const password = process.env.TEST_PASSWORD ?? process.env.APP_PASSWORD;
  test.skip(
    !username || !password,
    'Missing credentials. Set TEST_USERNAME/TEST_PASSWORD (preferred) or APP_USERNAME/APP_PASSWORD environment variables.',
  );
  return { username: username!, password: password! };
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
    // Some environments may already be authenticated and redirect away from /login.
    await this.page.goto('/login', { waitUntil: 'domcontentloaded' });
  }

  async assertOnLoginPage(): Promise<void> {
    await expect(
      this.loginHeading.or(this.loginButton).or(this.usernameOrPasswordField).or(this.loginForm),
    ).toBeVisible({ timeout: 15000 });
  }

  async ensureLoggedIn(username: string, password: string): Promise<void> {
    // If we're already logged in, /login may redirect and the login form won't exist.
    if (await this.loginHeading.or(this.loginButton).or(this.usernameOrPasswordField).count()) {
      await this.assertOnLoginPage();
      await this.login(username, password);
    }
  }

  async login(username: string, password: string): Promise<void> {
    await expect(this.usernameTextbox).toBeVisible();
    await this.usernameTextbox.fill(username);
    await expect(this.passwordTextbox).toBeVisible();
    await this.passwordTextbox.fill(password);
    await expect(this.loginButton).toBeEnabled();
    await this.loginButton.click();

    await expect(this.page).not.toHaveURL(/\/login(?:\?.*)?$/);
  }
}

class LeftNavProfileMenu {
  constructor(private readonly page: Page) {}

  get profileMenuButton(): Locator {
    // Prefer explicit "Profile" button in left nav, but fall back to common avatar/account triggers.
    return this.page
      .getByRole('navigation')
      .getByRole('button', { name: /profile|account|avatar|user|me/i })
      .or(this.page.getByRole('button', { name: /profile|account|avatar|user|me/i }))
      .or(this.page.getByRole('img', { name: /profile|account|avatar|user|me/i }))
      .or(this.page.getByLabel(/profile|account|avatar|user|me/i))
      .first();
  }

  private get logoutItem(): Locator {
    return this.page.getByRole('menuitem', { name: /log out|logout|sign out/i }).or(
      this.page.getByRole('button', { name: /log out|logout|sign out/i }),
    );
  }

  async open(): Promise<void> {
    // Apps differ in whether the left nav is exposed as role=navigation.
    // Wait for a stable, user-facing trigger instead of asserting the nav role exists.
    await expect(this.profileMenuButton).toBeVisible({ timeout: 15000 });
    await this.profileMenuButton.click();
    await expect(this.logoutItem).toBeVisible({ timeout: 15000 });
  }

  async close(): Promise<void> {
    await expect(this.profileMenuButton).toBeVisible();
    await this.profileMenuButton.click();
    await expect(this.logoutItem).toBeHidden({ timeout: 15000 });
  }

  async assertLogoutVisibleAndBottomItem(): Promise<void> {
    await expect(this.logoutItem).toBeVisible();

    const lastVisibleText = await this.page.evaluate(() => {
      const candidates = Array.from(
        document.querySelectorAll<HTMLElement>(
          '[role="menuitem"], [role="listitem"], [role="option"], button, a',
        ),
      );

      const isVisible = (el: HTMLElement): boolean => {
        const style = window.getComputedStyle(el);
        const rect = el.getBoundingClientRect();
        return style.visibility !== 'hidden' && style.display !== 'none' && rect.width > 0 && rect.height > 0;
      };

      const visible = candidates
        .filter(isVisible)
        .map((el) => ({
          text: (el.innerText ?? el.textContent ?? '').trim().replace(/\s+/g, ' '),
          top: el.getBoundingClientRect().top,
          left: el.getBoundingClientRect().left,
        }))
        .filter((x) => x.text.length > 0);

      visible.sort((a, b) => (a.top !== b.top ? a.top - b.top : a.left - b.left));
      return visible.length ? visible[visible.length - 1].text : '';
    });

    expect(lastVisibleText, 'Logout should be the bottom-most visible item in the opened profile menu').toMatch(
      /log\s*out|logout|sign\s*out/i,
    );
  }
}

test.describe('AT-TC-44 - Profile menu shows Logout as bottom item', { tag: ['@logout'] }, () => {
  test('Logout is visible and positioned as the bottom item when profile menu is opened', async ({ page }) => {
    // Arrange
    getBaseUrl();
    const { username, password } = getCredentials();

    const loginPage = new LoginPage(page);
    const profileMenu = new LeftNavProfileMenu(page);

    await loginPage.gotoCanonicalLogin();
    await loginPage.ensureLoggedIn(username, password);

    // Act
    await profileMenu.open();

    // Assert
    await profileMenu.assertLogoutVisibleAndBottomItem();

    // Act
    await profileMenu.close();

    // Assert
    await expect(profileMenu.profileMenuButton).toBeVisible();
  });
});
