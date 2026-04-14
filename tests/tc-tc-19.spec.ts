import { Locator, Page, expect, test } from '@playwright/test';
import { OrangeHrmLoginPage } from './pages.orangehrm';

interface RetryExpectVisibleParams {
  locator: Locator;
  locatorName: string;
}

class OrangeHrmLoginPageWithPasswordInteractions extends OrangeHrmLoginPage {
  constructor(private readonly currentPage: Page) {
    super(currentPage);
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

  async focusPassword(): Promise<void> {
    await this.retryExpectVisible({ locator: this.passwordTextbox, locatorName: 'Password textbox' });
    await expect(this.passwordTextbox).toBeEnabled();
    await this.passwordTextbox.focus();
  }

  async clearPassword(): Promise<void> {
    await this.retryExpectVisible({ locator: this.passwordTextbox, locatorName: 'Password textbox' });
    await this.passwordTextbox.clear();
  }

  async assertPasswordFieldFocused(): Promise<void> {
    await this.retryExpectVisible({ locator: this.passwordTextbox, locatorName: 'Password textbox' });
    await expect(this.passwordTextbox).toBeFocused();
  }

  async assertPasswordCleared(): Promise<void> {
    await this.retryExpectVisible({ locator: this.passwordTextbox, locatorName: 'Password textbox' });
    await expect(this.passwordTextbox).toHaveValue('');
  }
}

test.describe('TC-TC-19: Login - Password masking', () => {
  test('Verify password masking on the login page', async ({ page }) => {
    const loginPage = new OrangeHrmLoginPageWithPasswordInteractions(page);

    // Arrange: Open the login page
    await loginPage.goto();
    await loginPage.assertOnLoginPage();

    // Act: Focus password and type a sample password
    await loginPage.focusPassword();
    await loginPage.assertPasswordFieldFocused();
    await loginPage.fillPassword('TestPwd123');

    // Assert: Password characters are masked while typing
    await loginPage.assertPasswordInputIsMasked();

    // Act: Clear the password field
    await loginPage.clearPassword();

    // Assert: Password field is cleared
    await loginPage.assertPasswordCleared();
  });
});
