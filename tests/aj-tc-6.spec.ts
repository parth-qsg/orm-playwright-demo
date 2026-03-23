import { test } from '@playwright/test';
import { OrangeHrmCredentials, OrangeHrmLoginPage } from './pages.orangehrm';

test.describe('AJ-TC-6 - Login failure with invalid credentials', () => {
  test('shows an error message and keeps user unauthenticated', async ({ page }) => {
    const loginPage = new OrangeHrmLoginPage(page);

    // Arrange
    await loginPage.goto();
    await loginPage.assertOnLoginPage();

    const invalidCredentials: OrangeHrmCredentials = {
      username: 'Admin',
      password: 'wrongpass',
    };

    // Act
    await loginPage.loginExpectingFailure(invalidCredentials);

    // Assert
    await loginPage.assertInvalidCredentialsErrorVisible();
  });
});
