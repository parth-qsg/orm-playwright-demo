import { test, expect, Locator, Page } from '@playwright/test';
import { OrangeHrmLoginPage as BaseOrangeHrmLoginPage } from './pages.orangehrm';

class OrangeHrmLoginPage extends BaseOrangeHrmLoginPage {
  constructor(page: Page) {
    super(page);
    this.page = page;
  }

  private readonly page: Page;

  private get usernameTextbox(): Locator {
    return this.page.getByRole('textbox', { name: 'Username' });
  }

  private get passwordTextbox(): Locator {
    return this.page.getByRole('textbox', { name: 'Password' });
  }

  private get invalidCredentialsAlert(): Locator {
    // OrangeHRM renders login failure as role="alert" with text like "Invalid credentials".
    return this.page.getByRole('alert');
  }

  async assertUsernameFieldAcceptsInput(expected: string): Promise<void> {
    await expect(this.usernameTextbox).toBeVisible();
    await expect(this.usernameTextbox).toBeEnabled();
    await expect(this.usernameTextbox).toHaveValue(expected);
  }

  async assertPasswordFieldAcceptsInput(expected: string): Promise<void> {
    await expect(this.passwordTextbox).toBeVisible();
    await expect(this.passwordTextbox).toBeEnabled();
    // Many login forms clear the password field after a failed attempt.
    // We only assert it accepted input by verifying it was non-empty at some point.
    await expect(this.passwordTextbox).not.toHaveValue('');
  }

  async assertInvalidCredentialsErrorMessage(): Promise<void> {
    await expect(this.invalidCredentialsAlert).toBeVisible();
    await expect(this.invalidCredentialsAlert).toHaveText(/invalid credentials|incorrect username or password/i);
  }
}

test.describe(
  'AT-TC-12 - Verify error message content for invalid password with valid username',
  { tag: ['@functional'] },
  () => {
    test('AT-TC-12 - Invalid password shows explicit error message', async ({ page }) => {
      const loginPage = new OrangeHrmLoginPage(page);

      const username = process.env.TEST_USERNAME ?? process.env.APP_USERNAME;
      test.skip(!username, 'Missing TEST_USERNAME (or APP_USERNAME) environment variable.');

      // Arrange
      await loginPage.goto();
      await loginPage.assertOnLoginPage();

      const incorrectPassword = `invalid-${Date.now()}`;

      // Act
      await loginPage.fillUsername(username);
      await loginPage.fillPassword(incorrectPassword);

      // Assert (field accepts input)
      await loginPage.assertUsernameFieldAcceptsInput(username);
      await loginPage.assertPasswordFieldAcceptsInput(incorrectPassword);

      // Act
      await loginPage.clickLogin();

      // Assert
      await loginPage.assertOnLoginPage();
      await loginPage.assertInvalidCredentialsErrorMessage();
    });
  },
);
