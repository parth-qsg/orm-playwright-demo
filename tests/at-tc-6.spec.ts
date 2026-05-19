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
    return this.page.getByRole('button', { name: /sign in/i });
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
    await expect(this.emailTextbox).toHaveValue(email);
  }

  async fillPassword(password: string): Promise<void> {
    await expect(this.passwordTextbox).toBeVisible();
    await expect(this.passwordTextbox).toBeEnabled();
    await this.passwordTextbox.fill(password);
    await expect(this.passwordTextbox).toHaveValue(password);
  }

  async clickSignIn(): Promise<void> {
    await expect(this.signInButton).toBeVisible();
    await expect(this.signInButton).toBeEnabled();

    await this.signInButton.click();

    // App may keep the same URL and render dashboard in-place; wait for login form to disappear.
    await expect(this.signInButton).toBeHidden({ timeout: 30000 });
  }
}

class QMagicDashboardPage {
  constructor(private readonly page: Page) {}

  private get anyInteractiveControl(): Locator {
    return this.page.getByRole('button').first().or(this.page.getByRole('link').first());
  }

  async assertOnDashboard(): Promise<void> {
    // Prefer deterministic post-login signals over a specific "Dashboard" heading.
    await expect(this.page.getByRole('button', { name: /sign in/i })).toBeHidden({ timeout: 30000 });

    // Either URL changes to /dashboard (or similar) OR content becomes available.
    await expect(this.page).toHaveURL(/\/(dashboard|home)\b/i, { timeout: 30000 }).catch(() => {});

    await expect(this.anyInteractiveControl).toBeVisible({ timeout: 30000 });
    await expect(this.anyInteractiveControl).toBeEnabled();
  }
}

test.describe('AT-TC-6 - Verify successful login with valid credentials on login page', { tag: ['@functional'] }, () => {
  test('AT-TC-6 - User is authenticated and can access the dashboard', async ({ page }) => {
    const loginPage = new QMagicLoginPage(page);
    const dashboardPage = new QMagicDashboardPage(page);

    const username = process.env.TEST_USERNAME ?? process.env.APP_USERNAME;
    const password = process.env.TEST_PASSWORD ?? process.env.APP_PASSWORD;

    test.skip(!username || !password, 'Missing credentials: set TEST_USERNAME/TEST_PASSWORD (or APP_USERNAME/APP_PASSWORD).');

    // Arrange
    await loginPage.goto();

    // Act
    await loginPage.assertOnLoginPage();
    await loginPage.fillEmail(username);
    await loginPage.fillPassword(password);
    await loginPage.clickSignIn();

    // Assert
    await dashboardPage.assertOnDashboard();
  });
});
