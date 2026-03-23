import { test } from '@playwright/test';
import { OrangeHrmLoginPage } from './pages.orangehrm';

test.describe('AJ-TC-6 - Login failure with invalid credentials', () => {
  test('AJ-TC-6 - Attempt login with incorrect password shows invalid credentials error', async ({ page }) => {
    // Arrange
    const loginPage = new OrangeHrmLoginPage(page);
    await page.context().clearCookies();

    await test.step('Open the login page', async () => {
      await loginPage.goto();
      await loginPage.assertOnLoginPage();
    });

    // Act
    await test.step('Enter username Admin and password wrongpass, then click Login', async () => {
      await loginPage.loginExpectingFailure({ username: 'Admin', password: 'wrongpass' });
    });

    // Assert
    await test.step('Observe the error message indicating invalid credentials', async () => {
      await loginPage.assertInvalidCredentialsErrorVisible();
    });
  });
});
