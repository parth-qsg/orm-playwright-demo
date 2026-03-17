import { test } from '@playwright/test';
import { OrangeHrmLoginPage } from './pages.orangehrm';

test.describe('AJ-TC-6 - Login', () => {
  test('Login failure with invalid credentials shows an error message', async ({ page }) => {
    const loginPage = new OrangeHrmLoginPage(page);

    // Arrange: open login page
    await loginPage.goto();
    await loginPage.assertOnLoginPage();

    // Act: attempt login with invalid credentials
    await loginPage.loginExpectingFailure({ username: 'Admin', password: 'wrongpass' });

    // Assert: error displayed and user remains on login page
    await loginPage.assertInvalidCredentialsErrorVisible();
    await loginPage.assertOnLoginPage();
  });
});
