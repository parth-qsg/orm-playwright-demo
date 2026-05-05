import { expect, Locator, Page } from '@playwright/test';

export interface SearchPerformanceAssertionParams {
  maxMs: number;
  elapsedMs: number;
}

export interface OrangeHrmCredentials {
  username: string;
  password: string;
}

export class OrangeHrmLoginPage {
  constructor(private readonly page: Page) {}

  private get forgotPasswordText(): Locator {
    return this.page.getByText(/Forgot your password\?/i);
  }

  private get loginUrlRegex(): RegExp {
    return /\/web\/index\.php\/auth\/login/;
  }

  private get loginHeading(): Locator {
    return this.page.getByRole('heading', { name: 'Login' });
  }

  private get usernameTextbox(): Locator {
    return this.page.getByRole('textbox', { name: 'Username' });
  }

  private get passwordTextbox(): Locator {
    return this.page.getByRole('textbox', { name: 'Password' });
  }

  async assertUsernameTextboxVisible(): Promise<void> {
    await expect(this.usernameTextbox).toBeVisible();
  }

  async assertPasswordTextboxVisible(): Promise<void> {
    await expect(this.passwordTextbox).toBeVisible();
  }

  async assertPasswordInputIsMasked(): Promise<void> {
    await expect(this.passwordTextbox).toHaveAttribute('type', 'password');
  }

  async fillPassword(password: string): Promise<void> {
    await expect(this.passwordTextbox).toBeVisible();
    await this.passwordTextbox.fill(password);
  }

  async focusPassword(): Promise<void> {
    await expect(this.passwordTextbox).toBeVisible();
    await expect(this.passwordTextbox).toBeEnabled();
    await this.passwordTextbox.focus();
  }

  async assertPasswordIsFocused(): Promise<void> {
    await expect(this.passwordTextbox).toBeFocused();
  }

  async clearPassword(): Promise<void> {
    await expect(this.passwordTextbox).toBeVisible();
    await this.passwordTextbox.clear();
  }

  async assertPasswordCleared(): Promise<void> {
    await expect(this.passwordTextbox).toHaveValue('');
  }

  async assertPasswordInputRemainsMaskedAfterTyping(samplePassword: string): Promise<void> {
    await this.fillPassword(samplePassword);
    await this.assertPasswordInputIsMasked();
  }

  async fillUsername(username: string): Promise<void> {
    await expect(this.usernameTextbox).toBeVisible();
    await this.usernameTextbox.fill(username);
  }

  async assertForgotPasswordLinkVisible(): Promise<void> {
    await expect(this.forgotPasswordText).toBeVisible();
  }

  private get loginButton(): Locator {
    return this.page.getByRole('button', { name: 'Login' });
  }

  private get forgotYourPasswordText(): Locator {
    // In OrangeHRM demo, this is rendered as a <p> with click handler (not a link).
    return this.page.getByText('Forgot your password?');
  }

  private get invalidCredentialsAlert(): Locator {
    return this.page.getByRole('alert').getByText(/Invalid credentials/i);
  }

  private get usernameRequiredValidationText(): Locator {
    return this.usernameFormGroup.getByText('Required');
  }

  private get passwordRequiredValidationText(): Locator {
    return this.passwordFormGroup.getByText('Required');
  }

  private get usernameFormGroup(): Locator {
    // Scope validation to the Username field container to avoid strict-mode conflicts.
    return this.page.locator('div.oxd-input-group').filter({ has: this.usernameTextbox });
  }

  private get passwordFormGroup(): Locator {
    // Scope validation to the Password field container to avoid strict-mode conflicts.
    return this.page.locator('div.oxd-input-group').filter({ has: this.passwordTextbox });
  }

  async goto(): Promise<void> {
    await this.page.goto(
      process.env.ORANGEHRM_BASE_URL
        ? `${process.env.ORANGEHRM_BASE_URL}/web/index.php/auth/login`
        : 'https://opensource-demo.orangehrmlive.com/web/index.php/auth/login',
    );
  }

  async assertOnLoginPage(): Promise<void> {
    await expect(this.page).toHaveURL(this.loginUrlRegex);
    await expect(this.loginHeading).toBeVisible();
    await expect(this.usernameTextbox).toBeVisible();
    await expect(this.passwordTextbox).toBeVisible();
    await expect(this.loginButton).toBeVisible();
    await expect(this.forgotYourPasswordText).toBeVisible();
  }

  async assertForgotPasswordVisible(): Promise<void> {
    await expect(this.forgotYourPasswordText).toBeVisible();
  }

  async login(username: string, password: string): Promise<void> {
    await expect(this.usernameTextbox).toBeVisible();
    await this.usernameTextbox.fill(username);
    await this.passwordTextbox.fill(password);
    await this.loginButton.click();
    await expect(this.page).toHaveURL(/\/web\/index\.php\/dashboard\/index/);
  }

  async assertRedirectedToLoginFromProtectedPage(): Promise<void> {
    // OrangeHRM redirects unauthenticated users to the login route.
    await this.assertOnLoginPage();
  }

  async loginExpectingFailure({ username, password }: OrangeHrmCredentials): Promise<void> {
    await expect(this.usernameTextbox).toBeVisible();
    await expect(this.passwordTextbox).toBeVisible();
    await expect(this.loginButton).toBeVisible();

    await this.usernameTextbox.fill(username);
    await this.passwordTextbox.fill(password);
    await this.loginButton.click();

    await this.assertOnLoginPage();
  }

  async assertInvalidCredentialsErrorVisible(): Promise<void> {
    await expect(this.invalidCredentialsAlert).toBeVisible();
  }

  async assertSecureInvalidCredentialsMessageVisible(): Promise<void> {
    // Security assertion: error messaging should be generic and not reveal whether username or password was wrong.
    await expect(this.invalidCredentialsAlert).toBeVisible();
    await expect(this.invalidCredentialsAlert).toHaveText(/Invalid credentials/i);
  }

  async clickLogin(): Promise<void> {
    await expect(this.loginButton).toBeVisible();
    await expect(this.loginButton).toBeEnabled();
    await this.loginButton.click();
  }

  async assertUsernameRequiredVisible(): Promise<void> {
    await expect(this.usernameRequiredValidationText).toBeVisible();
    await expect(this.usernameRequiredValidationText).toHaveText('Required');
  }

  async assertPasswordRequiredVisible(): Promise<void> {
    await expect(this.passwordRequiredValidationText).toBeVisible();
    await expect(this.passwordRequiredValidationText).toHaveText('Required');
  }
}

export class OrangeHrmDashboardPage {
  constructor(private readonly page: Page) {}

  private get dashboardUrlRegex(): RegExp {
    return /\/web\/index\.php\/dashboard\/index/;
  }

  private get dashboardHeading(): Locator {
    return this.page.getByRole('heading', { name: 'Dashboard' });
  }

  private get adminSideMenuLink(): Locator {
    return this.page.getByRole('link', { name: 'Admin' });
  }

  async clickAdminMenu(): Promise<void> {
    await expect(this.adminSideMenuLink).toBeVisible();
    await expect(this.adminSideMenuLink).toBeEnabled();

    // The dashboard widgets can occasionally intercept pointer events.
    // Use a forced click to ensure navigation is triggered reliably.
    await this.adminSideMenuLink.click({ force: true });
    await expect(this.page).toHaveURL(/\/web\/index\.php\/admin\/viewSystemUsers/);
  }

  async assertOnDashboardPage(): Promise<void> {
    await expect(this.page).toHaveURL(this.dashboardUrlRegex);
    await expect(this.dashboardHeading).toBeVisible();
  }

  async assertAdminMenuVisible(): Promise<void> {
    await expect(this.adminSideMenuLink).toBeVisible();
    await expect(this.adminSideMenuLink).toBeEnabled();
  }
}

export class OrangeHrmAdminSystemUsersPage {
  constructor(private readonly page: Page) {}

  private get systemUsersHeading(): Locator {
    return this.page.getByRole('heading', { name: 'System Users' });
  }

  private get adminUrlRegex(): RegExp {
    return /\/web\/index\.php\/admin\/viewSystemUsers/;
  }

  private get usernameFilterTextbox(): Locator {
    // System Users filter form: the Username input is present in the filter form.
    // Prefer a user-facing label-based locator, but scope to the filter form to avoid matching hidden inputs.
    return this.filtersForm.locator('label', { hasText: 'Username' }).locator('xpath=following::input[1]');
  }

  private get searchButton(): Locator {
    return this.filtersForm.getByRole('button', { name: 'Search' });
  }

  private get resultsTable(): Locator {
    return this.page.getByRole('table');
  }

  private get filtersForm(): Locator {
    // System Users filter form is the only <form> on the page in the demo.
    // Do not scope by heading (the heading is outside the form), otherwise the locator resolves to 0.
    return this.page.locator('form');
  }

  private get resultsTableRows(): Locator {
    return this.resultsTable.getByRole('row');
  }

  private get firstResultRow(): Locator {
    // OrangeHRM renders the table as a single accessible row per record (no separate header row).
    // So the first row is the first data row.
    return this.resultsTableRows.first();
  }

  private get firstResultUsernameCell(): Locator {
    // The Username value is nested inside the cell as a separate element.
    // Target the cell by its accessible name prefix to avoid relying on column order.
    return this.firstResultRow.getByRole('cell', { name: /Username/i });
  }

  private get firstResultUsernameValue(): Locator {
    // Within the Username cell, the actual username value is the second line.
    return this.firstResultUsernameCell.getByText(/.+/).last();
  }

  private get recordsFoundText(): Locator {
    // Some OrangeHRM builds show "(N) Records Found".
    return this.page.getByText(/\(\d+\) Record(s)? Found/i);
  }

  private get noRecordsFoundTableEmptyStateText(): Locator {
    // OrangeHRM can show "No Records Found" in the table empty state AND as a toast.
    // Use a more specific locator to avoid strict-mode violations.
    return this.page.locator('span').filter({ hasText: 'No Records Found' }).first();
  }

  async goto(): Promise<void> {
    await this.page.goto(
      process.env.ORANGEHRM_BASE_URL
        ? `${process.env.ORANGEHRM_BASE_URL}/web/index.php/admin/viewSystemUsers`
        : 'https://opensource-demo.orangehrmlive.com/web/index.php/admin/viewSystemUsers',
    );
    await expect(this.page).toHaveURL(this.adminUrlRegex);
  }

  async assertOnSystemUsersPage(): Promise<void> {
    await expect(this.page).toHaveURL(this.adminUrlRegex);
    await expect(this.systemUsersHeading).toBeVisible();
  }

  private get filtersToggleButton(): Locator {
    // The filter panel can be collapsed/expanded via an icon-only button.
    // In the accessibility tree it appears as a button named "".
    return this.page.getByRole('button', { name: '' }).first();
  }

  async expandFilters(): Promise<void> {
    // The filter panel can be collapsed by default depending on viewport/state.
    // If the Username filter is not visible, expand the filters panel.
    if (!(await this.usernameFilterTextbox.isVisible())) {
      await expect(this.filtersToggleButton).toBeVisible();
      await expect(this.filtersToggleButton).toBeEnabled();
      await this.filtersToggleButton.click();
    }

    await expect(this.usernameFilterTextbox).toBeVisible();
  }

  async searchByUsername(username: string): Promise<void> {
    await this.expandFilters();
    await this.usernameFilterTextbox.fill(username);
    await this.searchButton.click();
  }

  async clearUsernameSearch(): Promise<void> {
    await this.expandFilters();
    await expect(this.usernameFilterTextbox).toBeVisible();
    await this.usernameFilterTextbox.clear();
  }

  async assertUsernameFilterValue(expected: string): Promise<void> {
    await this.expandFilters();
    await expect(this.usernameFilterTextbox).toHaveValue(expected);
  }

  async assertRecordFoundCount(expected: number): Promise<void> {
    await expect(this.recordsFoundText).toContainText(`(${expected})`);
  }

  async assertNoRecordsFound(): Promise<void> {
    // Prefer asserting the explicit empty-state message.
    await expect(this.noRecordsFoundTableEmptyStateText).toBeVisible();

    // Also assert the results table is effectively empty.
    // (Header rows may not be exposed in the accessibility tree; the rowgroup is present with no rows.)
    await expect(this.resultsTableRows).toHaveCount(0);
  }

  async assertExactlyOneUsernameResult(expectedUsername: string): Promise<void> {
    await expect(this.resultsTable).toBeVisible();
    await expect(this.recordsFoundText).toBeVisible();
    await expect(this.recordsFoundText).toContainText('(1)');

    await expect(this.firstResultUsernameCell).toBeVisible();
    await expect(this.firstResultUsernameValue).toBeVisible();
    await expect(this.firstResultUsernameValue).toHaveText(expectedUsername);
  }

  async waitForResultsToLoad(): Promise<void> {
    // Wait for results summary and first row username to be visible.
    await expect(this.recordsFoundText).toBeVisible();
    await expect(this.firstResultUsernameCell).toBeVisible();
  }

  async assertSearchCompletedWithinMs({ maxMs, elapsedMs }: SearchPerformanceAssertionParams): Promise<void> {
    await this.waitForResultsToLoad();
    expect(elapsedMs).toBeLessThanOrEqual(maxMs);
  }
}
