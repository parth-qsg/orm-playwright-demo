import { Locator, Page, expect, test } from '@playwright/test';
import { OrangeHrmCredentials, OrangeHrmLoginPage } from './pages.orangehrm';

interface RetryExpectVisibleParams {
  locator: Locator;
  locatorName: string;
}

class OrangeHrmLoginPageWithInvalidCredentials extends OrangeHrmLoginPage {
  constructor(private readonly currentPage: Page) {
    super(currentPage);
  }

  private get usernameTextbox(): Locator {
    return this.currentPage.getByRole('textbox', { name: 'Username' });
  }

  private get passwordTextbox(): Locator {
    return this.currentPage.getByRole('textbox', { name: 'Password' });
  }

  private async retryExpectVisible({ locator, locatorName }: RetryExpectVisibleParams): Promise<void> {
    const maxAttempts = 3; // initial + 2 retries
    let lastError: unknown;

    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      try {
        await expect(locator).toBeVisible();
        return;
      } catch (error) {
        lastError = error;
        if (attempt < maxAttempts) {
          await this.currentPage.waitForLoadState('domcontentloaded');
        }
      }
    }

    await this.currentPage.pause();
    throw new Error(
      `Element not found after ${maxAttempts} attempts: ${locatorName}. ` +
        `Please confirm the correct accessible role/name for this element so the locator can be updated.\n` +
        `Last error: ${String(lastError)}`,
    );
  }

  async fillCredentials({ username, password }: OrangeHrmCredentials): Promise<void> {
    await this.retryExpectVisible({ locator: this.usernameTextbox, locatorName: 'Username textbox' });
    await expect(this.usernameTextbox).toBeEnabled();
    await this.usernameTextbox.fill(username);

    await this.retryExpectVisible({ locator: this.passwordTextbox, locatorName: 'Password textbox' });
    await expect(this.passwordTextbox).toBeEnabled();
    await this.passwordTextbox.fill(password);
  }

  async assertInvalidCredentialsErrorVisibleWithRecovery(): Promise<void> {
    try {
      await this.assertInvalidCredentialsErrorVisible();
    } catch {
      // Recovery: retry once by re-validating we are still on login page.
      await this.assertOnLoginPage();
      await this.assertInvalidCredentialsErrorVisible();
    }
  }
}

test.describe('TC-TC-16 - Login - Invalid credentials are blocked', () => {
  test('Using a valid username with an invalid password shows an error and stays on login page', async ({ page }) => {
    const loginPage = new OrangeHrmLoginPageWithInvalidCredentials(page);

    const usernameFromEnv: string = process.env.TEST_USERNAME ?? process.env.APP_USERNAME ?? '';
    const validPasswordFromEnv: string = process.env.TEST_PASSWORD ?? process.env.APP_PASSWORD ?? '';

    const credentials: OrangeHrmCredentials = {
      username: usernameFromEnv,
      password: validPasswordFromEnv ? `${validPasswordFromEnv}__invalid` : '__invalid',
    };

    // Arrange: Open the login page
    await loginPage.goto();
    await loginPage.assertOnLoginPage();

    // Act: Attempt login with invalid password
    await loginPage.fillCredentials(credentials);
    await loginPage.clickLogin();

    // Assert: Invalid credentials error is displayed and user remains on the login page
    await loginPage.assertOnLoginPage();
    await loginPage.assertInvalidCredentialsErrorVisibleWithRecovery();
  });
});
