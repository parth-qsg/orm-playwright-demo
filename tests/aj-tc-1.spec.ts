import { test } from '@playwright/test';
import { OrangeHrmAdminSystemUsersPage, OrangeHrmLoginPage } from './pages.orangehrm';

test.describe('AJ-TC-1 - Admin user search returns exactly one Admin user', () => {
  test('AJ-TC-1 - Search by Username Admin returns exactly one record with username Admin', async ({ page }) => {
    const loginPage = new OrangeHrmLoginPage(page);
    const systemUsersPage = new OrangeHrmAdminSystemUsersPage(page);

    // Arrange: open login page
    await loginPage.goto();
    await loginPage.assertOnLoginPage();

    // Arrange: authenticate as Admin
    await loginPage.login(process.env.ADMIN_USERNAME ?? 'Admin', process.env.ADMIN_PASSWORD ?? 'admin123');

    // Arrange: open Admin > System Users
    // (Navigation click can be flaky due to overlay/pointer interception on the dashboard.)
    await systemUsersPage.goto();
    await systemUsersPage.assertOnSystemUsersPage();

    // Act: search by Username = Admin
    await systemUsersPage.searchByUsername('Admin');

    // Assert: exactly one record returned and it is the Admin username
    await systemUsersPage.assertRecordFoundCount(1);
    await systemUsersPage.assertExactlyOneUsernameResult('Admin');
  });
});
