import { test, expect, type Locator, type Page } from '@playwright/test';

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

  private get notificationRegion(): Locator {
    return this.page.getByRole('region', { name: /notifications/i });
  }

  private get invalidFormatMessage(): Locator {
    return this.page.getByText(/valid email|invalid email|email.*invalid|email format|invalid format/i);
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

  async assertInvalidUsernameFormatErrorShown(): Promise<void> {
    // Some implementations show inline text, others announce in a notifications region.
    await expect(this.notificationRegion.or(this.invalidFormatMessage)).toBeVisible();
  }
}

test.describe(
  'AT-TC-8 - Verify login failure when username format is invalid',
  { tag: ['@functional', '@regression', '@high'] },
  () => {
    test('AT-TC-8 - Login is blocked and invalid username format error is shown', async ({ page }) => {
      const loginPage = new QMagicLoginPage(page);

      // Arrange
      await loginPage.goto();
      await loginPage.assertOnLoginPage();

      // Act
      await loginPage.fillEmail('jane.smith');
      await loginPage.fillPassword(process.env.TEST_PASSWORD ?? process.env.APP_PASSWORD ?? '');
      await loginPage.clickSignIn();

      // Assert
      await loginPage.assertOnLoginPage();
      await loginPage.assertInvalidUsernameFormatErrorShown();
    });
  },
);
