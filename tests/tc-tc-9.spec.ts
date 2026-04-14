import { expect, Locator, Page, test } from '@playwright/test';

interface RetryVisibleParams {
  locator: Locator;
  locatorName: string;
}

interface FillPasswordParams {
  password: string;
}

/**
 * MagicAI - Login Page (scoped to this testcase file due to repository access restrictions).
 */
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

  private get usernameRequiredError(): Locator {
    // Best-effort: common required-field validation text patterns.
    return this.page
      .getByText(/username is required|required/i)
      .or(this.page.getByRole('alert').getByText(/username is required|required/i));
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
        `Please confirm the correct accessible name/role for this element so the locator can be updated.\n` +
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

  async fillPassword({ password }: FillPasswordParams): Promise<void> {
    await this.retryExpectVisible({ locator: this.passwordTextbox, locatorName: 'Password textbox' });
    await this.passwordTextbox.fill(password);
  }

  async clickLogin(): Promise<void> {
    await this.retryExpectVisible({ locator: this.loginButton, locatorName: 'Login button' });
    await expect(this.loginButton).toBeEnabled();
    await this.loginButton.click();
  }

  async assertUsernameRequiredErrorVisible(): Promise<void> {
    await this.retryExpectVisible({ locator: this.usernameRequiredError, locatorName: 'Username required error message' });
    await expect(this.usernameRequiredError).toBeVisible();
    await expect(this.usernameRequiredError).toContainText(/username is required/i);
  }

  async assertStillOnLoginPage(): Promise<void> {
    await expect(this.page).toHaveURL(/\/login/i);
  }
}

test.describe('TC-TC-9 - Login validation for blank username', () => {
  test('TC-TC-9 - Leaving username blank blocks login and shows required validation', async ({ page }) => {
    const loginPage = new MagicAiLoginPage(page);

    const password = process.env.TEST_PASSWORD ?? process.env.APP_PASSWORD;

    test.skip(!password, 'Missing TEST_PASSWORD (preferred) or APP_PASSWORD environment variable.');

    // Arrange
    await loginPage.goto();
    await loginPage.assertLoginFormLoaded();

    // Act
    await loginPage.fillPassword({ password: password! });
    await loginPage.clickLogin();

    // Assert
    await loginPage.assertUsernameRequiredErrorVisible();
    await loginPage.assertStillOnLoginPage();
  });
});
