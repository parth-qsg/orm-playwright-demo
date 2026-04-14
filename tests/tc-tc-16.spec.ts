import { test } from '@playwright/test';
import { OrangeHrmLoginPage, type OrangeHrmCredentials } from './pages.orangehrm';

test.describe('TC-TC-16 - Login', () => {
  test('Verify login failure with invalid credentials', async ({ page }) => {
    const loginPage = new OrangeHrmLoginPage(page);

    const usernameFromEnv = process.env.TEST_USERNAME ?? process.env.APP_USERNAME;
    const passwordFromEnv = process.env.TEST_PASSWORD ?? process.env.APP_PASSWORD;

    const invalidCredentials: OrangeHrmCredentials = {
      username: usernameFromEnv ?? 'Admin',
      password: passwordFromEnv ?? 'wrong_password',
    };

    // Arrange
    await loginPage.goto();
    await loginPage.assertOnLoginPage();

    // Act
    await loginPage.loginExpectingFailure(invalidCredentials);

    // Assert
    await loginPage.assertInvalidCredentialsErrorVisible();
    await loginPage.assertOnLoginPage();
  });
});
