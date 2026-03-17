import { test } from '@playwright/test';
import { OrangeHrmLoginPage } from './pages.orangehrm';

test.describe('AJ-TC-6 - Login', () => {
  test('Login failure with invalid credentials shows an error message', async ({ page }) => {
    const loginPage = new OrangeHrmLoginPage(page);

    // Arrange
    await loginPage.goto();
    await loginPage.assertOnLoginPage();

    // Act
    await loginPage.loginExpectingFailure({ username: 'Admin', password: 'wrongpass' });

    // Assert
    await loginPage.assertInvalidCredentialsErrorVisible();
    await loginPage.assertOnLoginPage();
  });
});
