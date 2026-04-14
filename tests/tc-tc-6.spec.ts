import { test } from '@playwright/test';
import { OrangeHrmLoginPage } from './pages.orangehrm';

test.describe('TC-TC-6 - Validate blank mandatory fields on login page', () => {
  test('TC-TC-6 - Shows required validation for blank username and password', async ({ page }) => {
    const loginPage = new OrangeHrmLoginPage(page);

    // Arrange
    await loginPage.goto();
    await loginPage.assertOnLoginPage();

    // Act
    await loginPage.clickLogin();

    // Assert
    await loginPage.assertUsernameRequiredVisible();
    await loginPage.assertPasswordRequiredVisible();
  });
});
