import { test } from '@playwright/test';
import { OrangeHrmLoginPage } from './pages.orangehrm';

class OrangeHrmAdminModulePage {
  constructor(private readonly page: import('@playwright/test').Page) {}

  private get adminSideNavLink() {
    return this.page.getByRole('link', { name: 'Admin' });
  }

  private get topbarNavigation() {
    return this.page.getByRole('navigation', { name: 'Topbar Menu' });
  }

  private get topbarUserManagementItem() {
    return this.topbarNavigation.getByRole('listitem').filter({ hasText: 'User Management' });
  }

  private get topbarConfigureOrConfigurationItem() {
    return this.topbarNavigation.getByRole('listitem').filter({ hasText: /Config(ure|uration)/i });
  }

  async openAdminModuleFromSideNav(): Promise<void> {
    await this.adminSideNavLink.scrollIntoViewIfNeeded();
    await this.adminSideNavLink.focus();
    await this.page.keyboard.press('Enter');
    await this.page.waitForURL(/\/web\/index\.php\/admin\//);
  }

  async assertAdminSideNavVisible(): Promise<void> {
    await test.expect(this.adminSideNavLink).toBeVisible();
    await test.expect(this.adminSideNavLink).toBeEnabled();
  }

  async assertAdminTopbarModulesVisible(): Promise<void> {
    await test.expect(this.topbarNavigation).toBeVisible();
    await test.expect(this.topbarUserManagementItem).toBeVisible();
    await test.expect(this.topbarConfigureOrConfigurationItem).toBeVisible();
  }
}

test.describe(
  'TC-TC-3 - Verify Admin role modules are visible after login',
  { tag: '@smoke' },
  () => {
    test('TC-TC-3 - Admin sees Admin-related modules (User Management, Admin, Configure) after login', async ({ page }) => {
      const loginPage = new OrangeHrmLoginPage(page);
      const adminModulePage = new OrangeHrmAdminModulePage(page);

      // Arrange
      const username = process.env.TEST_USERNAME ?? process.env.APP_USERNAME;
      const password = process.env.TEST_PASSWORD ?? process.env.APP_PASSWORD;
      if (!username || !password) {
        throw new Error('Missing credentials. Set TEST_USERNAME/TEST_PASSWORD (or APP_USERNAME/APP_PASSWORD).');
      }

      await loginPage.goto();
      await loginPage.assertOnLoginPage();

      // Act
      await loginPage.login(username, password);

      // Assert
      await adminModulePage.assertAdminSideNavVisible();
      await adminModulePage.openAdminModuleFromSideNav();
      await adminModulePage.assertAdminTopbarModulesVisible();
    });
  },
);
