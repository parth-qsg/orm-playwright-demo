import { test } from '@playwright/test';
import { OrangeHrmLoginPage } from './pages.orangehrm';

test.describe('TC-TC-18 - Validate validation when password is blank', () => {
  test('TC-TC-18 - Submitting login form with empty password shows required validation', async ({ page }) => {
    const loginPage = new OrangeHrmLoginPage(page);

    // Arrange
    await loginPage.goto();
    await loginPage.assertOnLoginPage();

    const username = process.env.TEST_USERNAME ?? process.env.APP_USERNAME;
    if (!username) {
      throw new Error('Missing TEST_USERNAME (or APP_USERNAME) environment variable');
    }

    // Act
    await loginPage.fillUsername(username);
    await loginPage.assertUsernameValue(username);
    await loginPage.assertPasswordCleared();
    await loginPage.clickLogin();

    // Assert
    await loginPage.assertOnLoginPage();
    await loginPage.assertPasswordRequiredVisible();
  });
});
