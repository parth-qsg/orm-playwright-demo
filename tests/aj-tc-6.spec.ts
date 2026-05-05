import { test } from '@playwright/test';
import { OrangeHrmLoginPage, type OrangeHrmCredentials } from './pages.orangehrm';

test.describe('AJ-TC-6 - Login failure with invalid credentials', { tag: '@pass' }, () => {
  test('AJ-TC-6 - Invalid credentials show an error message and user remains unauthenticated', async ({ page }) => {
    const loginPage = new OrangeHrmLoginPage(page);

    const baseUsername = process.env.TEST_USERNAME ?? process.env.APP_USERNAME ?? '';
    const basePassword = process.env.TEST_PASSWORD ?? process.env.APP_PASSWORD ?? '';

    const invalidCredentials: OrangeHrmCredentials = {
      // Use a real username if provided, but always force an invalid password to guarantee auth failure.
      username: baseUsername,
      password: `${basePassword}__invalid`,
    };

    // Arrange
    await page.context().clearCookies();
    await loginPage.goto();
    await loginPage.assertOnLoginPage();

    // Act
    await loginPage.loginExpectingFailure(invalidCredentials);

    // Assert
    await loginPage.assertSecureInvalidCredentialsMessageVisible();
  });
});
