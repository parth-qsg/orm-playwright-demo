import { expect, Locator, Page, test } from '@playwright/test';

interface RetryVisibleParams {
  locator: Locator;
  locatorName: string;
}

class MagicAiLoginPage {
  constructor(private readonly page: Page) {}

  private get usernameTextbox(): Locator {
    return this.page.getByRole('textbox', { name: /username|email/i });
  }

  private get passwordTextbox(): Locator {
    return this.page.getByRole('textbox', { name: /password/i });
  }

  private get loginButton(): Locator {
    return this.page.getByRole('button', { name: /^login$/i });
  }

  async goto(): Promise<void> {
    await this.page.goto('https://demo.magicai-app/login');
  }

  private async retryExpectVisible({ locator, locatorName }: RetryVisibleParams): Promise<void> {
    const attempts = 3; // initial + 2 retries (Element Recovery Rule)
    let lastError: unknown;

    for (let i = 0; i < attempts; i++) {
      try {
        await expect(locator).toBeVisible();
        return;
      } catch (err) {
        lastError = err;
        await this.page.waitForTimeout(250);
      }
    }

    await this.page.pause();
    throw new Error(
      `Element not found after ${attempts} attempts: ${locatorName}. ` +
        `Please confirm the correct role/name for this element so the locator can be updated.\n` +
        `Last error: ${String(lastError)}`,
    );
  }

  async assertLoginFormReady(): Promise<void> {
    await this.retryExpectVisible({ locator: this.usernameTextbox, locatorName: 'Username textbox' });
    await expect(this.usernameTextbox).toBeEnabled();

    await this.retryExpectVisible({ locator: this.passwordTextbox, locatorName: 'Password textbox' });
    await expect(this.passwordTextbox).toBeEnabled();

    await this.retryExpectVisible({ locator: this.loginButton, locatorName: 'Login button' });
    await expect(this.loginButton).toBeEnabled();
  }

  async login(): Promise<void> {
    const username = process.env.TEST_USERNAME ?? process.env.APP_USERNAME;
    const password = process.env.TEST_PASSWORD ?? process.env.APP_PASSWORD;

    if (!username || !password) {
      throw new Error(
        'Missing credentials. Set TEST_USERNAME/TEST_PASSWORD (preferred) or APP_USERNAME/APP_PASSWORD environment variables.',
      );
    }

    await this.retryExpectVisible({ locator: this.usernameTextbox, locatorName: 'Username textbox' });
    await this.usernameTextbox.fill(username);

    await this.retryExpectVisible({ locator: this.passwordTextbox, locatorName: 'Password textbox' });
    await this.passwordTextbox.fill(password);

    await this.retryExpectVisible({ locator: this.loginButton, locatorName: 'Login button' });
    await expect(this.loginButton).toBeEnabled();
    await this.loginButton.click();
  }
}

class MagicAiDashboardPage {
  constructor(private readonly page: Page) {}

  async assertUserRedirectedToDashboard(): Promise<void> {
    await expect(this.page).toHaveURL(/\/dashboard/i);
  }
}

test.describe('TC-TC-13 - Successful login redirects to dashboard', () => {
  test('TC-TC-13 - User logs in with valid credentials and lands on dashboard', async ({ page }) => {
    const loginPage = new MagicAiLoginPage(page);
    const dashboardPage = new MagicAiDashboardPage(page);

    // Arrange
    await loginPage.goto();
    await loginPage.assertLoginFormReady();

    // Act
    await loginPage.login();

    // Assert
    await dashboardPage.assertUserRedirectedToDashboard();
  });
});
