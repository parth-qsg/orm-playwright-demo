import { expect, type Locator, type Page, test } from '@playwright/test';

class QMagicDemoLoginPage {
  readonly page: Page;
  readonly username: Locator;
  readonly password: Locator;
  readonly loginButton: Locator;

  constructor(page: Page) {
    this.page = page;

    this.username = page
      .getByLabel(/user(name)?/i)
      .or(page.getByPlaceholder(/user(name)?/i))
      .or(page.locator('input[name="username"], input#username, input[type="email"], input[autocomplete="username"]'));

    this.password = page
      .getByLabel(/pass(word)?/i)
      .or(page.getByPlaceholder(/pass(word)?/i))
      .or(page.locator('input[name="password"], input#password, input[type="password"], input[autocomplete="current-password"]'));

    this.loginButton = page
      .getByRole('button', { name: /log\s*in|sign\s*in/i })
      .or(page.locator('button[type="submit"], input[type="submit"]'));
  }

  async goto(): Promise<void> {
    await this.page.goto('https://demo.qmagic.ai/', { waitUntil: 'domcontentloaded' });
  }

  async assertLoaded(): Promise<void> {
    await expect(this.username, 'Username field should be visible').toBeVisible();
    await expect(this.password, 'Password field should be visible').toBeVisible();
    await expect(this.loginButton, 'Login button should be visible').toBeVisible();
  }

  async clickLogin(): Promise<void> {
    await this.loginButton.click();
  }

  async assertUsernameRequiredVisible(): Promise<void> {
    // Some apps don't mark the field invalid via HTML5 validity/aria-invalid.
    // Assert via visible validation text near the username field.
    const message = this.page
      .getByText(
        /username\s+(is\s+)?required|user(name)?\s+cannot\s+be\s+empty|enter\s+user(name)?|missing\s+user(name)?/i,
      )
      .first();

    await expect(message, 'Username required validation message should be visible').toBeVisible();
  }

  async assertPasswordRequiredVisible(): Promise<void> {
    const message = this.page
      .getByText(
        /password\s+(is\s+)?required|pass(word)?\s+cannot\s+be\s+empty|enter\s+pass(word)?|missing\s+pass(word)?/i,
      )
      .first();

    await expect(message, 'Password required validation message should be visible').toBeVisible();
  }

  async assertStillOnLoginPage(): Promise<void> {
    await expect(this.page, 'User should remain on login page').toHaveURL(/demo\.qmagic\.ai\/?$/);
    await this.assertLoaded();
  }
}

test.describe('TP-TC-5 - Login validation', () => {
  test('Both username and password empty shows both validation messages', async ({ page }) => {
    const loginPage = new QMagicDemoLoginPage(page);

    // Arrange
    await loginPage.goto();
    await loginPage.assertLoaded();

    // Act
    await loginPage.username.fill('');
    await loginPage.password.fill('');
    await loginPage.clickLogin();

    // Assert
    await loginPage.assertUsernameRequiredVisible();
    await loginPage.assertPasswordRequiredVisible();
    await loginPage.assertStillOnLoginPage();
  });
});
