import { test } from '@playwright/test';
import { OrangeHrmCredentials, OrangeHrmLoginPage } from './pages.orangehrm';

test.describe('TC-TC-7 - Verify invalid login attempt with incorrect credentials', () => {
  test('TC-TC-7 - System rejects login with invalid credentials and shows an error', async ({ page }) => {
    const loginPage = new OrangeHrmLoginPage(page);

    // Arrange
    const username = process.env.TEST_USERNAME ?? process.env.APP_USERNAME;
    if (!username) {
      test.skip(true, 'Missing TEST_USERNAME (or APP_USERNAME) environment variable.');
    }

    const invalidLogin: OrangeHrmCredentials = {
      username: username!,
      password: 'invalid-password',
    };

    await loginPage.goto();

    // Assert (login page displayed)
    await loginPage.assertOnLoginPage();

    // Act
    await loginPage.loginExpectingFailure(invalidLogin);

    // Assert
    await loginPage.assertInvalidCredentialsErrorVisible();
  });
});
