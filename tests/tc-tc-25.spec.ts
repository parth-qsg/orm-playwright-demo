import { test } from '@playwright/test';
import { OrangeHrmLoginPage } from './pages.orangehrm';

test.describe('TC-TC-25 - Login - Validation prevents login when username is blank', () => {
  test('TC-TC-25 - Leave Username empty blocks login and shows required validation', async ({ page }) => {
    const loginPage = new OrangeHrmLoginPage(page);

    const password = process.env.TEST_PASSWORD ?? process.env.APP_PASSWORD;
    test.skip(!password, 'Missing password: set TEST_PASSWORD (or APP_PASSWORD).');

    // Arrange: Open login page and verify UI is present
    await loginPage.goto();
    await loginPage.assertOnLoginPage();

    // Act: Leave Username blank, provide Password, and attempt login
    await loginPage.fillUsername('');
    await loginPage.fillPassword(password);
    await loginPage.clickLogin();

    // Assert: Username required validation is shown and user remains on login page
    await loginPage.assertUsernameRequiredVisible();
    await loginPage.assertOnLoginPage();
  });
});
