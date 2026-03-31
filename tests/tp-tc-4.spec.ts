import { test } from '@playwright/test';
import { OrangeHrmLoginPage } from './pages.orangehrm';

test.describe('TP-TC-4 - Login validation', () => {
  test('Password empty validation prevents login and shows specific message', async ({ page }) => {
    const loginPage = new OrangeHrmLoginPage(page);

    // Arrange
    await loginPage.goto();
    await loginPage.assertOnLoginPage();

    // Act
    await loginPage.loginExpectingFailure({ username: 'Admin', password: '' });

    // Assert
    await loginPage.assertPasswordRequiredVisible();
  });
});
