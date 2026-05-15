import { expect, Locator, Page, test } from '@playwright/test';

function getCredentials(): { username: string; password: string } {
  const username = process.env.TEST_USERNAME ?? process.env.APP_USERNAME;
  const password = process.env.TEST_PASSWORD ?? process.env.APP_PASSWORD;
  test.skip(
    !username || !password,
    'Missing credentials. Set TEST_USERNAME/TEST_PASSWORD (preferred) or APP_USERNAME/APP_PASSWORD environment variables.',
  );
  return { username: username!, password: password! };
}

class LoginPage {
  constructor(private readonly page: Page) {}

  private get usernameTextbox(): Locator {
    return this.page.getByRole('textbox', { name: /email|username/i });
  }

  private get passwordTextbox(): Locator {
    return this.page.getByRole('textbox', { name: /^password$/i });
  }

  private get loginButton(): Locator {
    return this.page.getByRole('button', { name: /log in|login|sign in/i });
  }

  private get loginHeading(): Locator {
    return this.page.getByRole('heading', { name: /log in|login|sign in/i });
  }

  private get loginForm(): Locator {
    return this.page.getByRole('form').filter({ has: this.loginButton });
  }

  async goto(): Promise<void> {
    await this.page.goto('/login', { waitUntil: 'domcontentloaded' });
  }

  async assertOnLoginPage(): Promise<void> {
    // Some apps redirect to /login, others to /auth/login or /signin.
    await expect(this.page).toHaveURL(/\/(?:auth\/)?(?:login|signin)(?:\?.*)?$/);

    // Be tolerant of different login UIs: heading, form, or just username/password fields.
    await expect(
      this.loginHeading
        .or(this.loginForm)
        .or(this.loginButton)
        .or(this.usernameTextbox)
        .or(this.passwordTextbox),
    ).toBeVisible({ timeout: 20000 });
  }

  async login(username: string, password: string): Promise<void> {
    await expect(this.usernameTextbox).toBeVisible();
    await this.usernameTextbox.fill(username);
    await expect(this.passwordTextbox).toBeVisible();
    await this.passwordTextbox.fill(password);
    await expect(this.loginButton).toBeEnabled();
    await this.loginButton.click();
    await expect(this.page).not.toHaveURL(/\/login(?:\?.*)?$/);
  }

  async assertNoPrefilledCredentials(): Promise<void> {
    // Ensure no previous form data persists on the login page.
    await expect(this.usernameTextbox).toHaveValue('');
    await expect(this.passwordTextbox).toHaveValue('');
  }
}

class ProfileMenu {
  constructor(private readonly page: Page) {}

  private get profileMenuButton(): Locator {
    return this.page
      .getByRole('navigation')
      .getByRole('button', { name: /profile|account|avatar|user|me|settings|menu/i })
      .or(this.page.getByRole('button', { name: /profile|account|avatar|user|me|settings|menu/i }))
      .or(this.page.getByLabel(/profile|account|avatar|user|me|settings|menu/i))
      .first();
  }

  private get logoutItem(): Locator {
    return this.page.getByRole('menuitem', { name: /log out|logout|sign out/i }).or(
      this.page.getByRole('button', { name: /log out|logout|sign out/i }),
    );
  }

  async logout(): Promise<void> {
    await expect(this.profileMenuButton).toBeVisible({ timeout: 20000 });
    await this.profileMenuButton.click();
    await expect(this.logoutItem).toBeVisible({ timeout: 20000 });
    await this.logoutItem.click();
  }
}

class GenericFormPage {
  constructor(private readonly page: Page) {}

  private get form(): Locator {
    return this.page.getByRole('form');
  }

  private get editableField(): Locator {
    // Prefer a user-facing label-based locator; fall back to first visible text input/textarea.
    const labeled = this.page
      .getByRole('textbox', { name: /name|title|description|notes|comment|message|username|email/i })
      .first();

    return labeled.or(this.page.locator('textarea:visible, input[type="text"]:visible, input:not([type]):visible').first());
  }

  private get saveButton(): Locator {
    return this.page.getByRole('button', { name: /save|submit|create|update/i });
  }

  async gotoLikelyForm(): Promise<void> {
    // Try a few common form routes; stop at the first one that appears to contain a form.
    const candidates = ['/form', '/forms', '/profile', '/settings', '/account', '/new', '/create'];

    for (const path of candidates) {
      await this.page.goto(path, { waitUntil: 'domcontentloaded' });
      if (await this.form.count()) return;
      if (await this.editableField.count()) return;
      if (await this.saveButton.count()) return;
    }

    // As a last resort, stay on current page and attempt to find an editable field.
    await expect(this.editableField).toBeVisible({ timeout: 20000 });
  }

  async createUnsavedData(value: string): Promise<void> {
    await expect(this.editableField).toBeVisible({ timeout: 20000 });
    await this.editableField.fill(value);
    await expect(this.editableField).toHaveValue(value);
  }

  async assertFormIsClean(notExpectedValue: string): Promise<void> {
    await expect(this.editableField).toBeVisible({ timeout: 20000 });
    await expect(this.editableField).not.toHaveValue(notExpectedValue);
  }
}

test.describe('AT-TC-46 - Logout discards in-progress or unsaved form data from the session', {
  tag: ['@functional', '@secure'],
}, () => {
  test('Unsaved form data is discarded on logout and no residual data remains after re-login', async ({ page }) => {
    // Arrange
    const { username, password } = getCredentials();
    const loginPage = new LoginPage(page);
    const profileMenu = new ProfileMenu(page);
    const formPage = new GenericFormPage(page);

    const unsavedValue = `unsaved-${Date.now()}`;

    await loginPage.goto();
    await loginPage.assertOnLoginPage();
    await loginPage.login(username, password);

    // Act: navigate to a form and create unsaved data
    await formPage.gotoLikelyForm();
    await formPage.createUnsavedData(unsavedValue);

    // Act: logout
    await profileMenu.logout();

    // Assert: redirected to /login
    await loginPage.assertOnLoginPage();

    // Assert: reload login page and verify no previous form data persists
    await page.reload({ waitUntil: 'domcontentloaded' });
    await loginPage.assertOnLoginPage();
    await loginPage.assertNoPrefilledCredentials();

    // Act: login again and navigate to the form
    await loginPage.login(username, password);
    await formPage.gotoLikelyForm();

    // Assert: form is in a clean state with no unsaved data
    await formPage.assertFormIsClean(unsavedValue);
  });
});
