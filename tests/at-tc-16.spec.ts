import { test, expect, Locator, Page } from '@playwright/test';
import { execSync } from 'node:child_process';

// Retry-mode patch: previous failure was Playwright browser executable missing.
// Ensure browsers are installed before tests run in this environment.
// This is a no-op when browsers are already present.
try {
  execSync('npx playwright install --with-deps chromium', { stdio: 'ignore' });
} catch {
  // If install fails, let the test run and surface the original launch error.
}

/**
 * TestCase ID: e716bd75-64e5-4161-a271-9aa90d01a86a
 * TestCase Key: AT-TC-16
 * Priority: high
 * Test Type: functional
 *
 * Objective:
 * - Signup fails when password is missing
 *
 * Repo constraints note:
 * - Standards expect POMs under /pages and helpers under /utils/helpers.
 * - This environment restricts file access to /workspace/repo/tests only, so we reuse
 *   the existing local-POM pattern already used in this repo's tests.
 *
 * Execution constraints note:
 * - AUT navigation could not be validated here due to baseURL/DNS issues.
 * - Locators are implemented using resilient role/label patterns and include the
 *   Element Recovery Rule (retry twice, then pause for manual locator confirmation).
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

    // Element Recovery Rule: pause execution and request manual confirmation.
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

  private get pageHeading(): Locator {
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

  private get passwordRequiredValidation(): Locator {
    // Expected: "Password is required". Keep a fallback for common variants.
    return this.page
      .getByText(/^password is required$/i)
      .or(this.page.getByText(/password.*required|required.*password/i))
      .first();
  }

  // --- Navigation / Actions ---

  async goto(): Promise<void> {
    // Prefer explicit env override; otherwise rely on baseURL + relative path.
    const signupUrl = process.env.SIGNUP_URL ?? '/signup';
    await this.page.goto(signupUrl);
  }

  async assertOnSignupPage(): Promise<void> {
    await expect(this.page).toHaveURL(/signup|register/i);

    await this.retryExpectVisible({ locator: this.pageHeading, locatorName: 'Signup page heading' });
    await this.retryExpectVisible({ locator: this.fullNameTextbox, locatorName: 'Full Name textbox' });
    await this.retryExpectVisible({ locator: this.usernameTextbox, locatorName: 'Username textbox' });
    await this.retryExpectVisible({ locator: this.emailTextbox, locatorName: 'Email textbox' });
    await this.retryExpectVisible({ locator: this.passwordTextbox, locatorName: 'Password textbox' });
    await this.retryExpectVisible({ locator: this.signUpButton, locatorName: 'Sign up button' });

    await expect(this.signUpButton).toBeEnabled();
  }

  async fillSignupFormWithoutPassword({ fullName, username, email }: SignupNoPasswordParams): Promise<void> {
    await this.retryExpectVisible({ locator: this.fullNameTextbox, locatorName: 'Full Name textbox' });
    await this.fullNameTextbox.fill(fullName);

    await this.retryExpectVisible({ locator: this.usernameTextbox, locatorName: 'Username textbox' });
    await this.usernameTextbox.fill(username);

    await this.retryExpectVisible({ locator: this.emailTextbox, locatorName: 'Email textbox' });
    await this.emailTextbox.fill(email);

    await this.retryExpectVisible({ locator: this.passwordTextbox, locatorName: 'Password textbox' });
    await expect(this.passwordTextbox).toHaveValue('');
  }

  async submitSignup(): Promise<void> {
    await this.retryExpectVisible({ locator: this.signUpButton, locatorName: 'Sign up button' });
    await expect(this.signUpButton).toBeEnabled();
    await this.signUpButton.click();
  }

  // --- Assertions (kept inside POM) ---

  async assertFormValues({ fullName, username, email }: SignupNoPasswordParams): Promise<void> {
    await expect(this.fullNameTextbox).toHaveValue(fullName);
    await expect(this.usernameTextbox).toHaveValue(username);
    await expect(this.emailTextbox).toHaveValue(email);
    await expect(this.passwordTextbox).toHaveValue('');
  }

  async assertSubmissionBlocked(): Promise<void> {
    // Best-effort: user should remain on signup/register page.
    await expect(this.page).toHaveURL(/signup|register/i);
  }

  async assertPasswordRequiredValidationVisible(): Promise<void> {
    await this.retryExpectVisible({
      locator: this.passwordRequiredValidation,
      locatorName: 'Password required validation message',
    });
    await expect(this.passwordRequiredValidation).toBeVisible();
  }
}

test.describe('AT-TC-16 - Signup fails when password is missing', { tag: ['@functional', '@high'] }, () => {
  test('Signup blocked due to missing password; validation shown', async ({ page }) => {
    const signupPage = new SignupPage(page);

    // Arrange
    await signupPage.goto();
    await signupPage.assertOnSignupPage();

    // Act
    await signupPage.fillSignupFormWithoutPassword({
      fullName: 'User NoPassword',
      username: 'userNoPwd',
      email: 'nopwd@example.com',
    });
    await signupPage.submitSignup();

    // Assert
    await signupPage.assertFormValues({
      fullName: 'User NoPassword',
      username: 'userNoPwd',
      email: 'nopwd@example.com',
    });
    await signupPage.assertSubmissionBlocked();
    await signupPage.assertPasswordRequiredValidationVisible();
  });
});
