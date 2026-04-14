import { Locator, Page, expect, test } from '@playwright/test';
import { OrangeHrmLoginPage } from './pages.orangehrm';

interface RetryExpectVisibleParams {
  locator: Locator;
  locatorName: string;
}

class OrangeHrmLoginPageWithUsernameInteractions extends OrangeHrmLoginPage {
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

  async fillUsername(username: string): Promise<void> {
    await this.retryExpectVisible({ locator: this.usernameTextbox, locatorName: 'Username textbox' });
    await expect(this.usernameTextbox).toBeEnabled();
    await this.usernameTextbox.fill(username);
  }

  async assertUsernameValue(expected: string): Promise<void> {
    await this.retryExpectVisible({ locator: this.usernameTextbox, locatorName: 'Username textbox' });
    await expect(this.usernameTextbox).toHaveValue(expected);
  }

  async assertStillOnLoginPage(): Promise<void> {
    await expect(this.currentPage).toHaveURL(this.loginPageUrlRegex);
  }
}

test.describe('TC-TC-18: Login - Validation when password is blank', () => {
  test('Submitting the login form with an empty password shows password required validation', async ({ page }) => {
    const loginPage = new OrangeHrmLoginPageWithUsernameInteractions(page);

    const usernameFromEnv: string = process.env.TEST_USERNAME ?? process.env.APP_USERNAME ?? '';

    // Arrange: Open the login page
    await loginPage.goto();
    await loginPage.assertOnLoginPage();

    // Act: Enter username and leave password blank, then click Login
    await loginPage.fillUsername(usernameFromEnv);
    await loginPage.clickLogin();

    // Assert: Password required validation is shown and login is not submitted
    await loginPage.assertPasswordRequiredVisible();
    await loginPage.assertStillOnLoginPage();
    await loginPage.assertUsernameValue(usernameFromEnv);
  });
});
