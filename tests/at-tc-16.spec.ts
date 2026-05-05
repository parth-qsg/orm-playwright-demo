import { test, expect, Locator, Page } from '@playwright/test';

/**
 * AT-TC-16 (TestCase ID: e716bd75-64e5-4161-a271-9aa90d01a86a)
 * Objective: Signup fails when password is missing.
 *
 * NOTE (repo constraints):
 * - The project standards expect POMs under /pages and helpers under /utils/helpers.
 * - This environment restricts file access to /workspace/repo/tests only, so we reuse
 *   the existing local POM pattern used in other specs (e.g., at-tc-15.spec.ts).
 *
 * NOTE (execution constraints):
 * - Browser navigation to the AUT could not be completed here because baseURL resolves
 *   "/signup" to "https://signup/" (DNS failure). Locators are implemented using
 *   resilient role/label patterns and include the Element Recovery Rule.
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

    // Element Recovery Rule: pause and ask for help after 2 retries.
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
    return this.page.getByRole('textbox', { name: /full name|name/i });
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
    // Prefer a specific message; keep a fallback for common variants.
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

  // --- Assertions ---

  async assertFormValues({ fullName, username, email }: SignupNoPasswordParams): Promise<void> {
    await expect(this.fullNameTextbox).toHaveValue(fullName);
    await expect(this.usernameTextbox).toHaveValue(username);
    await expect(this.emailTextbox).toHaveValue(email);
    await expect(this.passwordTextbox).toHaveValue('');
  }

  async assertPasswordRequiredValidationVisible(): Promise<void> {
    await this.retryExpectVisible({ locator: this.passwordRequiredValidation, locatorName: 'Password required validation' });
    await expect(this.passwordRequiredValidation).toBeVisible();
  }

  async assertStillOnSignupPageAfterSubmit(): Promise<void> {
    // Submission should be blocked; user should remain on signup/register.
    await expect(this.page).toHaveURL(/signup|register/i);
  }
}

test.describe('AT-TC-16 - Signup fails when password is missing', { tag: ['@functional', '@regression', '@negative'] }, () => {
  test.use({ channel: process.env.PW_CHANNEL ?? 'chromium' });

  test('AT-TC-16 - Try signing up without a password and verify validation prevents account creation', async ({ page }) => {
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
    await signupPage.assertStillOnSignupPageAfterSubmit();
    await signupPage.assertPasswordRequiredValidationVisible();
  });
});
