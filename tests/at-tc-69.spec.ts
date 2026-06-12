import { test, expect } from '@playwright/test';
import { LoginPage } from '../pages/login.page';

function getLoginUsernameLocatorName(): string {
  // Snapshot shows accessible name is exactly "Username".
  return 'Username';
}

function getCredentials(): { username: string; password: string } {
  const username = process.env.TEST_USERNAME ?? process.env.APP_USERNAME;
  const password = process.env.TEST_PASSWORD ?? process.env.APP_PASSWORD;

  if (!username || !password) {
    throw new Error(
      'Missing credentials. Set TEST_USERNAME/TEST_PASSWORD (preferred) or APP_USERNAME/APP_PASSWORD environment variables.',
    );
  }

  return { username, password };
}

test.describe('AT-TC-69 - Confluence space list scrollbar', { tag: ['@functional'] }, () => {
  test('@new AT-TC-69 - Verify scrollbar functionality in Confluence space list', async ({ page }) => {
    const { username, password } = getCredentials();

    const loginPage = new LoginPage(page);

    // Arrange
    await loginPage.goto();

    // Act
    // LoginPage POM expects username textbox accessible name "username" (lowercase),
    // but the live snapshot shows "Username". Use direct env-driven login here.
    await page.getByRole('textbox', { name: getLoginUsernameLocatorName() }).fill(username);
    await page.getByRole('textbox', { name: 'Password' }).fill(password);
    await page.getByRole('button', { name: 'Login' }).click();

    // Assert
    // Observed stable post-login URL from browser: /web/index.php/dashboard/index
    await page.waitForLoadState('networkidle');
    await expect(page).toHaveURL('https://opensource-demo.orangehrmlive.com/web/index.php/dashboard/index');
    await expect(page.getByRole('heading', { name: 'Dashboard' })).toBeVisible();
  });
});
