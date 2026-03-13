import { expect, Locator, Page } from '@playwright/test';

export class OrangeHrmLoginPage {
  constructor(private readonly page: Page) {}

  private get usernameTextbox(): Locator {
    return this.page.getByRole('textbox', { name: 'Username' });
  }

  private get passwordTextbox(): Locator {
    return this.page.getByRole('textbox', { name: 'Password' });
  }

  private get loginButton(): Locator {
    return this.page.getByRole('button', { name: 'Login' });
  }

  async goto(): Promise<void> {
    await this.page.goto('https://opensource-demo.orangehrmlive.com/web/index.php/auth/login');
  }

  async login(username: string, password: string): Promise<void> {
    await expect(this.usernameTextbox).toBeVisible();
    await this.usernameTextbox.fill(username);
    await this.passwordTextbox.fill(password);
    await this.loginButton.click();
    await expect(this.page).toHaveURL(/\/web\/index\.php\/dashboard\/index/);
  }
}

export class OrangeHrmAdminSystemUsersPage {
  constructor(private readonly page: Page) {}

  private get adminUrlRegex(): RegExp {
    return /\/web\/index\.php\/admin\/viewSystemUsers/;
  }

  private get filterToggleButton(): Locator {
    // The icon button at the right of the "System Users" header that expands the filter form.
    return this.page.getByRole('button').filter({ hasText: '' }).nth(2);
  }

  private get usernameFilterTextbox(): Locator {
    // After expanding filters, the Username field is exposed as an unnamed textbox.
    // Snapshot confirmed this resolves to the correct field.
    return this.page.locator('label', { hasText: 'Username' }).locator('xpath=following::input[1]');
  }

  private get searchButton(): Locator {
    return this.page.getByRole('button', { name: 'Search' });
  }

  private get recordsFoundText(): Locator {
    return this.page.getByText(/\(\d+\) Record(s)? Found/);
  }

  private get resultsTable(): Locator {
    return this.page.getByRole('table');
  }

  private get usernameColumnCells(): Locator {
    // Each row contains a cell with "Username" label and the value beneath.
    return this.resultsTable.locator('xpath=.//div[normalize-space(.)="Username"]/following-sibling::div');
  }

  async goto(): Promise<void> {
    await this.page.goto('https://opensource-demo.orangehrmlive.com/web/index.php/admin/viewSystemUsers');
    await expect(this.page).toHaveURL(this.adminUrlRegex);
  }

  async expandFilters(): Promise<void> {
    // If already expanded, the username filter textbox should be visible.
    if (await this.usernameFilterTextbox.isVisible().catch(() => false)) return;
    await this.filterToggleButton.click();
    await expect(this.usernameFilterTextbox).toBeVisible();
  }

  async searchByUsername(username: string): Promise<void> {
    await this.expandFilters();
    await this.usernameFilterTextbox.fill(username);
    await this.searchButton.click();
  }

  async assertRecordFoundCount(expected: number): Promise<void> {
    await expect(this.recordsFoundText).toContainText(`(${expected})`);
  }

  async assertExactlyOneUsernameResult(expectedUsername: string): Promise<void> {
    await expect(this.resultsTable).toBeVisible();
    await expect(this.usernameColumnCells).toHaveCount(1);
    await expect(this.usernameColumnCells.first()).toHaveText(expectedUsername);
  }
}
