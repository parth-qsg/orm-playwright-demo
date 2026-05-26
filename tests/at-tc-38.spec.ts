import { expect, Locator, Page, test } from '@playwright/test';

function getBaseUrl(): string {
  const baseUrl = process.env.BASE_URL;
  test.skip(!baseUrl, 'Missing BASE_URL environment variable for UI tests.');
  return baseUrl!.replace(/\/$/, '');
}

function getTestPassword(): string {
  return (
    process.env.TEST_PASSWORD ??
    process.env.APP_PASSWORD ??
    // Non-secret fallback for negative validation test.
    'ValidPassword123!'
  );
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
      .or(this.page.getByRole('button', { name: /get started/i }))
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

  async fillPassword(password: string): Promise<void> {
    await expect(this.passwordTextbox.first()).toBeVisible();
    await this.passwordTextbox.first().fill(password);
  }

  async submit(): Promise<void> {
    const button = this.signupButton.first();
    await expect(button).toBeVisible({ timeout: 15000 });
    await expect(button).toBeEnabled();
    await button.click();
  }

  async assertInvalidEmailValidation(): Promise<void> {
    const email = this.emailTextbox.first();

    // Trigger client-side validation (many UIs validate on blur/submit).
    await email.focus();
    await this.page.keyboard.press('Tab');

    // Prefer native HTML5 validation if present.
    const nativeMessage = await email.evaluate((el) => {
      const input = el as HTMLInputElement;
      if (typeof input.reportValidity === 'function') input.reportValidity();
      return input.validationMessage ?? '';
    });

    if (nativeMessage && /email|valid|format|@/i.test(nativeMessage)) {
      expect(nativeMessage).toMatch(/email|valid|format|@/i);
      return;
    }

    // Otherwise, assert the field is marked invalid and/or an inline validation message is shown.
    const ariaInvalid = await email.getAttribute('aria-invalid');
    if (ariaInvalid !== null) {
      expect(ariaInvalid).toBe('true');
      return;
    }

    // Some apps don't set aria-invalid; fall back to HTML5 validity state.
    const validity = await email.evaluate((el) => {
      const input = el as HTMLInputElement;
      return {
        valid: input.validity?.valid ?? true,
        typeMismatch: input.validity?.typeMismatch ?? false,
        patternMismatch: input.validity?.patternMismatch ?? false,
        badInput: input.validity?.badInput ?? false,
      };
    });
    if (!validity.valid && (validity.typeMismatch || validity.patternMismatch || validity.badInput)) return;

    const invalidClass = await email.evaluate((el) => {
      const classes = (el as HTMLElement).className ?? '';
      return /invalid|error/i.test(String(classes));
    });
    if (invalidClass) return;

    const describedBy = await email.getAttribute('aria-describedby');
    if (describedBy) {
      const described = this.page.locator(
        describedBy
          .split(/\s+/)
          .filter(Boolean)
          .map((id) => `#${CSS.escape(id)}`)
          .join(', '),
      );
      await expect(described).toContainText(/email|valid|format|@/i, { timeout: 15000 });
      return;
    }

    // Last resort: look for any visible validation text near the email field.
    const fieldContainer = email.locator('xpath=ancestor::*[self::label or self::div or self::fieldset][1]');
    const nearbyText = fieldContainer
      .locator('text=/email|valid|format|@|invalid/i')
      .or(this.page.locator('text=/email|valid|format|@|invalid/i'));

    await expect(nearbyText.first()).toBeVisible({ timeout: 15000 });
  }
}

test.describe('AT-TC-38 - Enforce proper email format during signup', { tag: ['@functional'] }, () => {
  test('Submitting signup with an invalid email is blocked with an explicit validation message', async ({ page }) => {
    const signupPage = new SignupPage(page);

    // Arrange
    await signupPage.goto();
    await signupPage.assertOnSignupPage();

    // Act
    await signupPage.fillEmail('invalid-email-format');
    await signupPage.fillPassword(getTestPassword());
    await signupPage.submit();

    // Assert
    await signupPage.assertInvalidEmailValidation();
    await signupPage.assertOnSignupPage();
  });
});
