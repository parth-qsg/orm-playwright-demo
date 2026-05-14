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
    return this.page
      .getByRole('button', { name: /sign up|signup|register|create account/i })
      .or(this.page.getByRole('button', { name: /continue|next|submit|create/i }))
      .or(this.page.locator('button[type="submit"], input[type="submit"]'));
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

    const emailVisible = await this.emailTextbox.first().isVisible().catch(() => false);
    const passwordVisible = await this.passwordTextbox.first().isVisible().catch(() => false);
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
    const button = this.signupButton.first();
    await expect(button).toBeVisible({ timeout: 15000 });
    await expect(button).toBeEnabled();
    await button.click();
  }

  async assertPasswordRequiredValidation(): Promise<void> {
    const password = this.passwordTextbox.first();

    // Trigger validation UI (some apps only validate on blur).
    await password.focus();
    await this.page.keyboard.press('Tab');

    // Prefer native HTML5 validation if present.
    const nativeMessage = await password.evaluate((el) => {
      const input = el as HTMLInputElement;
      if (typeof input.reportValidity === 'function') input.reportValidity();
      return input.validationMessage ?? '';
    });

    if (nativeMessage && /required|password/i.test(nativeMessage)) {
      expect(nativeMessage).toMatch(/required|password/i);
      return;
    }

    // Otherwise, assert the field is marked invalid OR an inline validation message is shown.
    const invalidByAria = await password.getAttribute('aria-invalid');
    if (invalidByAria !== null) {
      expect(invalidByAria).toBe('true');
      return;
    }

    // Otherwise, accept any of the common validation signals.
    // 1) aria-describedby points to helper/error text.
    const describedBy = await password.getAttribute('aria-describedby');
    if (describedBy) {
      const described = this.page.locator(
        describedBy
          .split(/\s+/)
          .filter(Boolean)
          .map((id) => `#${CSS.escape(id)}`)
          .join(', '),
      );
      await expect(described).toContainText(/password|required|missing/i, { timeout: 15000 });
      return;
    }

    // 2) Inline validation message near the password field.
    const fieldContainer = password.locator('xpath=ancestor::*[self::label or self::div or self::fieldset][1]');
    const nearbyText = fieldContainer
      .locator(
        '[role="alert"], [aria-live], [data-testid*="error" i], [data-test*="error" i], .error, .errors, .invalid-feedback, .field-error, .helper-text, .form-error, .input-error, .text-danger, .MuiFormHelperText-root, .Mui-error',
      )
      .filter({ hasText: /password|required|missing/i });

    if (await nearbyText.first().isVisible().catch(() => false)) {
      await expect(nearbyText.first()).toBeVisible({ timeout: 15000 });
      return;
    }

    // 3) Input is marked invalid via CSS class.
    const classAttr = (await password.getAttribute('class')) ?? '';
    if (/invalid|error/i.test(classAttr)) {
      expect(classAttr).toMatch(/invalid|error/i);
      return;
    }

    // 4) Last resort: accept generic required message anywhere on the form.
    const genericRequired = this.page
      .locator(
        '[role="alert"], [aria-live], [data-testid*="error" i], [data-test*="error" i], .error, .errors, .invalid-feedback, .field-error, .helper-text, .form-error, .input-error, .text-danger, .MuiFormHelperText-root, .Mui-error',
      )
      .filter({ hasText: /required|missing|password/i });
    await expect(genericRequired.first()).toBeVisible({ timeout: 15000 });
  }
}

test.describe('AT-TC-39 - Signup fails when password is missing', { tag: ['@functional'] }, () => {
  test('Attempting signup without a password triggers a validation error and prevents submission', async ({ page }) => {
    const signupPage = new SignupPage(page);

    // Arrange
    await signupPage.goto();
    await signupPage.assertOnSignupPage();

    // Act
    await signupPage.fillEmail(uniqueEmail());
    await signupPage.assertPasswordEmpty();
    await signupPage.submit();

    // Assert
    await signupPage.assertPasswordRequiredValidation();
    await signupPage.assertOnSignupPage();
  });
});
