import { test } from '@playwright/test';
import { OrangeHrmLoginPage } from './pages.orangehrm';

test.describe('TC-TC-18 - Login validation', () => {
  test('Submitting with blank password shows Required validation and blocks login', async ({ page }) => {
    const loginPage = new OrangeHrmLoginPage(page);

    // Arrange: open login page
    await loginPage.goto();
    await loginPage.assertOnLoginPage();

    // Act: enter username (from environment), leave password blank, submit
    const username = process.env.TEST_USERNAME ?? process.env.APP_USERNAME;
    if (!username) {
      throw new Error('Missing TEST_USERNAME (or APP_USERNAME) environment variable.');
    }

    await loginPage.loginExpectingFailure({ username, password: '' });

    // Assert: password required validation is displayed
    await loginPage.assertPasswordRequiredVisible();
  });
});
