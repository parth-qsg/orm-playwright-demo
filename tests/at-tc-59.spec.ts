import { expect, Locator, Page, test } from '@playwright/test';

function getTesterCredentials(): { username: string; password: string } {
  const username = process.env.TEST_USERNAME ?? process.env.APP_USERNAME;
  const password = process.env.TEST_PASSWORD ?? process.env.APP_PASSWORD;
  if (!username || !password) {
    throw new Error(
      'Missing credentials. Set TEST_USERNAME/TEST_PASSWORD (preferred) or APP_USERNAME/APP_PASSWORD environment variables.',
    );
  }
  return { username, password };
}

function getImportedJiraStoryUrl(): string | null {
  return (
    process.env.IMPORTED_JIRA_STORY_URL ??
    process.env.JIRA_IMPORTED_STORY_URL ??
    process.env.STORY_DETAIL_URL ??
    null
  );
}

class QMagicLoginPage {
  constructor(private readonly page: Page) {}

  private get loginHeading(): Locator {
    return this.page.getByRole('heading', { name: /log in|login|sign in|sign-in/i });
  }

  private get usernameField(): Locator {
    return this.page
      .getByLabel(/email|username|user name/i)
      .or(this.page.getByRole('textbox', { name: /email|username|user name/i }));
  }

  private get passwordField(): Locator {
    return this.page
      .getByLabel(/password/i)
      .or(this.page.getByRole('textbox', { name: /password/i }))
      .or(this.page.getByRole('textbox', { name: /passcode/i }));
  }

  private get submitButton(): Locator {
    return this.page.getByRole('button', { name: /log in|login|sign in|sign-in|submit/i });
  }

  async goto(): Promise<void> {
    await this.page.goto('/', { waitUntil: 'domcontentloaded' });
  }

  async assertDisplayed(): Promise<void> {
    await expect(this.loginHeading.or(this.submitButton)).toBeVisible();
  }

  async login(username: string, password: string): Promise<void> {
    await expect(this.usernameField).toBeVisible();
    await this.usernameField.fill(username);

    await expect(this.passwordField).toBeVisible();
    await this.passwordField.fill(password);

    await expect(this.submitButton).toBeEnabled();
    await this.submitButton.click();
  }
}

class QMagicStoryDetailPage {
  constructor(private readonly page: Page) {}

  private get generateTcsButton(): Locator {
    return this.page
      .getByRole('button', { name: /generate\s*tcs|generate\s*test\s*cases/i })
      .or(this.page.getByRole('link', { name: /generate\s*tcs|generate\s*test\s*cases/i }))
      .or(this.page.getByTestId(/generate.*(tc|test[- ]?case)/i));
  }

  private get storyTitle(): Locator {
    return this.page
      .getByRole('heading')
      .filter({ hasText: /.+/ })
      .first();
  }

  private get storyDescription(): Locator {
    return this.page
      .getByText(/description/i)
      .locator('xpath=ancestor-or-self::*[self::section or self::div][1]')
      .or(this.page.getByRole('region', { name: /description/i }));
  }

  private get accessDeniedMessage(): Locator {
    return this.page
      .getByText(/access denied|not authorized|unauthorized|forbidden|permission/i)
      .first();
  }

  async gotoDirect(url: string): Promise<void> {
    await this.page.goto(url, { waitUntil: 'domcontentloaded' });
  }

  async assertStoryDetailDisplayed(): Promise<void> {
    await expect(this.storyTitle).toBeVisible();
    await expect(this.storyDescription.or(this.page.getByText(/description/i))).toBeVisible();
  }

  async assertGenerateTcsRestrictedForTester(): Promise<void> {
    const btn = this.generateTcsButton;

    const isVisible = await btn.isVisible().catch(() => false);
    if (!isVisible) {
      await expect(btn).toHaveCount(0);
      return;
    }

    // If visible, it must be disabled OR clicking must not proceed and should show an auth error.
    const isDisabled = await btn.isDisabled().catch(() => false);
    if (isDisabled) {
      await expect(btn).toBeDisabled();
      return;
    }

    // Visible and appears enabled: attempt click and verify denial/no action.
    await expect(btn).toBeEnabled();

    const urlBefore = this.page.url();
    await btn.click();

    // Accept either an access denied message, or no navigation / no generation flow.
    await expect
      .poll(async () => {
        const denied = await this.accessDeniedMessage.isVisible().catch(() => false);
        const urlUnchanged = this.page.url() === urlBefore;

        // Some apps open a modal; ensure it isn't a generation wizard by checking for common wizard text.
        const generationUiVisible = await this.page
          .getByText(/generating|generation|test cases generated|create test cases|tc generation/i)
          .first()
          .isVisible()
          .catch(() => false);

        return denied || (urlUnchanged && !generationUiVisible);
      })
      .toBeTruthy();
  }
}

test.describe('AT-TC-59 - TESTER cannot Generate TCs for imported Jira story (RBAC)', {
  tag: ['@functional', '@secure'],
}, () => {
  test('Generate TCs action is absent/disabled/denied for TESTER role', async ({ page }) => {
    const { username, password } = getTesterCredentials();
    const storyUrl = getImportedJiraStoryUrl();

    test.skip(
      !storyUrl,
      'Missing imported Jira story detail URL. Set IMPORTED_JIRA_STORY_URL (preferred) or JIRA_IMPORTED_STORY_URL environment variable.',
    );

    const loginPage = new QMagicLoginPage(page);
    const storyPage = new QMagicStoryDetailPage(page);

    // Arrange
    await loginPage.goto();
    await loginPage.assertDisplayed();

    // Act
    await loginPage.login(username, password);
    await storyPage.gotoDirect(storyUrl!);

    // Assert
    await storyPage.assertStoryDetailDisplayed();
    await storyPage.assertGenerateTcsRestrictedForTester();
  });
});
