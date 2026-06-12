import { expect, Locator, Page } from "@playwright/test";

export class InstagramLoginPage {
  readonly page: Page;

  constructor(page: Page) {
    this.page = page;
  }

  private get pageHeading(): Locator {
    return this.page.getByText("Log into Instagram", { exact: true });
  }

  private get usernameInput(): Locator {
    return this.page.getByRole("textbox", {
      name: "Mobile number, username or email",
      exact: true,
    });
  }

  private get passwordInput(): Locator {
    return this.page.getByRole("textbox", { name: "Password", exact: true });
  }

  private get logInButton(): Locator {
    return this.page.getByRole("button", { name: "Log In", exact: true });
  }

  private get invalidCredentialsErrorText(): Locator {
    return this.page.getByText("The login information you entered is incorrect.", {
      exact: true,
    });
  }

  async goto() {
    await this.page.goto("https://www.instagram.com/accounts/login/");
  }

  async assertLoginPageIsDisplayed() {
    await expect(this.pageHeading).toBeVisible();
    await expect(this.usernameInput).toBeVisible();
    await expect(this.passwordInput).toBeVisible();
    await expect(this.logInButton).toBeVisible();
  }

  async attemptLogin(params: { username: string; password: string }) {
    await expect(this.usernameInput).toBeVisible();
    await this.usernameInput.fill(params.username);

    await expect(this.passwordInput).toBeVisible();
    await this.passwordInput.fill(params.password);

    await expect(this.logInButton).toBeEnabled();
    await this.logInButton.click();
  }

  async assertInvalidCredentialsErrorIsDisplayed() {
    await expect(this.invalidCredentialsErrorText).toBeVisible();
  }

  async assertUserRemainsOnLoginPage() {
    await expect(this.page).toHaveURL("https://www.instagram.com/accounts/login/");
    await expect(this.logInButton).toBeVisible();
  }
}
