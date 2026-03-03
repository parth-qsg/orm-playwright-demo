import { Page, Locator, expect } from "@playwright/test";

export class DashboardPage {
  readonly page: Page;

  constructor(page: Page) {
    this.page = page;
  }

  private get dashboardHeading(): Locator {
    return this.page.getByRole("heading", { name: "Dashboard" });
  }

  private get profilePicture(): Locator {
    return this.page
      .getByRole("banner")
      .getByRole("img", { name: "profile picture" });
  }

  private get logoutMenuItem(): Locator {
    return this.page.getByRole("menuitem", { name: "Logout" });
  }

  async logout() {
    await this.profilePicture.click();
    await this.logoutMenuItem.click();
  }

  async assertDashboardVisible() {
    await expect(this.dashboardHeading).toBeVisible();
  }
}
