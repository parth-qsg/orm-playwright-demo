import { test } from '@playwright/test';
import { OrangeHrmLoginPage } from './pages.orangehrm';

test.describe('TC-TC-21 - Login - Password field is masked while typing', () => {
  test("Password masking is applied for typing in password field", async ({ page }) => {
    const loginPage = new OrangeHrmLoginPage(page);

    const password = process.env.TEST_PASSWORD ?? process.env.APP_PASSWORD;

    test.skip(!password, 'Missing password: set TEST_PASSWORD (or APP_PASSWORD).');

    // Arrange: Open the login page
    await loginPage.goto();
    await loginPage.assertOnLoginPage();

    // Assert: Verify password field type is 'password'
    await loginPage.assertPasswordInputIsMasked();

    // Act: Type password into the password field
    await loginPage.fillPassword(password);

    // Assert: Verify password field type remains 'password' after typing
    await loginPage.assertPasswordInputIsMasked();
  });
});
