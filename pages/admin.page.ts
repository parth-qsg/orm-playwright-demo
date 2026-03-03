import { Page, Locator, expect } from "@playwright/test";

export class AdminPage {
  readonly page: Page;

  constructor(page: Page) {
    this.page = page;
  }

  // Locators
  private get adminMenuItem(): Locator {
    return this.page.getByRole("menuitem", { name: "Admin" });
  }

  private get systemUsersTab(): Locator {
    // Under Admin, there is a System Users section
    return this.page.getByRole("link", { name: "System Users" });
  }

  private get usernameInput(): Locator {
    return this.page.getByLabel("Username");
  }

  private get searchButton(): Locator {
    return this.page.getByRole("button", { name: "Search" });
  }

  private get resultsTable(): Locator {
    return this.page.getByRole("table");
  }

  // Actions
  async navigateToAdmin() {
    await this.adminMenuItem.click();
  }

  async goToSystemUsers() {
    await this.systemUsersTab.click();
  }

  async searchUser(username: string) {
    await this.usernameInput.fill(username);
    await this.searchButton.click();
  }

  async assertRecordFoundCount(expected: number) {
    // Find the results and assert the count; simple approach assumes a tbody tr rows count
    const rows = this.resultsTable.locator("tbody tr");
    await expect(rows).toHaveCount(expected);
  }

  async assertUsernameInTable(expectedUsername: string) {
    // Verify at least one row has the username in the Username column
    const rowLocator = this.resultsTable.locator("tbody tr");
    await expect(rowLocator).toContainText(expectedUsername);
  }
}
