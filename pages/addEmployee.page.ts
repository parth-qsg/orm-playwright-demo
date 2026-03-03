import { Page, expect, Locator } from "@playwright/test";
import { CreateLoginDetails, EmployeeData } from "../types/employee.types";

export class AddEmployeePage {
  private readonly page: Page;

  constructor(page: Page) {
    this.page = page;
  }

  private get pimLink(): Locator {
    return this.page.getByRole("link", { name: "PIM" });
  }

  private get addEmployeeLink(): Locator {
    return this.page.getByRole("link", { name: "Add Employee" });
  }

  private get firstNameInput(): Locator {
    return this.page.getByRole("textbox", { name: "First Name" });
  }

  private get middleNameInput(): Locator {
    return this.page.getByRole("textbox", { name: "Middle Name" });
  }

  private get lastNameInput(): Locator {
    return this.page.getByRole("textbox", { name: "Last Name" });
  }

  private get chooseFileBtn(): Locator {
    return this.page.getByRole("button", { name: "Choose File" });
  }

  private get saveButton(): Locator {
    return this.page.getByRole("button", { name: "Save" });
  }

  private get employeeIdInput(): Locator {
    return this.page.getByRole("textbox").nth(4);
  }

  private get appContainer(): Locator {
    return this.page.locator("#app");
  }

  private get createLoginDetailsToggle(): Locator {
    return this.page
      .locator("div")
      .filter({ hasText: /^Create Login Details$/ })
      .locator("span");
  }

  private get usernameInput(): Locator {
    return this.page.locator(
      "//label[normalize-space()='Username']/ancestor::div[contains(@class,'oxd-input-group')]//input"
    );
  }

  private get passwordInput(): Locator {
    return this.page.locator('input[type="password"]').first();
  }

  private get confirmPasswordInput(): Locator {
    return this.page.locator('input[type="password"]').nth(1);
  }

  async navigateToAddEmployee(): Promise<void> {
    await this.pimLink.click();
    await this.addEmployeeLink.click();
    await expect(this.appContainer).toContainText("Add Employee");
  }

  async createLoginDetails(createLogin: CreateLoginDetails): Promise<void> {
    await this.createLoginDetailsToggle.click();
    await this.usernameInput.fill(createLogin.username);
    await this.passwordInput.fill(createLogin.password);
    await this.confirmPasswordInput.fill(createLogin.confirmPassword);
  }

  async addEmployee(employeeData: EmployeeData): Promise<void> {
    await this.firstNameInput.fill(employeeData.firstName);
    if (employeeData.middleName) {
      await this.middleNameInput.fill(employeeData.middleName);
    }
    await this.lastNameInput.fill(employeeData.lastName);
    await this.enterEmployeeId(employeeData.employeeId);
    if (employeeData.photoPath) {
      await this.uploadPhoto(employeeData.photoPath);
    }
    if (employeeData.createLogin) {
      await this.createLoginDetails(employeeData.createLogin);
    }
    await this.saveEmployee();
  }

  async uploadPhoto(filePath: string): Promise<void> {
    await this.chooseFileBtn.setInputFiles(filePath);
  }

  async enterEmployeeId(id: string): Promise<void> {
    await this.employeeIdInput.fill(id);
  }

  async saveEmployee(): Promise<void> {
    await this.saveButton.click();
  }

  async assertEmployeeCreated(fullName: string): Promise<void> {
    await expect(this.appContainer).toContainText(fullName);
  }
}
