import { test, expect, Locator, Page, BrowserContext } from '@playwright/test';
import {
  OrangeHrmDashboardPage,
  OrangeHrmAdminSystemUsersPage,
  OrangeHrmLoginPage as BaseOrangeHrmLoginPage,
} from './pages.orangehrm';

interface OrangeHrmAuthEnv {
  username: string;
  password: string;
}

class OrangeHrmLoginPage extends BaseOrangeHrmLoginPage {
  constructor(page: Page) {
    super(page);
    this.page = page;
  }

  private readonly page: Page;

  private get usernameTextbox(): Locator {
    return this.page.getByRole('textbox', { name: 'Username' });
  }

  private get passwordTextbox(): Locator {
    return this.page.getByRole('textbox', { name: 'Password' });
  }

  async assertUsernameFieldAcceptsInput(expected: string): Promise<void> {
    await expect(this.usernameTextbox).toBeVisible();
    await expect(this.usernameTextbox).toBeEnabled();
    await expect(this.usernameTextbox).toHaveValue(expected);
  }

  async assertPasswordFieldAcceptsInput(expected: string): Promise<void> {
    await expect(this.passwordTextbox).toBeVisible();
    await expect(this.passwordTextbox).toBeEnabled();
    await expect(this.passwordTextbox).toHaveValue(expected);
  }
}

class OrangeHrmAuthSession {
  constructor(private readonly context: BrowserContext) {}

  private get expectedAuthCookieName(): string {
    return 'orangehrm';
  }

  async assertAuthSessionCreated(): Promise<void> {
    const cookies = await this.context.cookies();
    const hasAuthCookie = cookies.some((c) => c.name === this.expectedAuthCookieName);
    expect(hasAuthCookie).toBeTruthy();
  }

  async assertAuthTokenStoredInWebStorage(page: Page): Promise<void> {
    const storageHasNonI18nKey = await page.evaluate(() => {
      const i18nKey = '/core/i18n/messages';

      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && key !== i18nKey) return true;
      }

      for (let i = 0; i < sessionStorage.length; i++) {
        const key = sessionStorage.key(i);
        if (key) return true;
      }

      return false;
    });

    expect(storageHasNonI18nKey).toBeTruthy();
  }
}

function getAuthEnv(): OrangeHrmAuthEnv {
  const username = process.env.TEST_USERNAME ?? process.env.APP_USERNAME;
  const password = process.env.TEST_PASSWORD ?? process.env.APP_PASSWORD;

  if (!username || !password) {
    throw new Error(
      'Missing credentials. Set TEST_USERNAME/TEST_PASSWORD (preferred) or APP_USERNAME/APP_PASSWORD environment variables.',
    );
  }

  return { username, password };
}

test.describe('AT-TC-11 - Successful login redirects to dashboard and creates session', () => {
  test(
    'AT-TC-11 - Login with valid credentials creates session and allows protected page access',
    { tag: ['@functional', '@regression'] },
    async ({ page, context }) => {
      const loginPage = new OrangeHrmLoginPage(page);
      const dashboardPage = new OrangeHrmDashboardPage(page);
      const systemUsersPage = new OrangeHrmAdminSystemUsersPage(page);
      const authSession = new OrangeHrmAuthSession(context);

      const { username, password } = getAuthEnv();

      // Arrange
      await loginPage.goto();
      await loginPage.assertOnLoginPage();

      // Act
      await loginPage.fillUsername(username);
      await loginPage.fillPassword(password);

      // Assert (fields accept input)
      await loginPage.assertUsernameFieldAcceptsInput(username);
      await loginPage.assertPasswordFieldAcceptsInput(password);

      // Act
      await loginPage.clickLogin();

      // Assert (dashboard loaded)
      await dashboardPage.assertOnDashboardPage();

      // Assert (session created/persisted)
      await authSession.assertAuthSessionCreated();
      await authSession.assertAuthTokenStoredInWebStorage(page);

      // Act: attempt to access a protected page directly
      await systemUsersPage.goto();

      // Assert: access granted (no redirect to login)
      await systemUsersPage.assertOnSystemUsersPage();
      await dashboardPage.assertAdminMenuVisible();
    },
  );
});
