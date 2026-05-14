import { expect, Locator, Page, test } from '@playwright/test';

class SignupPage {
  constructor(private readonly page: Page) {}

  private get emailTextbox(): Locator {
    return this.page
      .getByLabel(/email/i)
      .or(this.page.getByPlaceholder(/email/i))
      .or(this.page.getByRole('textbox', { name: /email/i }))
      .or(this.page.locator('input[type="email"]'))
      .or(this.page.locator('input[autocomplete="email"], input[autocomplete="username"]'))
      .or(this.page.locator('input[name*="email" i], input[id*="email" i]'))
      .or(this.page.locator('input[name="username"], input[id="username"], input[name*="user" i], input[id*="user" i]'));
  }

  private get passwordTextbox(): Locator {
    return this.page
      .getByLabel(/password/i)
      .or(this.page.getByPlaceholder(/password/i))
      .or(this.page.getByRole('textbox', { name: /password/i }))
      .or(this.page.locator('input[type="password"], input[name*="password" i], input[id*="password" i]'));
  }

  private get nameTextbox(): Locator {
    return this.page
      .getByLabel(/^name$/i)
      .or(this.page.getByPlaceholder(/^name$/i))
      .or(this.page.getByRole('textbox', { name: /^name$/i }));
  }

  private get submitButton(): Locator {
    return this.page.getByRole('button', { name: /sign up|signup|create account|register/i });
  }

  private get duplicateEmailError(): Locator {
    return this.page.getByText(
      /email (is )?already (registered|in use|taken)|already have an account|duplicate email/i,
    );
  }

  private get authenticatedMarker(): Locator {
    return this.page
      .getByRole('button', { name: /log out|logout|sign out/i })
      .or(this.page.getByRole('link', { name: /log out|logout|sign out/i }))
      .or(this.page.getByRole('button', { name: /account|profile|user|menu/i }))
      .or(this.page.locator('[data-testid*="avatar" i], [aria-label*="account" i], [aria-label*="profile" i]'));
  }

  private get authCta(): Locator {
    return this.page.getByRole('link', { name: /log in|login|sign in|sign up|signup/i });
  }

  async goto(): Promise<void> {
    const baseUrl = process.env.BASE_URL;
    test.skip(!baseUrl, 'Missing BASE_URL environment variable for UI tests.');

    const root = baseUrl.replace(/\/$/, '');

    // Preconditions: no user is currently authenticated.
    await this.page.context().clearCookies();

    const candidates = [
      `${root}/signup`,
      `${root}/register`,
      `${root}/auth/signup`,
      `${root}/auth/register`,
      `${root}/sign-up`,
      `${root}/create-account`,
      `${root}/auth`,
      `${root}/login`,
      `${root}/sign-in`,
    ];

    for (const url of candidates) {
      // Avoid hanging on slow/blocked routes; continue trying other known signup/auth paths.
      try {
        await this.page.goto(url, { waitUntil: 'domcontentloaded', timeout: 15000 });
      } catch {
        continue;
      }

      // Some apps render signup inside a modal opened from a CTA.
      const openSignupCta = this.page
        .getByRole('link', { name: /sign up|sign-up|signup|create account|register/i })
        .or(this.page.getByRole('button', { name: /sign up|sign-up|signup|create account|register/i }));
      if ((await openSignupCta.count().catch(() => 0)) > 0) {
        await openSignupCta.first().click().catch(() => undefined);
      }

      const email = this.emailTextbox.first();
      const password = this.passwordTextbox.first();

      // Wait a bit for client-side hydration/rendering.
      await email.waitFor({ state: 'visible', timeout: 5000 }).catch(() => undefined);
      if (await email.isVisible().catch(() => false)) return;

      // Some apps start with "name" and reveal email/password after.
      const continueBtn = this.page
        .getByRole('button', { name: /continue|next/i })
        .or(this.page.getByRole('button', { name: /get started/i }));
      if ((await continueBtn.count().catch(() => 0)) > 0) {
        await continueBtn.first().click().catch(() => undefined);
      }

      await email.waitFor({ state: 'visible', timeout: 5000 }).catch(() => undefined);
      if (await email.isVisible().catch(() => false)) return;

      await password.waitFor({ state: 'visible', timeout: 5000 }).catch(() => undefined);
      if (await password.isVisible().catch(() => false)) return;
    }

    // Fallback: at least ensure we're on some auth page and can reach signup.
    await this.page.goto(`${root}/`, { waitUntil: 'domcontentloaded' });
    const openSignupCta = this.page
      .getByRole('link', { name: /sign up|sign-up|signup|create account|register/i })
      .or(this.page.getByRole('button', { name: /sign up|sign-up|signup|create account|register/i }));
    if ((await openSignupCta.count().catch(() => 0)) > 0) {
      await openSignupCta.first().click();
    }

    await expect(this.emailTextbox.first()).toBeVisible({ timeout: 15000 });
  }

  async assertOnSignupPage(): Promise<void> {
    await expect(this.emailTextbox.first()).toBeVisible();
    await expect(this.passwordTextbox.first()).toBeVisible();
    await expect(this.submitButton).toBeVisible();
  }

  async fillEmail(email: string): Promise<void> {
    await this.emailTextbox.first().fill(email);
  }

  async fillPassword(password: string): Promise<void> {
    await this.passwordTextbox.first().fill(password);
  }

  async fillNameIfPresent(name: string): Promise<void> {
    if ((await this.nameTextbox.count().catch(() => 0)) > 0) await this.nameTextbox.fill(name);
  }

  async submit(): Promise<void> {
    await expect(this.submitButton).toBeEnabled();
    await this.submitButton.click();
  }

  async assertDuplicateEmailErrorVisible(): Promise<void> {
    await expect(this.duplicateEmailError).toBeVisible();
  }

  async assertNotNavigatedToHome(): Promise<void> {
    await expect(this.page).not.toHaveURL(/\/(home|dashboard)(\/|$)/i);
  }

  async assertUnauthenticated(): Promise<void> {
    await expect(this.authenticatedMarker).toHaveCount(0);
    await expect(this.authCta.first()).toBeVisible();
  }
}

test.describe('AT-TC-28 - Reject signup with an existing email and show duplicate email error', {
  tag: ['@functional', '@secure'],
}, () => {
  test('AT-TC-28 - Signup with existing email is rejected and user remains unauthenticated', async ({ page }) => {
    const signupPage = new SignupPage(page);

    // Arrange
    await signupPage.goto();
    await signupPage.assertOnSignupPage();

    // Act
    await signupPage.fillEmail('existing@example.com');
    await signupPage.fillNameIfPresent('Existing User');

    // Use a non-secret password from env when available; otherwise a deterministic placeholder.
    const password =
      process.env.TEST_PASSWORD ??
      process.env.APP_PASSWORD ??
      'ValidPassword123!';
    await signupPage.fillPassword(password);
    await signupPage.submit();

    // Assert
    await signupPage.assertDuplicateEmailErrorVisible();
    await signupPage.assertOnSignupPage();
    await signupPage.assertNotNavigatedToHome();
    await signupPage.assertUnauthenticated();
  });
});
