import { expect, Locator, Page, test } from '@playwright/test';

interface RetryExpectVisibleParams {
  locator: Locator;
  locatorName: string;
}

class MagicAiLoginPage {
  constructor(private readonly page: Page) {}

  private get forgotPasswordLink(): Locator {
    return this.page.getByRole('link', { name: /forgot password/i });
  }

  async goto(): Promise<void> {
    await this.page.goto('https://demo.magicai-app/login');
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
          await this.page.waitForLoadState('domcontentloaded');
        }
      }
    }

    await this.page.pause();
    throw new Error(
      `Element not found after ${maxAttempts} attempts: ${locatorName}. ` +
        `Please confirm the correct accessible role/name for this element so the locator can be updated.\n` +
        `Last error: ${String(lastError)}`,
    );
  }

  async clickForgotPassword(): Promise<void> {
    await this.retryExpectVisible({ locator: this.forgotPasswordLink, locatorName: 'Forgot Password link' });
    await expect(this.forgotPasswordLink).toBeEnabled();
    await this.forgotPasswordLink.click();
  }
}

class MagicAiForgotPasswordPage {
  constructor(private readonly page: Page) {}

  private get resetHeading(): Locator {
    return this.page.getByRole('heading', { name: /forgot password|reset password|password reset/i });
  }

  private get emailTextbox(): Locator {
    return this.page.getByRole('textbox', { name: /email/i });
  }

  private get submitButton(): Locator {
    return this.page.getByRole('button', { name: /send|reset|continue|submit/i });
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
          await this.page.waitForLoadState('domcontentloaded');
        }
      }
    }

    await this.page.pause();
    throw new Error(
      `Element not found after ${maxAttempts} attempts: ${locatorName}. ` +
        `Please confirm the correct accessible role/name for this element so the locator can be updated.\n` +
        `Last error: ${String(lastError)}`,
    );
  }

  async assertPasswordResetFlowPresented(): Promise<void> {
    await this.retryExpectVisible({ locator: this.resetHeading, locatorName: 'Forgot/Reset Password heading' });
    await this.retryExpectVisible({ locator: this.emailTextbox, locatorName: 'Email textbox' });
    await this.retryExpectVisible({ locator: this.submitButton, locatorName: 'Submit/Send reset button' });

    await expect(this.emailTextbox).toBeEnabled();
    await expect(this.submitButton).toBeEnabled();
    await expect(this.page).toHaveURL(/forgot|reset|password/i);
  }
}

test.describe('TC-TC-14 - Forgot Password navigation from login page', () => {
  test('Forgot Password navigation works and password reset flow is presented', async ({ page }) => {
    const loginPage = new MagicAiLoginPage(page);
    const forgotPasswordPage = new MagicAiForgotPasswordPage(page);

    // Arrange
    await loginPage.goto();

    // Act
    await loginPage.clickForgotPassword();

    // Assert
    await forgotPasswordPage.assertPasswordResetFlowPresented();
  });
});
