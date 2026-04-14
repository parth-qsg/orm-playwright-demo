import { expect, Locator, Page, test } from '@playwright/test';
import { OrangeHrmLoginPage } from './pages.orangehrm';

interface RetryVisibleParams {
  locator: Locator;
  locatorName: string;
}

class OrangeHrmDashboardPage {
  constructor(private readonly page: Page) {}

  // --- Locators (getters only) ---

  private get dashboardHeading(): Locator {
    return this.page.getByRole('heading', { name: 'Dashboard' });
  }

  private get sidepanelNavigation(): Locator {
    return this.page.getByRole('navigation', { name: 'Sidepanel' });
  }

  private get adminSideNavLink(): Locator {
    return this.page.getByRole('link', { name: 'Admin' });
  }

  // --- Helpers ---

  private async retryExpectVisible({ locator, locatorName }: RetryVisibleParams): Promise<void> {
    const attempts = 3; // initial + 2 retries
    let lastError: unknown;

    for (let i = 0; i < attempts; i++) {
      try {
        await expect(locator).toBeVisible();
        return;
      } catch (err) {
        lastError = err;
        await this.page.waitForTimeout(250);
      }
    }

    // Element Recovery Rule: pause and ask for help after 2 retries.
    await this.page.pause();
    throw new Error(
      `Element not found after ${attempts} attempts: ${locatorName}. ` +
        `Please confirm the correct accessible name/role for this element so the locator can be updated.\n` +
        `Last error: ${String(lastError)}`,
    );
  }

  // --- Assertions (all assertions remain in POM) ---

  async assertOnDashboard(): Promise<void> {
    await expect(this.page).toHaveURL(/\/web\/index\.php\/dashboard\/index/);

    await this.retryExpectVisible({ locator: this.dashboardHeading, locatorName: 'Dashboard heading' });
    await this.retryExpectVisible({ locator: this.sidepanelNavigation, locatorName: 'Sidepanel navigation' });
  }

  async assertAdminControlsVisible(): Promise<void> {
    await this.retryExpectVisible({ locator: this.adminSideNavLink, locatorName: 'Admin side navigation link' });
    await expect(this.adminSideNavLink).toBeEnabled();
  }
}

test.describe('TC-TC-8 - Successful login with valid Admin credentials and verify admin access', () => {
  test('TC-TC-8 - Admin user can log in and sees Admin menu/options', async ({ page }) => {
    const loginPage = new OrangeHrmLoginPage(page);
    const dashboardPage = new OrangeHrmDashboardPage(page);

    // Arrange
    const username = process.env.TEST_USERNAME ?? process.env.APP_USERNAME;
    const password = process.env.TEST_PASSWORD ?? process.env.APP_PASSWORD;
    if (!username || !password) {
      throw new Error('Missing credentials. Set TEST_USERNAME/TEST_PASSWORD (or APP_USERNAME/APP_PASSWORD).');
    }

    await test.step('Open the login page', async () => {
      await loginPage.goto();
    });

    await test.step('Verify login page is displayed', async () => {
      await loginPage.assertOnLoginPage();
    });

    // Act
    await test.step('Enter credentials and click Login', async () => {
      await loginPage.login(username, password);
    });

    // Assert
    await test.step('Verify dashboard is displayed', async () => {
      await dashboardPage.assertOnDashboard();
    });

    await test.step('Verify admin menu/options are visible', async () => {
      await dashboardPage.assertAdminControlsVisible();
    });
  });
});
