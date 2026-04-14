import { expect, Locator, Page, test } from '@playwright/test';

interface RetryVisibleParams {
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

  async assertPasswordResetFlowPresented(): Promise<void> {
    // Assert a recognizable reset heading and at least one reset option/input.
    await this.retryExpectVisible({ locator: this.resetHeading, locatorName: 'Reset/Forgot Password heading' });

    // Some flows may show either an email field or a set of options; asserting the common email textbox + submit button.
    await this.retryExpectVisible({ locator: this.emailTextbox, locatorName: 'Email textbox' });
    await this.retryExpectVisible({ locator: this.submitButton, locatorName: 'Reset submit button' });

    await expect(this.emailTextbox).toBeEnabled();
    await expect(this.submitButton).toBeEnabled();

    // URL commonly changes; keep assertion flexible.
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
