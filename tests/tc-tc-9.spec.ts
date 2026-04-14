import { expect, Locator, Page, test } from '@playwright/test';

interface RetryExpectVisibleParams {
  locator: Locator;
  locatorName: string;
}

interface FillPasswordParams {
  password: string;
}

/**
 * MagicAI - Login Page
 * Note: kept local to this test file because repository access is restricted to /tests.
 */
class MagicAiLoginPage {
  constructor(private readonly page: Page) {}

  // --- Locators (all as getters) ---

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
    // Prefer user-facing validation text; include a couple common variants.
    return this.page
      .getByText(/username is required/i)
      .or(this.page.getByText(/required/i))
      .or(this.page.getByRole('alert').getByText(/username|required/i))
      .first();
  }

  // --- Navigation ---

  async goto(): Promise<void> {
    await this.page.goto('https://demo.magicai-app/login');
  }

  // --- Internal element recovery utility ---

  private async retryExpectVisible({ locator, locatorName }: RetryExpectVisibleParams): Promise<void> {
    // Element Recovery Rule: retry locating the same element up to 2 times (3 attempts total).
    const attempts = 3;
    let lastError: unknown;

    for (let attempt = 0; attempt < attempts; attempt++) {
      try {
        await expect(locator).toBeVisible();
        return;
      } catch (error) {
        lastError = error;
        // Avoid hard-coded waits; use short retry delay only for recovery.
        await this.page.waitForTimeout(200);
      }
    }

    await this.page.pause();
    throw new Error(
      `Element not found/visible after ${attempts} attempts: ${locatorName}. ` +
        `Please point out the element on the page or share its accessible role/name so the locator can be corrected. ` +
        `Last error: ${String(lastError)}`,
    );
  }

  // --- Actions ---

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

  // --- Assertions ---

  async assertUsernameRequiredErrorVisible(): Promise<void> {
    await this.retryExpectVisible({ locator: this.usernameRequiredError, locatorName: 'Username required error' });
    await expect(this.usernameRequiredError).toBeVisible();
    await expect(this.usernameRequiredError).toContainText(/username|required/i);
  }

  async assertStillOnLoginPage(): Promise<void> {
    await expect(this.page).toHaveURL(/\/login/i);
  }
}

test.describe('TC-TC-9 - Login validation for blank username', () => {
  test('TC-TC-9 - Leaving username blank blocks login and shows required validation', async ({ page }) => {
    const loginPage = new MagicAiLoginPage(page);

    // Arrange
    const password = process.env.TEST_PASSWORD ?? process.env.APP_PASSWORD;
    test.skip(!password, 'Missing TEST_PASSWORD (preferred) or APP_PASSWORD environment variable.');

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
