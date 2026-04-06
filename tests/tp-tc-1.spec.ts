import { test } from '@playwright/test';
import { OrangeHrmLoginPage } from './pages.orangehrm';

test.describe('TP-TC-1 - Login', () => {
  test('Successful login with case-insensitive credentials redirects to Dashboard', async ({ page }) => {
    const loginPage = new OrangeHrmLoginPage(page);

    // Arrange
    const baseUsername = process.env.TEST_USERNAME ?? process.env.APP_USERNAME;
    const basePassword = process.env.TEST_PASSWORD ?? process.env.APP_PASSWORD;

    if (!baseUsername || !basePassword) {
      test.skip(true, 'Missing credentials: set TEST_USERNAME/TEST_PASSWORD (or APP_USERNAME/APP_PASSWORD).');
    }

    const mixedCaseUsername = baseUsername
      .toUpperCase()
      .replace(/([A-Z])/g, (match, _p1, offset) => (offset % 2 === 0 ? match : match.toLowerCase()));

    const mixedCasePassword = basePassword
      .toUpperCase()
      .replace(/([A-Z])/g, (match, _p1, offset) => (offset % 2 === 0 ? match : match.toLowerCase()));

    await loginPage.goto();
    await loginPage.assertOnLoginPage();

    // Act
    await loginPage.login(mixedCaseUsername, mixedCasePassword);

    // Assert
    // (Assertion is encapsulated in OrangeHrmLoginPage.login via URL check to the Dashboard.)
  });
});
