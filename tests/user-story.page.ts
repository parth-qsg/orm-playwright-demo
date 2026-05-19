import { expect, Locator, Page } from '@playwright/test';

interface RetryVisibleParams {
  locator: Locator;
  locatorName: string;
}

export class UserStoryCreatePage {
  constructor(private readonly page: Page) {}

  // --- Locators (all as getters) ---

  private get addUserStoryButton(): Locator {
    // Try common accessible names first; fall back to data-testid / common UI labels.
    // Include "Add Story" and generic "New" buttons/links.
    return this.page
      .getByRole('button', { name: /add user story|new story|create story|add story|add|new/i })
      .or(this.page.getByRole('link', { name: /add user story|new story|create story|add story|add|new/i }))
      .or(this.page.getByTestId(/(add|new|create).*(story|user[- ]?story)/i))
      .or(this.page.locator('[data-testid*="story" i]:is(button,a)'))
      .or(this.page.locator('button:has-text("New")'))
      .or(this.page.locator('a:has-text("New")'))
      .or(this.page.locator('button:has-text("New Story")'))
      .or(this.page.locator('button:has-text("Add Story")'))
      .or(this.page.locator('button:has-text("Add User Story")'))
      .or(this.page.locator('a:has-text("New Story")'));
  }

  private get titleTextbox(): Locator {
    return this.page.getByRole('textbox', { name: /^title$/i });
  }

  private get descriptionTextbox(): Locator {
    return this.page.getByRole('textbox', { name: /^description$/i });
  }

  private get acceptanceCriteriaTextbox(): Locator {
    return this.page.getByRole('textbox', { name: /acceptance criteria/i });
  }

  private get saveButton(): Locator {
    return this.page.getByRole('button', { name: /^save$/i });
  }

  private get closeFormButton(): Locator {
    return this.page.getByRole('button', { name: /close|cancel|dismiss/i });
  }

  private get previewRegion(): Locator {
    return this.page.getByRole('region', { name: /preview|live preview/i });
  }

  private get previewTitle(): Locator {
    return this.previewRegion.getByRole('heading').first();
  }

  private get successMessageRegion(): Locator {
    // Generic: a toast/alert/region that announces success.
    return this.page.getByRole('alert').or(this.page.getByRole('status')).first();
  }

  private get validationErrorAlert(): Locator {
    // Generic error container.
    return this.page.getByRole('alert').first();
  }

  private get titleFieldError(): Locator {
    // Prefer field-level error message near the Title input.
    return this.titleTextbox
      .locator('xpath=ancestor-or-self::*[self::div or self::label or self::fieldset][1]')
      .getByText(/invalid|allowed characters|not allowed|special characters|script|xss/i);
  }

  private get createAnotherAction(): Locator {
    return this.page.getByRole('button', { name: /create another/i });
  }

  private get saveAction(): Locator {
    // Some UIs show action buttons inside the success message.
    return this.page.getByRole('button', { name: /^save$/i });
  }

  // --- Navigation / Actions ---

  async goto(): Promise<void> {
    // Requires Playwright config use.baseURL or a prior navigation in a global setup.
    // Best-effort: rely on baseURL root.
    await this.page.goto('/');
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

    throw new Error(
      `Element not found after ${attempts} attempts: ${locatorName}. ` +
        `Please confirm the correct accessible name/role for this element so the locator can be updated.\n` +
        `Last error: ${String(lastError)}`,
    );
  }

  async openAddUserStoryForm(): Promise<void> {
    await this.retryExpectVisible({ locator: this.addUserStoryButton, locatorName: 'Add User Story button' });
    await expect(this.addUserStoryButton).toBeEnabled();
    await this.addUserStoryButton.click();

    await this.retryExpectVisible({ locator: this.titleTextbox, locatorName: 'Title textbox' });
  }

  async fillTitle(title: string): Promise<void> {
    await this.retryExpectVisible({ locator: this.titleTextbox, locatorName: 'Title textbox' });
    await this.titleTextbox.fill(title);
  }

  async clickSave(): Promise<void> {
    await this.retryExpectVisible({ locator: this.saveButton, locatorName: 'Save button' });
    await expect(this.saveButton).toBeEnabled();
    await this.saveButton.click();
  }

  async closeForm(): Promise<void> {
    await this.retryExpectVisible({ locator: this.closeFormButton, locatorName: 'Close/Cancel form button' });
    await expect(this.closeFormButton).toBeEnabled();
    await this.closeFormButton.click();
  }

  // --- Assertions (must remain in POM) ---

  async assertTitleValue(expected: string): Promise<void> {
    await this.retryExpectVisible({ locator: this.titleTextbox, locatorName: 'Title textbox' });
    await expect(this.titleTextbox).toHaveValue(expected);
  }

  async assertPreviewTitle(expected: string): Promise<void> {
    await this.retryExpectVisible({ locator: this.previewRegion, locatorName: 'Preview region' });
    await expect(this.previewRegion).toBeVisible();

    await this.retryExpectVisible({ locator: this.previewTitle, locatorName: 'Preview title (heading)' });
    await expect(this.previewTitle).toContainText(expected);
  }

  async assertDescriptionEmpty(): Promise<void> {
    // If the Description field is not present in this form, this assertion will trigger recovery.
    await this.retryExpectVisible({ locator: this.descriptionTextbox, locatorName: 'Description textbox' });
    await expect(this.descriptionTextbox).toHaveValue('');
  }

  async assertAcceptanceCriteriaEmpty(): Promise<void> {
    await this.retryExpectVisible({ locator: this.acceptanceCriteriaTextbox, locatorName: 'Acceptance Criteria textbox' });
    await expect(this.acceptanceCriteriaTextbox).toHaveValue('');
  }

  async assertSaveSuccessMessageWithActions(): Promise<void> {
    await this.retryExpectVisible({ locator: this.successMessageRegion, locatorName: 'Success message (alert/status)' });
    await expect(this.successMessageRegion).toBeVisible();

    // Expected: message includes actions 'Create another' and 'Save'.
    await this.retryExpectVisible({ locator: this.createAnotherAction, locatorName: 'Create another action' });
    await expect(this.createAnotherAction).toBeVisible();

    await this.retryExpectVisible({ locator: this.saveAction, locatorName: 'Save action (in success message)' });
    await expect(this.saveAction).toBeVisible();
  }

  async assertInvalidTitleValidationError(): Promise<void> {
    // Prefer a field-level error; fall back to a generic alert.
    const fieldError = this.titleFieldError;
    const genericAlert = this.validationErrorAlert;

    await expect
      .poll(async () => {
        const fieldVisible = await fieldError.isVisible().catch(() => false);
        const alertVisible = await genericAlert.isVisible().catch(() => false);
        return fieldVisible || alertVisible;
      })
      .toBeTruthy();

    if (await fieldError.isVisible().catch(() => false)) {
      await expect(fieldError).toBeVisible();
    } else {
      await expect(genericAlert).toBeVisible();
      await expect(genericAlert).toContainText(/invalid|allowed characters|not allowed|special characters|script|xss/i);
    }
  }

  async assertStoryNotCreated(): Promise<void> {
    // If creation succeeded, a success toast/status is typically shown.
    await expect(this.successMessageRegion).not.toBeVisible();

    // Form should still be open (title input visible).
    await this.retryExpectVisible({ locator: this.titleTextbox, locatorName: 'Title textbox' });
    await expect(this.titleTextbox).toBeVisible();
  }
}
