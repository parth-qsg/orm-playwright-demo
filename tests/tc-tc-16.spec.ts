import { test } from '@playwright/test';
import { OrangeHrmLoginPage, type OrangeHrmCredentials } from './pages.orangehrm';

test.describe('TC-TC-16 - Verify login failure with invalid credentials', () => {
  test('Login - shows invalid credentials error and remains on login page', async ({ page }) => {
    const loginPage = new OrangeHrmLoginPage(page);

    // Arrange
    await loginPage.goto();
    await loginPage.assertOnLoginPage();

    const invalidCredentials: OrangeHrmCredentials = {
      username: process.env.TEST_USERNAME ?? process.env.APP_USERNAME ?? 'Admin',
      password: 'wrong_password',
    };

    // Act
    await loginPage.loginExpectingFailure(invalidCredentials);

    // Assert
    await loginPage.assertInvalidCredentialsErrorVisible();
  });
});
