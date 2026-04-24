import { test, expect, type Locator, type Page } from '@playwright/test';

class QMagicLoginPage {
  constructor(private readonly page: Page) {}

  private get emailGroup(): Locator {
    return this.page.getByRole('group', { name: 'Email' });
  }

  private get passwordGroup(): Locator {
    return this.page.getByRole('group', { name: 'Password' });
  }

  private get emailTextbox(): Locator {
    return this.emailGroup.getByRole('textbox');
  }

  private get passwordTextbox(): Locator {
    return this.passwordGroup.getByRole('textbox');
  }

  private get signInButton(): Locator {
    return this.page.getByRole("button", { name: /sign in/i });
  }

  async goto(): Promise<void> {
    await this.page.goto('https://demo.qmagic.ai/login');
  }

  async assertOnLoginPage(): Promise<void> {
    await expect(this.page).toHaveURL(/\/login\/?$/);
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
}

class QMagicDashboardPage {
  constructor(private readonly page: Page) {}

  private get anyButton(): Locator {
    return this.page.getByRole('button').first();
  }

  async assertOnDashboard(): Promise<void> {
    // URL is unknown; assert user is no longer on /login and that the page is interactive.
    await expect(this.page).not.toHaveURL(/\/login\/?$/);
    await expect(this.anyButton).toBeVisible();
    await expect(this.anyButton).toBeEnabled();
  }
}

test.describe('AT-TC-6 - Login - Successful login redirects to dashboard', { tag: ['@functional', '@smoke'] }, () => {
  test('AT-TC-6 - User logs in with valid credentials and accesses the dashboard', async ({ page }) => {
    const loginPage = new QMagicLoginPage(page);
    const dashboardPage = new QMagicDashboardPage(page);

    const username = process.env.TEST_USERNAME ?? process.env.APP_USERNAME;
    const password = process.env.TEST_PASSWORD ?? process.env.APP_PASSWORD;

    test.skip(!username || !password, 'Missing credentials: set TEST_USERNAME/TEST_PASSWORD (or APP_USERNAME/APP_PASSWORD).');

    // Arrange
    await loginPage.goto();
    await loginPage.assertOnLoginPage();

    // Act
    await loginPage.fillEmail(username);
    await loginPage.fillPassword(password);
    await loginPage.clickSignIn();

    // Assert
    await dashboardPage.assertOnDashboard();
  });
});
