import { expect, Locator, Page, test } from '@playwright/test';

interface RetryVisibleParams {
  locator: Locator;
  locatorName: string;
}

class OrangeHrmProtectedRouteGuard {
  constructor(private readonly page: Page) {}

  // --- Locators (getters only) ---

  private get loginHeading(): Locator {
    return this.page.getByRole('heading', { name: 'Login' });
  }

  private get usernameTextbox(): Locator {
    return this.page.getByRole('textbox', { name: 'Username' });
  }

  private get passwordTextbox(): Locator {
    return this.page.getByRole('textbox', { name: 'Password' });
  }

  private get loginButton(): Locator {
    return this.page.getByRole('button', { name: 'Login' });
  }

  // --- Helpers ---

  private get loginUrlRegex(): RegExp {
    return /\/web\/index\.php\/auth\/login/;
  }

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

  // --- Actions ---

  async gotoProtectedDashboardDirectly(): Promise<void> {
    const baseUrl = process.env.ORANGEHRM_BASE_URL ?? 'https://opensource-demo.orangehrmlive.com';
    await this.page.goto(`${baseUrl}/web/index.php/dashboard/index`);
  }

  async gotoProtectedAdminSystemUsersDirectly(): Promise<void> {
    const baseUrl = process.env.ORANGEHRM_BASE_URL ?? 'https://opensource-demo.orangehrmlive.com';
    await this.page.goto(`${baseUrl}/web/index.php/admin/viewSystemUsers`);
  }

  // --- Assertions (all assertions in POM) ---

  async assertRedirectedToLoginPage(): Promise<void> {
    await expect(this.page).toHaveURL(this.loginUrlRegex);

    await this.retryExpectVisible({ locator: this.loginHeading, locatorName: 'Login heading' });
    await this.retryExpectVisible({ locator: this.usernameTextbox, locatorName: 'Username textbox' });
    await this.retryExpectVisible({ locator: this.passwordTextbox, locatorName: 'Password textbox' });
    await this.retryExpectVisible({ locator: this.loginButton, locatorName: 'Login button' });

    await expect(this.loginButton).toBeEnabled();
  }
}

test.describe('TC-TC-4 - Verify unauthenticated access is redirected to login', () => {
  test('TC-TC-4 - Unauthenticated user is redirected to Login when accessing protected pages directly', async ({ context, page }) => {
    const routeGuard = new OrangeHrmProtectedRouteGuard(page);

    // Arrange
    await context.clearCookies();

    // Act
    await test.step('Open the restricted dashboard URL without logging in', async () => {
      await routeGuard.gotoProtectedDashboardDirectly();
    });

    // Assert
    await test.step('Observe redirect to the login page', async () => {
      await routeGuard.assertRedirectedToLoginPage();
    });

    // Act
    await test.step('Attempt to access a protected page directly (Admin -> System Users)', async () => {
      await routeGuard.gotoProtectedAdminSystemUsersDirectly();
    });

    // Assert
    await test.step('Observe redirect to the login page again', async () => {
      await routeGuard.assertRedirectedToLoginPage();
    });
  });
});
