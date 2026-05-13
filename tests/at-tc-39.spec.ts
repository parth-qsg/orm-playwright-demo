import { expect, Locator, Page, test } from '@playwright/test';

class SignupPage {
  constructor(private readonly page: Page) {}

  private get emailTextbox(): Locator {
    return this.page.getByRole('textbox', { name: /email/i }).or(this.page.getByLabel(/email/i)).or(this.page.locator('input[name="email"], input#email, input[type="email"]'));
  }

  private get passwordTextbox(): Locator {
    return this.page
      .getByLabel(/^password$/i)
      .or(this.page.getByRole('textbox', { name: /password/i }))
      .or(this.page.locator('input[name="password"], input#password, input[type="password"]'));
  }

  private get signupButton(): Locator {
    return this.page.getByRole('button', { name: /sign up|signup|register|create account/i });
  }

  private get signupHeading(): Locator {
    return this.page.getByRole('heading', { name: /sign up|create account|register/i });
  }

  async goto(): Promise<void> {
    const baseURL = process.env.BASE_URL;
    test.skip(!baseURL, 'Missing BASE_URL environment variable.');

    const base = baseURL.replace(/\/$/, '');
    const candidates: string[] = [`${base}/signup`, `${base}/sign-up`, `${base}/register`, `${base}/auth/signup`];

    for (const url of candidates) {
      const response = await this.page.goto(url, { waitUntil: 'domcontentloaded' });
      if (response && response.status() !== 404) break;
    }

    await this.assertOnSignupPage();
  }

  async assertOnSignupPage(): Promise<void> {
    // Some apps render signup as a tab within a shared auth page.
    const signupTab = this.page.getByRole('tab', { name: /sign up|signup|register|create account/i });
    if (await signupTab.isVisible().catch(() => false)) {
      await signupTab.click();
    }

    // Be tolerant: different apps label the page differently. The most stable signal is the email field.
    const emailByRole = this.page.getByRole('textbox', { name: /email/i });
    const emailByLabel = this.page.getByLabel(/email/i);
    const emailByNameAttr = this.page.locator('input[name="email"], input#email, input[type="email"]');

    await expect(emailByRole.or(emailByLabel).or(emailByNameAttr)).toBeVisible({ timeout: 15000 });
  }

  async fillEmail(email: string): Promise<void> {
    await expect(this.emailTextbox).toBeVisible();
    await this.emailTextbox.fill(email);
  }

  async assertPasswordEmpty(): Promise<void> {
    // Ensure the field exists and is empty (detectable as missing).
    await expect(this.passwordTextbox).toBeVisible();
    await expect(this.passwordTextbox).toHaveValue('');
  }

  async submit(): Promise<void> {
    await expect(this.signupButton).toBeVisible();
    await expect(this.signupButton).toBeEnabled();
    await this.signupButton.click();
  }

  async assertPasswordRequiredValidation(): Promise<void> {
    // Prefer native HTML5 validation message if present.
    const nativeMessage = await this.passwordTextbox.evaluate((el) => {
      const input = el as HTMLInputElement;
      return input.validationMessage ?? '';
    });

    if (nativeMessage && /password|required/i.test(nativeMessage)) {
      expect(nativeMessage).toMatch(/password|required/i);
      return;
    }

    // Otherwise, look for common inline error patterns near the password field.
    const inlineError = this.page
      .locator(
        '[role="alert"], [aria-live="assertive"], [aria-live="polite"], .error, .errors, .invalid-feedback, .field-error, .helper-text',
      )
      .filter({ hasText: /password.*required|required.*password|password is required/i });

    await expect(inlineError.first()).toBeVisible({ timeout: 15000 });
  }
}

test.describe('AT-TC-39 - Signup fails when password is missing', { tag: ['@functional'] }, () => {
  test('Attempting signup without a password shows a validation error and prevents submission', async ({ page }) => {
    const signupPage = new SignupPage(page);

    // Arrange
    await signupPage.goto();

    // Act
    const uniqueEmail = `pw-missing-password-${Date.now()}@example.test`;
    await signupPage.fillEmail(uniqueEmail);
    await signupPage.assertPasswordEmpty();
    await signupPage.submit();

    // Assert
    await signupPage.assertPasswordRequiredValidation();

    // Assert: still on signup screen (submission blocked)
    await signupPage.assertOnSignupPage();
  });
});
