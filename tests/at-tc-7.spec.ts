import { test, expect, Locator, Page } from '@playwright/test';

class QMagicLoginPage {
  constructor(private readonly page: Page) {}

  private get loginUrl(): string {
    return 'https://demo.qmagic.ai/login';
  }

  private get emailTextbox(): Locator {
    return this.page.getByRole('textbox', { name: 'Email' });
  }

  private get passwordTextbox(): Locator {
    return this.page.getByRole('textbox', { name: 'Password' });
  }

  private get signInButton(): Locator {
    return this.page.getByRole('button', { name: 'Sign In' });
  }

  private get invalidCredentialsAlert(): Locator {
    // App-specific message unknown; keep it user-facing & tolerant.
    // We prefer role-based alerts when available.
    return this.page
      .getByRole('alert')
      .or(this.page.getByText(/invalid credentials|invalid|incorrect|unauthorized/i));
  }

  async goto(): Promise<void> {
    await this.page.goto(this.loginUrl);
  }

  async assertOnLoginPage(): Promise<void> {
    await expect(this.page).toHaveURL(/\/login/);
    await expect(this.emailTextbox).toBeVisible();
    await expect(this.passwordTextbox).toBeVisible();
    await expect(this.signInButton).toBeVisible();
  }

  async fillEmail(email: string): Promise<void> {
    await expect(this.emailTextbox).toBeVisible();
    await expect(this.emailTextbox).toBeEnabled();
    await this.emailTextbox.fill(email);
  }

  async fillPassword(password: string): Promise<void> {
    await expect(this.passwordTextbox).toBeVisible();
    await expect(this.passwordTextbox).toBeEnabled();
    await this.passwordTextbox.fill(password);
  }

  async clickSignIn(): Promise<void> {
    await expect(this.signInButton).toBeVisible();
    await expect(this.signInButton).toBeEnabled();
    await this.signInButton.click();
  }

  async assertInvalidCredentialsErrorVisible(): Promise<void> {
    await expect(this.invalidCredentialsAlert).toBeVisible();
  }
}

test.describe(
  'AT-TC-7 - Verify login fails with invalid password for valid username',
  { tag: ['@functional', '@regression'] },
  () => {
    test('AT-TC-7 - Rejects login and shows invalid credentials error', async ({ page }) => {
      const loginPage = new QMagicLoginPage(page);

      // Arrange
      const validUsername = process.env.TEST_USERNAME ?? process.env.APP_USERNAME;
      if (!validUsername) {
        test.skip(true, 'Missing TEST_USERNAME (or APP_USERNAME) environment variable.');
      }

      const wrongPassword = process.env.TEST_PASSWORD_WRONG ?? process.env.APP_PASSWORD_WRONG;
      if (!wrongPassword) {
        test.skip(true, 'Missing TEST_PASSWORD_WRONG (or APP_PASSWORD_WRONG) environment variable.');
      }

      await loginPage.goto();
      await loginPage.assertOnLoginPage();

      // Act
      await loginPage.fillEmail(validUsername);
      await loginPage.fillPassword(wrongPassword);
      await loginPage.clickSignIn();

      // Assert
      await loginPage.assertOnLoginPage();
      await loginPage.assertInvalidCredentialsErrorVisible();
    });
  },
);
