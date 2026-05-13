import { expect, Locator, Page, test } from '@playwright/test';

function getBaseUrl(): string {
  const baseUrl = process.env.BASE_URL;
  test.skip(!baseUrl, 'Missing BASE_URL environment variable.');
  return baseUrl!.replace(/\/$/, '');
}

function uniqueEmail(): string {
  const stamp = new Date().toISOString().replace(/[-:.TZ]/g, '');
  return `pw.missing.password.${stamp}@example.test`;
}

class SignupPage {
  constructor(private readonly page: Page) {}

  private get emailTextbox(): Locator {
    return this.page
      .getByRole('textbox', { name: /email/i })
      .or(this.page.getByRole('textbox', { name: /e-?mail/i }))
      .or(this.page.getByLabel(/email/i))
      .or(this.page.getByPlaceholder(/email/i))
      .or(
        this.page.locator(
          'input[name="email"], input#email, input[type="email"], input[autocomplete="email"], input[placeholder*="mail" i]',
        ),
      );
  }

  private get passwordTextbox(): Locator {
    return this.page
      .getByLabel(/password/i)
      .or(this.page.getByPlaceholder(/password/i))
      .or(
        this.page.locator(
          'input[name="password"], input#password, input[type="password"], input[autocomplete="current-password"], input[autocomplete="new-password"]',
        ),
      );
  }

  private get signupButton(): Locator {
    return this.page.getByRole('button', { name: /sign up|signup|register|create account/i });
  }

  async goto(): Promise<void> {
    const base = getBaseUrl();
    const candidates: string[] = [`${base}/signup`, `${base}/sign-up`, `${base}/register`, `${base}/auth/signup`];

    for (const url of candidates) {
      const response = await this.page.goto(url, { waitUntil: 'domcontentloaded' });
      if (response && response.status() !== 404) break;
    }

    await this.assertOnSignupPage();
  }

  async assertOnSignupPage(): Promise<void> {
    // Some apps render signup as a tab within an auth page.
    const signupTab = this.page.getByRole('tab', { name: /sign up|signup|register|create account/i });
    if (await signupTab.isVisible().catch(() => false)) {
      await signupTab.click();
    }

    // Prefer resilient, user-facing locators; fall back to common attributes.
    await expect(this.emailTextbox.first()).toBeVisible({ timeout: 15000 });
  }

  async fillEmail(email: string): Promise<void> {
    await expect(this.emailTextbox).toBeVisible();
    await this.emailTextbox.fill(email);
  }

  async assertPasswordEmpty(): Promise<void> {
    await expect(this.passwordTextbox).toBeVisible();
    await expect(this.passwordTextbox).toHaveValue('');
  }

  async submit(): Promise<void> {
    await expect(this.signupButton).toBeVisible();
    await expect(this.signupButton).toBeEnabled();
    await this.signupButton.click();
  }

  async assertPasswordRequiredValidation(): Promise<void> {
    const nativeMessage = await this.passwordTextbox.evaluate((el) => {
      const input = el as HTMLInputElement;
      return input.validationMessage ?? '';
    });

    if (nativeMessage && /required|password/i.test(nativeMessage)) {
      expect(nativeMessage).toMatch(/required|password/i);
      return;
    }

    const inlineError = this.page
      .locator('[role="alert"], [aria-live], .error, .errors, .invalid-feedback, .field-error, .helper-text')
      .filter({ hasText: /password.*required|required.*password|password is required|required/i });

    await expect(inlineError.first()).toBeVisible({ timeout: 15000 });
  }
}

test.describe('AT-TC-39 - Signup fails when password is missing', { tag: ['@functional'] }, () => {
  test('Attempting signup without a password shows a validation error and prevents submission', async ({ page }) => {
    const signupPage = new SignupPage(page);

    // Arrange
    await signupPage.goto();

    // Act
    await signupPage.fillEmail(uniqueEmail());
    await signupPage.assertPasswordEmpty();
    await signupPage.submit();

    // Assert
    await signupPage.assertPasswordRequiredValidation();
    await signupPage.assertOnSignupPage();
  });
});
