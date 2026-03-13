import { test } from '@playwright/test';
import { OrangeHrmAdminSystemUsersPage, OrangeHrmLoginPage } from './pages.orangehrm';

test.describe('Admin - System Users', () => {
  test('@new User search is working', async ({ page }) => {
    const loginPage = new OrangeHrmLoginPage(page);
    const systemUsersPage = new OrangeHrmAdminSystemUsersPage(page);

    // Arrange
    await loginPage.goto();
    await loginPage.login(process.env.ADMIN_USERNAME ?? 'Admin', process.env.ADMIN_PASSWORD ?? 'admin123');

    // Act
    await systemUsersPage.goto();
    await systemUsersPage.searchByUsername('Admin');

    // Assert
    await systemUsersPage.assertRecordFoundCount(1);
    await systemUsersPage.assertExactlyOneUsernameResult('Admin');
  });
});
