import { expect, Locator, Page, test } from '@playwright/test';

interface RetryVisibleParams {
  locator: Locator;
  locatorName: string;
}

interface FillUsernameParams {
  username: string;
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

  private get passwordRequiredError(): Locator {
    // Best-effort: common patterns for required field validation near the password field.
    return this.page
      .getByText(/password is required|required/i)
      .or(this.page.getByRole('alert').getByText(/password is required|required/i));
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

  async assertLoginFormLoaded(): Promise<void> {
    await this.retryExpectVisible({ locator: this.usernameTextbox, locatorName: 'Username textbox' });
    await expect(this.usernameTextbox).toBeEnabled();

    await this.retryExpectVisible({ locator: this.passwordTextbox, locatorName: 'Password textbox' });
    await expect(this.passwordTextbox).toBeEnabled();

    await this.retryExpectVisible({ locator: this.loginButton, locatorName: 'Login button' });
    await expect(this.loginButton).toBeEnabled();
  }

  async fillUsername({ username }: FillUsernameParams): Promise<void> {
    await this.retryExpectVisible({ locator: this.usernameTextbox, locatorName: 'Username textbox' });
    await this.usernameTextbox.fill(username);
  }

  async clickLogin(): Promise<void> {
    await this.retryExpectVisible({ locator: this.loginButton, locatorName: 'Login button' });
    await expect(this.loginButton).toBeEnabled();
    await this.loginButton.click();
  }

  async assertPasswordRequiredErrorVisible(): Promise<void> {
    await this.retryExpectVisible({ locator: this.passwordRequiredError, locatorName: 'Password required error message' });
    await expect(this.passwordRequiredError).toBeVisible();
    await expect(this.passwordRequiredError).toContainText(/password is required/i);
  }

  async assertStillOnLoginPage(): Promise<void> {
    await expect(this.page).toHaveURL(/\/login/i);
  }
}

test.describe('TC-TC-10 - Prevent submission when password is blank', () => {
  test('TC-TC-10 - Leaving password empty blocks login and shows a required field error', async ({ page }) => {
    const loginPage = new MagicAiLoginPage(page);

    const username = process.env.TEST_USERNAME ?? process.env.APP_USERNAME;

    if (!username) {
      throw new Error('Missing username env var. Set TEST_USERNAME (preferred) or APP_USERNAME.');
    }

    // Arrange
    await loginPage.goto();
    await loginPage.assertLoginFormLoaded();

    // Act
    await loginPage.fillUsername({ username });
    await loginPage.clickLogin();

    // Assert
    await loginPage.assertPasswordRequiredErrorVisible();
    await loginPage.assertStillOnLoginPage();
  });
});
