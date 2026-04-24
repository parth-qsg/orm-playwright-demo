import { test, expect, Locator, Page } from '@playwright/test';
import { OrangeHrmCredentials, OrangeHrmLoginPage as BaseOrangeHrmLoginPage } from './pages.orangehrm';

class OrangeHrmLoginPage extends BaseOrangeHrmLoginPage {
  constructor(page: Page) {
    super(page);
    this.page = page;
  }

  private readonly page: Page;

  private get invalidCredentialsAlertText(): Locator {
    // Confirmed via a11y snapshot + manual attempt: login failure renders role="alert" with text "Invalid credentials".
    return this.page.getByRole('alert');
  }

  async assertInvalidCredentialsErrorHasText(expected: string | RegExp): Promise<void> {
    await expect(this.invalidCredentialsAlertText).toBeVisible();
    await expect(this.invalidCredentialsAlertText).toHaveText(expected);
  }

  async assertUsernameInputAcceptsValue(expectedUsername: string): Promise<void> {
    // Validate input acceptance by checking the field value.
    // Reuse the underlying locator via role/name (consistent with BaseOrangeHrmLoginPage).
    await expect(this.page.getByRole('textbox', { name: 'Username' })).toHaveValue(expectedUsername);
  }

  async assertPasswordInputAcceptsValue(expectedPassword: string): Promise<void> {
    // Password fields typically keep the value accessible to the DOM; we assert the value to confirm acceptance.
    await expect(this.page.getByRole('textbox', { name: 'Password' })).toHaveValue(expectedPassword);
  }

  async attemptLoginExpectingInvalidCredentials(params: OrangeHrmCredentials): Promise<void> {
    await this.loginExpectingFailure(params);
  }
}

test.describe(
  'AT-TC-12 - Verify error message content for invalid password with valid username',
  { tag: ['@functional', '@regression'] },
  () => {
    test('AT-TC-12 - Incorrect password rejects login with explicit error message', async ({ page }) => {
      const loginPage = new OrangeHrmLoginPage(page);

      const validUsername = process.env.TEST_USERNAME ?? process.env.APP_USERNAME;

      test.skip(!validUsername, 'Missing TEST_USERNAME (or APP_USERNAME) environment variable.');

      // Arrange
      await loginPage.goto();
      await loginPage.assertOnLoginPage();

      const invalidPassword = `invalid-${Date.now()}`;

      // Act
      await loginPage.fillUsername(validUsername);
      await loginPage.fillPassword(invalidPassword);
      await loginPage.clickLogin();

      // Assert
      await loginPage.assertOnLoginPage();
      await loginPage.assertUsernameInputAcceptsValue(validUsername);
      await loginPage.assertPasswordInputAcceptsValue(invalidPassword);
      await loginPage.assertInvalidCredentialsErrorHasText(/invalid credentials|incorrect username or password/i);
    });
  },
);
