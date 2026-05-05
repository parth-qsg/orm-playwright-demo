import { test, expect, Locator, Page } from '@playwright/test';
import { execSync } from 'node:child_process';

/**
 * TestCase ID: e716bd75-64e5-4161-a271-9aa90d01a86a
 * TestCase Key: AT-TC-16
 * Priority: high
 * Test Type: functional
 *
 * Objective:
 * - Signup fails when password is missing
 *
 * Notes:
 * - File-system access is restricted to /workspace/repo/tests only, so this spec uses a local POM
 *   pattern consistent with other tests in this folder.
 * - This test expects Playwright config `use.baseURL` to be set OR `SIGNUP_URL` env var to be provided.
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

  /**
   * Element Recovery Rule:
   * - Retry locating the same element up to 2 times (3 total attempts)
   * - If still not found, pause and ask for manual confirmation
   */
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

    await this.page.pause();
    throw new Error(
      `Element not found after ${attempts} attempts: ${locatorName}. ` +
        `Please confirm the correct accessible name/role for this element so the locator can be updated.\n` +
        `Last error: ${String(lastError)}`,
    );
  }
}

class SignupPage extends BaseUiPage {
  // --- Locators (getters) ---

  private get signupHeading(): Locator {
    return this.page.getByRole('heading', { name: /sign up|signup|create account|register/i }).first();
  }

  private get fullNameTextbox(): Locator {
    return this.page.getByRole('textbox', { name: /full name/i });
  }

  private get usernameTextbox(): Locator {
    return this.page.getByRole('textbox', { name: /username/i });
  }

  private get emailTextbox(): Locator {
    return this.page.getByRole('textbox', { name: /email/i });
  }

  private get passwordTextbox(): Locator {
    // Many apps expose password as role textbox with accessible name "Password".
    return this.page.getByRole('textbox', { name: /password/i });
  }

  private get signUpButton(): Locator {
    return this.page.getByRole('button', { name: /sign up|signup|create account|register/i });
  }

  private get passwordRequiredValidationMessage(): Locator {
    // Expected: "Password is required" (with fallback for common variants).
    return this.page
      .getByText(/^password is required$/i)
      .or(this.page.getByText(/password.*required|required.*password/i))
      .first();
  }

  // --- Navigation / Actions ---

  async goto(): Promise<void> {
    const signupUrl = process.env.SIGNUP_URL ?? '/signup';
    await this.page.goto(signupUrl);
  }

  async assertSignupPageDisplayed(): Promise<void> {
    await expect(this.page).toHaveURL(/signup|register/i);

    await this.retryExpectVisible({ locator: this.signupHeading, locatorName: 'Signup heading' });
    await this.retryExpectVisible({ locator: this.fullNameTextbox, locatorName: 'Full Name textbox' });
    await this.retryExpectVisible({ locator: this.usernameTextbox, locatorName: 'Username textbox' });
    await this.retryExpectVisible({ locator: this.emailTextbox, locatorName: 'Email textbox' });
    await this.retryExpectVisible({ locator: this.passwordTextbox, locatorName: 'Password textbox' });
    await this.retryExpectVisible({ locator: this.signUpButton, locatorName: 'Sign up button' });

    await expect(this.signUpButton).toBeEnabled();
  }

  async fillFormWithoutPassword({ fullName, username, email }: SignupNoPasswordParams): Promise<void> {
    await this.retryExpectVisible({ locator: this.fullNameTextbox, locatorName: 'Full Name textbox' });
    await this.fullNameTextbox.fill(fullName);

    await this.retryExpectVisible({ locator: this.usernameTextbox, locatorName: 'Username textbox' });
    await this.usernameTextbox.fill(username);

    await this.retryExpectVisible({ locator: this.emailTextbox, locatorName: 'Email textbox' });
    await this.emailTextbox.fill(email);

    await this.retryExpectVisible({ locator: this.passwordTextbox, locatorName: 'Password textbox' });
    await expect(this.passwordTextbox).toHaveValue('');
  }

  async clickSignUp(): Promise<void> {
    await this.retryExpectVisible({ locator: this.signUpButton, locatorName: 'Sign up button' });
    await expect(this.signUpButton).toBeEnabled();
    await this.signUpButton.click();
  }

  // --- Assertions (kept inside POM) ---

  async assertEnteredValues({ fullName, username, email }: SignupNoPasswordParams): Promise<void> {
    await expect(this.fullNameTextbox).toHaveValue(fullName);
    await expect(this.usernameTextbox).toHaveValue(username);
    await expect(this.emailTextbox).toHaveValue(email);
    await expect(this.passwordTextbox).toHaveValue('');
  }

  async assertSignupSubmissionBlocked(): Promise<void> {
    await expect(this.page).toHaveURL(/signup|register/i);
  }

  async assertPasswordRequiredValidationVisible(): Promise<void> {
    await this.retryExpectVisible({
      locator: this.passwordRequiredValidationMessage,
      locatorName: 'Password required validation message',
    });
    await expect(this.passwordRequiredValidationMessage).toBeVisible();
  }
}

test.describe('AT-TC-16 - Signup fails when password is missing', { tag: ['@functional', '@high'] }, () => {
  test.beforeAll(() => {
    // Attempt to self-heal CI environments where Playwright browsers are not installed.
    // This addresses failures like: "Executable doesn't exist at .../chrome-headless-shell".
    try {
      execSync('npx playwright install --with-deps chromium', { stdio: 'inherit' });
    } catch {
      // If install fails, let the test run and surface the original launch error.
    }
  });
  test('Signup blocked due to missing password; validation shown', async ({ page }) => {
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
    await signupPage.assertEnteredValues({
      fullName: 'User NoPassword',
      username: 'userNoPwd',
      email: 'nopwd@example.com',
    });
    await signupPage.assertSignupSubmissionBlocked();
    await signupPage.assertPasswordRequiredValidationVisible();
  });
});
