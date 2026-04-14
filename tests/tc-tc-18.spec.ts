import { test } from '@playwright/test';
import { OrangeHrmLoginPage } from './pages.orangehrm';

test.describe('TC-TC-18: Login - Validation when password is blank', () => {
  test('Submitting login with blank password shows password-required validation and blocks submission', async ({ page }) => {
    const loginPage = new OrangeHrmLoginPage(page);

    // Arrange: Open the login page
    await loginPage.goto();
    await loginPage.assertOnLoginPage();

    const username = process.env.TEST_USERNAME ?? process.env.APP_USERNAME ?? 'Admin';

    // Act: Enter username and leave password blank, then click Login
    await page.getByRole('textbox', { name: 'Username' }).fill(username);
    await loginPage.clickLogin();

    // Assert: Validation for missing password is displayed and login is not submitted
    await loginPage.assertOnLoginPage();
    await loginPage.assertPasswordRequiredVisible();
  });
});
