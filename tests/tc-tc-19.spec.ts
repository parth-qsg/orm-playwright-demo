import { test } from '@playwright/test';
import { OrangeHrmLoginPage } from './pages.orangehrm';

test.describe('TC-TC-19 - Verify password masking on the login page', () => {
  test('TC-TC-19 - Password field masks typed characters and can be cleared', async ({ page }) => {
    const loginPage = new OrangeHrmLoginPage(page);

    // Arrange
    await loginPage.goto();
    await loginPage.assertOnLoginPage();

    // Act
    await loginPage.focusPassword();
    await loginPage.fillPassword('TestPwd123');

    // Assert
    await loginPage.assertPasswordFocused();
    await loginPage.assertPasswordValue('TestPwd123');
    await loginPage.assertPasswordInputIsMasked();

    // Cleanup
    await loginPage.clearPassword();
    await loginPage.assertPasswordCleared();
  });
});
