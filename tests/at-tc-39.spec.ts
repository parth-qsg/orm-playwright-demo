import { expect, Locator, Page, test } from '@playwright/test';

function getBaseUrl(): string {
  const baseUrl = process.env.BASE_URL;
  test.skip(!baseUrl, 'Missing BASE_URL environment variable for UI tests.');
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
      .or(this.page.getByLabel(/email/i))
      .or(this.page.getByPlaceholder(/email/i))
      .or(
        this.page.locator(
          'input[name="email"], input#email, input[type="email"], input[autocomplete="email"], input[placeholder*="mail" i], input[name="username"], input#username, input[autocomplete="username"]',
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

    await this.page.context().clearCookies();
    await this.page.addInitScript(() => {
      try {
        localStorage.clear();
      } catch {
        // ignore
      }
      try {
        sessionStorage.clear();
      } catch {
        // ignore
      }
    });

    // Some apps expose signup as a modal/tab from the home or auth page.
    const candidates: string[] = [
      `${base}/signup`,
      `${base}/sign-up`,
      `${base}/register`,
      `${base}/auth/signup`,
      `${base}/auth`,
      `${base}/login`,
      `${base}/sign-in`,
      `${base}/`,
    ];

    for (const url of candidates) {
      const response = await this.page.goto(url, { waitUntil: 'domcontentloaded' });
      if (response && response.status() !== 404) {
        const found = await this.tryOpenSignupAndWaitForForm();
        if (found) return;
      }
    }

    // Final attempt: if navigation succeeded but form is behind a tab/modal.
    await this.tryOpenSignupAndWaitForForm();
    await this.assertOnSignupPage();
  }

  private async tryOpenSignupAndWaitForForm(): Promise<boolean> {
    const openSignup = this.page
      .getByRole('link', { name: /sign up|signup|register|create account/i })
      .or(this.page.getByRole('button', { name: /sign up|signup|register|create account/i }))
      .or(this.page.getByRole('tab', { name: /sign up|signup|register|create account/i }));

    if (await openSignup.first().isVisible().catch(() => false)) {
      await openSignup.first().click();
    }

    const email = this.emailTextbox.first();
    const password = this.passwordTextbox.first();

    const emailVisible = await email.isVisible().catch(() => false);
    const passwordVisible = await password.isVisible().catch(() => false);
    return emailVisible || passwordVisible;
  }

  async assertOnSignupPage(): Promise<void> {
    const signupTab = this.page.getByRole('tab', { name: /sign up|signup|register|create account/i });
    if (await signupTab.isVisible().catch(() => false)) {
      await signupTab.click();
    }

    await expect(this.emailTextbox.first()).toBeVisible({ timeout: 15000 });
  }

  async fillEmail(email: string): Promise<void> {
    await expect(this.emailTextbox.first()).toBeVisible();
    await this.emailTextbox.first().fill(email);
  }

  async assertPasswordEmpty(): Promise<void> {
    await expect(this.passwordTextbox.first()).toBeVisible();
    await expect(this.passwordTextbox.first()).toHaveValue('');
  }

  async submit(): Promise<void> {
    await expect(this.signupButton).toBeVisible();
    await expect(this.signupButton).toBeEnabled();
    await this.signupButton.click();
  }

  async assertPasswordRequiredValidation(): Promise<void> {
    // Prefer native HTML5 validation if present.
    const nativeMessage = await this.passwordTextbox.first().evaluate((el) => {
      const input = el as HTMLInputElement;
      return input.validationMessage ?? '';
    });

    if (nativeMessage && /required|password/i.test(nativeMessage)) {
      expect(nativeMessage).toMatch(/required|password/i);
      return;
    }

    // Otherwise, assert an inline validation message is shown.
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
