import { test } from '@playwright/test';
import { OrangeHrmLoginPage } from './pages.orangehrm';

test.describe('Authentication - Login failures', () => {
  test('AJ-TC-6 - Login failure with invalid credentials shows an error message', async ({ page }) => {
    const loginPage = new OrangeHrmLoginPage(page);

    // Arrange: Open the login page
    await loginPage.goto();
    await loginPage.assertOnLoginPage();

    // Act: Attempt login with an invalid password
    await loginPage.loginExpectingFailure({ username: 'Admin', password: 'wrongpass' });

    // Assert: Error message is shown and user remains unauthenticated
    await loginPage.assertInvalidCredentialsErrorVisible();
  });
});
