import { test, expect } from '@playwright/test';
import { LoginPage } from '../pages/login.page';
import { AdminPage } from '../pages/admin.page';

test.describe('User Search Feature', () => {
  test('@new Validate Admin user search in System Users', async ({ page }) => {
    const loginPage = new LoginPage(page);
    const adminPage = new AdminPage(page);

    const adminUsername: string = (process.env.ADMIN_USERNAME as string) ?? 'Admin';
    const adminPassword: string = (process.env.ADMIN_PASSWORD as string) ?? 'admin123';
    const searchUsername: string = 'Admin';

    // Arrange: Navigate to login and authenticate
    await loginPage.goto();
    await loginPage.login(adminUsername, adminPassword);

    // Arrange: Navigate to Admin -> System Users
    await adminPage.navigateToAdmin();
    await adminPage.goToSystemUsers();

    // Act: Enter username and search
    await adminPage.searchUser(searchUsername);

    // Assert: 1 record found and the Username column contains 'Admin'
    await adminPage.assertRecordFoundCount(1);
    await adminPage.assertUsernameInTable(searchUsername);
  });
});
