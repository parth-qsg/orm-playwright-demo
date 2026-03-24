import { test } from '@playwright/test';
import { OrangeHrmLoginPage } from './pages.orangehrm';

test.describe('AJ-TC-6 - Login failure with invalid credentials', () => {
  test('Invalid password shows "Invalid credentials" error and user remains on login page', async ({ page }) => {
    // Arrange
    const loginPage = new OrangeHrmLoginPage(page);

    await page.context().clearCookies();
    await loginPage.goto();
    await loginPage.assertOnLoginPage();

    // Act
    await loginPage.loginExpectingFailure({ username: 'Admin', password: 'wrongpass' });

    // Assert
    await loginPage.assertInvalidCredentialsErrorVisible();
  });
});
