import { test, expect, Locator, Page } from '@playwright/test';

/**
 * TestCase ID: e716bd75-64e5-4161-a271-9aa90d01a86a
 * TestCase Key: AT-TC-16
 * Priority: high
 * Tags: @functional, @secure
 *
 * Objective:
 * - Signup fails when password is missing
 *
 * Preconditions:
 * - User is not authenticated
 * - Signup page is accessible
 */

interface RetryVisibleParams {
  locator: Locator;
  locatorName: string;
}

interface SignupNoPasswordParams {
  fullName: string;
  username: string;
  email: string;
}

class BaseUiPage {
  constructor(protected readonly page: Page) {}

  protected async retryExpectVisible({ locator, locatorName }: RetryVisibleParams): Promise<void> {
    const attempts = 3;
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

    throw new Error(
      `Element not found after ${attempts} attempts: ${locatorName}. ` +
        `Please confirm the correct accessible name/role for this element so the locator can be updated.\n` +
        `Last error: ${String(lastError)}`,
    );
  }
}

class SignupPage extends BaseUiPage {
  private get signupHeading(): Locator {
    return this.page.getByRole('heading', { name: /sign up|signup|create account|register/i });
  }

  private get signupForm(): Locator {
    return this.page.locator('form');
  }

  private get fullNameTextbox(): Locator {
    return this.page
      .getByLabel(/full name|name/i)
      .or(
        this.page.locator(
          'input[name="fullName"], input[name="name"], input#fullName, input#name, input[placeholder*="name" i], input[autocomplete="name"], input[autocomplete="given-name"], input[autocomplete="family-name"]',
        ),
      );
  }

  private get usernameTextbox(): Locator {
    return this.page
      .getByLabel(/username/i)
      .or(this.page.locator('input[name="username"], input#username'));
  }

  private get emailTextbox(): Locator {
    return this.page
      .getByLabel(/email/i)
      .or(this.page.locator('input[type="email"], input[name="email"], input#email'));
  }

  private get passwordTextbox(): Locator {
    return this.page
      .getByLabel(/password/i)
      .or(this.page.locator('input[type="password"], input[name="password"], input#password'));
  }

  private get signUpButton(): Locator {
    return this.page.getByRole('button', { name: /sign up|signup|create account|register/i });
  }

  private get passwordRequiredValidationMessage(): Locator {
    // Prefer explicit message; fallback to common HTML5 validation text.
    return this.page.getByText(/password is required|required password|password required|please fill out this field/i);
  }

  async goto(): Promise<void> {
    const signupUrl = process.env.SIGNUP_URL ?? '/signup';
    await this.page.goto(signupUrl);
  }

  async assertSignupPageDisplayed(): Promise<void> {
    const headingCount = await this.signupHeading.count();
    if (headingCount > 0) await expect(this.signupHeading.first()).toBeVisible();

    await this.retryExpectVisible({ locator: this.fullNameTextbox, locatorName: 'Full Name textbox' });
    await this.retryExpectVisible({ locator: this.usernameTextbox, locatorName: 'Username textbox' });
    await this.retryExpectVisible({ locator: this.emailTextbox, locatorName: 'Email textbox' });
    await this.retryExpectVisible({ locator: this.passwordTextbox, locatorName: 'Password textbox' });
    await this.retryExpectVisible({ locator: this.signUpButton, locatorName: 'Sign up button' });

    const formCount = await this.signupForm.count();
    if (formCount > 0) await expect(this.signupForm.first()).toBeVisible();
  }

  async fillFormWithoutPassword({ fullName, username, email }: SignupNoPasswordParams): Promise<void> {
    await this.fullNameTextbox.fill(fullName);
    await this.usernameTextbox.fill(username);
    await this.emailTextbox.fill(email);

    await expect(this.fullNameTextbox).toHaveValue(fullName);
    await expect(this.usernameTextbox).toHaveValue(username);
    await expect(this.emailTextbox).toHaveValue(email);
    await expect(this.passwordTextbox).toHaveValue('');
  }

  async clickSignUp(): Promise<void> {
    await expect(this.signUpButton).toBeEnabled();
    await this.signUpButton.click();
  }

  async assertSignupSubmissionBlocked(): Promise<void> {
    // Stay on signup/register page.
    await expect(this.page).toHaveURL(/signup|register/i);

    // Also ensure we did not land on a typical authenticated page.
    await expect(this.page).not.toHaveURL(/dashboard|home|account|profile/i);
  }

  async assertPasswordRequiredValidationVisible(): Promise<void> {
    // Prefer field-level error message.
    const messageVisible = await this.passwordRequiredValidationMessage.isVisible().catch(() => false);
    if (messageVisible) {
      await expect(this.passwordRequiredValidationMessage).toBeVisible();
      return;
    }

    // Fallback: HTML5 required validation (browser-native) can block submission without rendering a message in DOM.
    const validity = await this.passwordTextbox.evaluate((el) => {
      const input = el as HTMLInputElement;
      return {
        valueMissing: input.validity.valueMissing,
        validationMessage: input.validationMessage,
      };
    });

    expect(validity.valueMissing).toBeTruthy();
    expect(validity.validationMessage.length).toBeGreaterThan(0);
  }
}

test.describe('AT-TC-16 - Signup fails when password is missing', { tag: ['@functional', '@secure'] }, () => {
  test('Signup blocked due to missing password; no account created', async ({ page }) => {
    const signupPage = new SignupPage(page);

    // Arrange
    await signupPage.goto();
    await signupPage.assertSignupPageDisplayed();

    // Act
    await signupPage.fillFormWithoutPassword({
      fullName: 'User NoPassword',
      username: 'userNoPwd',
      email: 'nopwd@example.com',
    });
    await signupPage.clickSignUp();

    // Assert
    await signupPage.assertSignupSubmissionBlocked();
    await signupPage.assertPasswordRequiredValidationVisible();
  });
});
