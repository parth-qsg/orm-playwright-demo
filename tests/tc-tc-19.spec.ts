import { test } from '@playwright/test';
import { OrangeHrmLoginPage } from './pages.orangehrm';

test.describe('TC-TC-19 - Verify password masking on the login page', () => {
  test('TC-TC-19 - Password field masks characters while typing', async ({ page }) => {
    const loginPage = new OrangeHrmLoginPage(page);

    // Arrange
    await loginPage.goto();
    await loginPage.assertOnLoginPage();

    // Act
    await loginPage.assertPasswordInputRemainsMaskedAfterTyping('TestPwd123');
    await loginPage.fillPassword('');

    // Assert
    await loginPage.assertPasswordInputIsMasked();
  });
});
