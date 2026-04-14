import { expect, Locator, Page, test } from '@playwright/test';

interface RetryVisibleParams {
  locator: Locator;
  locatorName: string;
}

interface LoginParams {
  username: string;
  password: string;
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

  private get invalidCredentialsAlert(): Locator {
    // Best-effort based on expected result text.
    return this.page.getByRole('alert').or(this.page.getByRole('status')).getByText(/invalid credentials/i);
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

  async fillUsername(username: string): Promise<void> {
    await this.retryExpectVisible({ locator: this.usernameTextbox, locatorName: 'Username textbox' });
    await this.usernameTextbox.fill(username);
  }

  async fillPassword(password: string): Promise<void> {
    await this.retryExpectVisible({ locator: this.passwordTextbox, locatorName: 'Password textbox' });
    await this.passwordTextbox.fill(password);
  }

  async clickLogin(): Promise<void> {
    await this.retryExpectVisible({ locator: this.loginButton, locatorName: 'Login button' });
    await expect(this.loginButton).toBeEnabled();
    await this.loginButton.click();
  }

  async loginWithCredentials({ username, password }: LoginParams): Promise<void> {
    await this.fillUsername(username);
    await this.fillPassword(password);
    await this.clickLogin();
  }

  async assertPasswordIsMasked(): Promise<void> {
    await this.retryExpectVisible({ locator: this.passwordTextbox, locatorName: 'Password textbox' });
    await expect(this.passwordTextbox).toHaveAttribute('type', 'password');
  }

  async assertInvalidCredentialsErrorVisible(): Promise<void> {
    await this.retryExpectVisible({ locator: this.invalidCredentialsAlert, locatorName: 'Invalid credentials error message' });
    await expect(this.invalidCredentialsAlert).toBeVisible();
  }

  async assertStillOnLoginPage(): Promise<void> {
    await expect(this.page).toHaveURL(/\/login/i);
  }
}

test.describe('TC-TC-12 - Login fails with invalid credentials', () => {
  test('TC-TC-12 - Reject invalid credentials with error and remain on login page', async ({ page }) => {
    const loginPage = new MagicAiLoginPage(page);

    const baseUsername = process.env.TEST_USERNAME ?? process.env.APP_USERNAME;
    const basePassword = process.env.TEST_PASSWORD ?? process.env.APP_PASSWORD;

    if (!baseUsername || !basePassword) {
      throw new Error(
        'Missing credentials to derive invalid values. Set TEST_USERNAME/TEST_PASSWORD (preferred) or APP_USERNAME/APP_PASSWORD environment variables.',
      );
    }

    const invalidUsername = `${baseUsername}__invalid`;
    const invalidPassword = `${basePassword}__invalid`;

    // Arrange
    await loginPage.goto();
    await loginPage.assertLoginFormReady();

    // Act
    await loginPage.loginWithCredentials({ username: invalidUsername, password: invalidPassword });

    // Assert
    await loginPage.assertPasswordIsMasked();
    await loginPage.assertInvalidCredentialsErrorVisible();
    await loginPage.assertStillOnLoginPage();
  });
});
