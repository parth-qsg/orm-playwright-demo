import { expect, Locator, Page, test } from '@playwright/test';

class SignupPage {
  constructor(private readonly page: Page) {}

  private get emailTextbox(): Locator {
    return this.page
      .getByLabel(/email/i)
      .or(this.page.getByPlaceholder(/email/i))
      .or(this.page.getByRole('textbox', { name: /email/i }))
      .or(this.page.locator('input[type="email"], input[name*="email" i], input[id*="email" i]'));
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

  private get homeAuthenticatedMarker(): Locator {
    // Common authenticated markers.
    return this.page
      .getByRole('button', { name: /log out|logout|sign out/i })
      .or(this.page.getByRole('link', { name: /log out|logout|sign out/i }))
      .or(this.page.getByRole('button', { name: /account|profile|user|menu/i }))
      .or(this.page.locator('[data-testid*="avatar" i], [aria-label*="account" i], [aria-label*="profile" i]'));
  }

  async goto(): Promise<void> {
    const baseUrl = process.env.BASE_URL;
    test.skip(!baseUrl, 'Missing BASE_URL environment variable for UI tests.');

    const root = baseUrl.replace(/\/$/, '');

    // Ensure precondition: no user is authenticated.
    await this.page.context().clearCookies();

    const candidates = [`${root}/signup`, `${root}/register`, `${root}/auth/signup`, `${root}/auth/register`];

    for (const url of candidates) {
      await this.page.goto(url, { waitUntil: 'domcontentloaded' });
      // Wait a moment for client-side rendering.
      await this.page.waitForLoadState('networkidle').catch(() => undefined);
      if (await this.emailTextbox.first().isVisible().catch(() => false)) return;
    }

    // If we couldn't find the form, fail with a helpful assertion.
    await expect(this.page.getByRole('heading', { name: /sign up|signup|register|create account/i })).toBeVisible();
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
    if ((await this.nameTextbox.count().catch(() => 0)) > 0) {
      await this.nameTextbox.fill(name);
    }
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
    await expect(this.homeAuthenticatedMarker).toHaveCount(0);

    // Generic unauthenticated assertion: signup/login CTA should still be visible.
    const authCta = this.page.getByRole('link', { name: /log in|login|sign in|sign up|signup/i });
    await expect(authCta.first()).toBeVisible();
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
    await signupPage.fillPassword('ValidPassword123!');
    await signupPage.submit();

    // Assert
    await signupPage.assertDuplicateEmailErrorVisible();
    await signupPage.assertOnSignupPage();
    await signupPage.assertNotNavigatedToHome();
    await signupPage.assertUnauthenticated();
  });
});
