import { test } from '@playwright/test';
import { OrangeHrmLoginPage } from './pages.orangehrm';

test.describe('Login validation', () => {
  test('TC-TC-26 - Validation prevents login when password is blank', async ({ page }) => {
    const loginPage = new OrangeHrmLoginPage(page);

    // Arrange: open login page
    await loginPage.goto();
    await loginPage.assertOnLoginPage();

    const username = process.env.TEST_USERNAME ?? process.env.APP_USERNAME;
    if (!username) {
      throw new Error('Missing username env var. Set TEST_USERNAME or APP_USERNAME.');
    }

    // Act: fill only username and attempt login
    await loginPage.fillUsername(username);
    await loginPage.clearPassword();
    await loginPage.clickLogin();

    // Assert: required validation is shown and user stays on login page
    await loginPage.assertPasswordRequiredVisible();
    await loginPage.assertOnLoginPage();
  });
});
