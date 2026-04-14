import { expect, Locator, Page, test } from '@playwright/test';
import { OrangeHrmLoginPage } from './pages.orangehrm';

interface RetryVisibleParams {
  locator: Locator;
  locatorName: string;
}

class OrangeHrmLoginValidationPage {
  constructor(private readonly page: Page) {}

  // --- Locators (getters only) ---

  private get usernameRequiredText(): Locator {
    return this.page
      .getByRole('textbox', { name: 'Username' })
      .locator('xpath=following::div[normalize-space(.)="Required"][1]');
  }

  private get passwordRequiredText(): Locator {
    return this.page
      .getByRole('textbox', { name: 'Password' })
      .locator('xpath=following::div[normalize-space(.)="Required"][1]');
  }

  // --- Helpers ---

  private async retryExpectVisible({ locator, locatorName }: RetryVisibleParams): Promise<void> {
    const attempts = 3; // initial + 2 retries
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

    // Element Recovery Rule: pause and ask for help after 2 retries.
    await this.page.pause();
    throw new Error(
      `Element not found after ${attempts} attempts: ${locatorName}. ` +
        `Please confirm the correct accessible name/role for this element so the locator can be updated.\n` +
        `Last error: ${String(lastError)}`,
    );
  }

  // --- Assertions (kept out of test file) ---

  async assertUsernameRequiredMessageVisible(): Promise<void> {
    await this.retryExpectVisible({ locator: this.usernameRequiredText, locatorName: 'Username required validation text' });
    await expect(this.usernameRequiredText).toHaveText('Required');
  }

  async assertPasswordRequiredMessageVisible(): Promise<void> {
    await this.retryExpectVisible({ locator: this.passwordRequiredText, locatorName: 'Password required validation text' });
    await expect(this.passwordRequiredText).toHaveText('Required');
  }
}

test.describe('TC-TC-6 - Validate blank mandatory fields on login page', () => {
  test('TC-TC-6 - Show required validation when username and password are blank', async ({ page }) => {
    const loginPage = new OrangeHrmLoginPage(page);
    const loginValidationPage = new OrangeHrmLoginValidationPage(page);

    // Arrange
    await test.step('Open the login page URL', async () => {
      await loginPage.goto();
      await loginPage.assertOnLoginPage();
    });

    // Act
    await test.step('Click the login button with both username and password fields empty', async () => {
      await loginPage.clickLogin();
    });

    // Assert
    await test.step('Observe validation message for username field', async () => {
      await loginValidationPage.assertUsernameRequiredMessageVisible();
    });

    await test.step('Observe validation message for password field', async () => {
      await loginValidationPage.assertPasswordRequiredMessageVisible();
    });
  });
});
