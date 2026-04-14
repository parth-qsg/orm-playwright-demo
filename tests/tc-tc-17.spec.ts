import { Locator, Page, expect, test } from '@playwright/test';
import { OrangeHrmLoginPage } from './pages.orangehrm';

interface RetryExpectVisibleParams {
  locator: Locator;
  locatorName: string;
}

class OrangeHrmLoginPageWithUsernameBlankValidation extends OrangeHrmLoginPage {
  constructor(private readonly currentPage: Page) {
    super(currentPage);
  }

  private get usernameTextbox(): Locator {
    return this.currentPage.getByRole('textbox', { name: 'Username' });
  }

  private get loginPageUrlRegex(): RegExp {
    return /\/web\/index\.php\/auth\/login/;
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

  async clearUsername(): Promise<void> {
    await this.retryExpectVisible({ locator: this.usernameTextbox, locatorName: 'Username textbox' });
    await expect(this.usernameTextbox).toBeEnabled();
    await this.usernameTextbox.clear();
  }

  async assertUsernameEmpty(): Promise<void> {
    await this.retryExpectVisible({ locator: this.usernameTextbox, locatorName: 'Username textbox' });
    await expect(this.usernameTextbox).toHaveValue('');
  }

  async assertStillOnLoginPage(): Promise<void> {
    await expect(this.currentPage).toHaveURL(this.loginPageUrlRegex);
  }
}

test.describe('TC-TC-17 - Login - Validation when username is blank', () => {
  test('Submitting the login form with an empty username shows username required validation', async ({ page }) => {
    const loginPage = new OrangeHrmLoginPageWithUsernameBlankValidation(page);

    const passwordFromEnv: string = process.env.TEST_PASSWORD ?? process.env.APP_PASSWORD ?? '';

    // Arrange: Open the login page
    await loginPage.goto();
    await loginPage.assertOnLoginPage();

    // Arrange: Ensure the username field is blank
    await loginPage.clearUsername();
    await loginPage.assertUsernameEmpty();

    // Act: Enter a valid password and click Login
    await loginPage.fillPassword(passwordFromEnv);
    await loginPage.clickLogin();

    // Assert: Username required validation is shown and login is not submitted
    await loginPage.assertUsernameRequiredVisible();
    await loginPage.assertStillOnLoginPage();
  });
});
