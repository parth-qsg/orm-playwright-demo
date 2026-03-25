import { test } from '@playwright/test';
import { OrangeHrmLoginPage } from './pages.orangehrm';

test.describe('AJ-TC-6 - Login failure with invalid credentials', () => {
  test('AJ-TC-6 - Attempt login with incorrect password shows an invalid credentials error', async ({ page }) => {
    const loginPage = new OrangeHrmLoginPage(page);

    // Arrange: open login page in a clean (unauthenticated) session
    await page.context().clearCookies();
    await loginPage.goto();
    await loginPage.assertOnLoginPage();

    // Act: attempt login with invalid credentials
    await loginPage.loginExpectingFailure({ username: 'Admin', password: 'wrongpass' });

    // Assert: authentication fails and an error message is shown
    await loginPage.assertInvalidCredentialsErrorVisible();
  });
});
