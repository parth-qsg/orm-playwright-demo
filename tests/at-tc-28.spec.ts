import { expect, Locator, Page, test } from '@playwright/test';

class SignupPage {
  constructor(private readonly page: Page) {}

  private get emailTextbox(): Locator {
    return this.page
      .getByLabel(/email/i)
      .or(this.page.getByPlaceholder(/email/i))
      .or(this.page.locator('input[type="email"]'));
  }

  private get passwordTextbox(): Locator {
    return this.page
      .getByLabel(/password/i)
      .or(this.page.getByPlaceholder(/password/i))
      .or(this.page.locator('input[type="password"]'));
  }

  private get nameTextbox(): Locator {
    return this.page
      .getByLabel(/name/i)
      .or(this.page.getByPlaceholder(/name/i))
      .or(this.page.getByRole('textbox', { name: /name/i }));
  }

  private get submitButton(): Locator {
    return this.page.getByRole('button', { name: /sign up|signup|create account|register/i });
  }

  private get duplicateEmailError(): Locator {
    // Common duplicate-email messages across apps.
    return this.page.getByText(
      /email (is )?already (registered|in use|taken)|already have an account|duplicate email/i,
    );
  }

  async goto(): Promise<void> {
    const baseUrl = process.env.BASE_URL;
    test.skip(!baseUrl, 'Missing BASE_URL environment variable for UI tests.');

    const root = baseUrl.replace(/\/$/, '');
    await this.page.goto(`${root}/signup`);

    // Some apps use /register instead of /signup.
    if (await this.emailTextbox.count().catch(() => 0)) return;
    await this.page.goto(`${root}/register`);
  }

  async assertOnSignupPage(): Promise<void> {
    await expect(this.emailTextbox).toBeVisible();
    await expect(this.passwordTextbox).toBeVisible();
    await expect(this.submitButton).toBeVisible();
  }

  async fillEmail(email: string): Promise<void> {
    await expect(this.emailTextbox).toBeVisible();
    await this.emailTextbox.fill(email);
  }

  async fillPassword(password: string): Promise<void> {
    await expect(this.passwordTextbox).toBeVisible();
    await this.passwordTextbox.fill(password);
  }

  async fillNameIfPresent(name: string): Promise<void> {
    if (await this.nameTextbox.count()) {
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
