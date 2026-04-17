import { test } from '@playwright/test';
import { OrangeHrmLoginPage } from './pages.orangehrm';

test.describe('TC-TC-27 - Password masking is enforced for the login field', () => {
  test('Password field masks input and does not display plaintext characters', async ({ page }) => {
    const loginPage = new OrangeHrmLoginPage(page);

    // Arrange: Open the login URL
    await loginPage.goto();
    await loginPage.assertOnLoginPage();

    // Act: Inspect password input type and enter a password
    await loginPage.assertPasswordInputIsMasked();

    const password: string = process.env.TEST_PASSWORD ?? process.env.APP_PASSWORD ?? 'admin123';
    await loginPage.assertPasswordInputRemainsMaskedAfterTyping(password);

    // Assert: Verify password characters remain masked (type=password)
    await loginPage.assertPasswordInputIsMasked();
  });
});
