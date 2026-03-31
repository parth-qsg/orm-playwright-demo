import { test } from '@playwright/test';
import { OrangeHrmAdminSystemUsersPage, OrangeHrmLoginPage } from './pages.orangehrm';

test.describe('AJ-TC-4 - Admin user search is case-insensitive', { tag: '@functional' }, () => {
  test('Search by Username (admin/ADMIN) returns the Admin user', async ({ page }) => {
    const loginPage = new OrangeHrmLoginPage(page);
    const systemUsersPage = new OrangeHrmAdminSystemUsersPage(page);

    const username: string = process.env.TEST_USERNAME ?? process.env.APP_USERNAME ?? '';
    const password: string = process.env.TEST_PASSWORD ?? process.env.APP_PASSWORD ?? '';

    // Arrange
    await loginPage.goto();
    await loginPage.assertOnLoginPage();
    await loginPage.login(username, password);

    // Arrange
    await systemUsersPage.goto();
    await systemUsersPage.assertOnSystemUsersPage();

    // Act
    await systemUsersPage.searchByUsername('admin');

    // Assert
    await systemUsersPage.assertUsernameFilterValue('admin');
    await systemUsersPage.assertRecordFoundCount(1);
    await systemUsersPage.assertExactlyOneUsernameResult('Admin');

    // Act
    await systemUsersPage.clearUsernameSearch();
    await systemUsersPage.searchByUsername('ADMIN');

    // Assert
    await systemUsersPage.assertUsernameFilterValue('ADMIN');
    await systemUsersPage.assertRecordFoundCount(1);
    await systemUsersPage.assertExactlyOneUsernameResult('Admin');
  });
});
