import { Page, Locator, expect } from "@playwright/test";
import WaitForRequest from "~/utils/WaitForRequest";

export class LoginPage {
  readonly page: Page;

  constructor(page: Page) {
    this.page = page;
  }

  private get usernameInput(): Locator {
    return this.page.getByRole("textbox", { name: "username" });
  }

  private get passwordInput(): Locator {
    return this.page.getByRole("textbox", { name: "Password" });
  }

  private get loginButton(): Locator {
    return this.page.getByRole("button", { name: "Login" });
  }

  private get errorAlert(): Locator {
    return this.page.getByRole("alert");
  }

  async goto() {
    await this.page.goto("/web/index.php/auth/login");
  }

  async login(username: string, password: string) {
    await expect(this.usernameInput).toBeVisible();
    await expect(this.passwordInput).toBeVisible();
    await this.usernameInput.fill(username);
    await this.passwordInput.fill(password);
    await WaitForRequest.waitForDashboardToLoad(this.page, () =>
      this.loginButton.click()
    );
  }

  async assertErrorMessage(message: string) {
    await expect(this.errorAlert).toContainText(message);
  }
}
