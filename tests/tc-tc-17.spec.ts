import { test } from '@playwright/test';
import { OrangeHrmLoginPage } from './pages.orangehrm';

test.describe('TC-TC-17 - Login validation', () => {
  test('Submitting with blank username shows Required validation and blocks login', async ({ page }) => {
    const loginPage = new OrangeHrmLoginPage(page);

    // Arrange: open login page
    await loginPage.goto();
    await loginPage.assertOnLoginPage();

    // Arrange: read password from environment (never hardcode credentials)
    const password = process.env.TEST_PASSWORD ?? process.env.APP_PASSWORD;
    if (!password) {
      throw new Error('Missing TEST_PASSWORD (or APP_PASSWORD) environment variable.');
    }

    // Act: ensure username is blank, enter password, submit
    await loginPage.loginExpectingFailure({ username: '', password });

    // Assert: username required validation is displayed
    await loginPage.assertUsernameRequiredVisible();
  });
});
