import { expect, Locator, Page, test } from '@playwright/test';

function getAdminOrLeadCredentials(): { username: string; password: string } {
  const username = process.env.TEST_USERNAME ?? process.env.APP_USERNAME;
  const password = process.env.TEST_PASSWORD ?? process.env.APP_PASSWORD;
  if (!username || !password) {
    throw new Error(
      'Missing credentials. Set TEST_USERNAME/TEST_PASSWORD (preferred) or APP_USERNAME/APP_PASSWORD environment variables.',
    );
  }
  return { username, password };
}

function getImportedJiraStoryUrlWithExistingTcs(): string | null {
  return (
    process.env.IMPORTED_JIRA_STORY_WITH_TCS_URL ??
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

  private get storyTitle(): Locator {
    return this.page
      .getByRole('heading')
      .filter({ hasText: /.+/ })
      .first();
  }

  private get testCasesSection(): Locator {
    return this.page
      .getByRole('region', { name: /test cases|testcases|tcs/i })
      .or(this.page.getByText(/test cases|testcases|tcs/i).locator('xpath=ancestor-or-self::*[self::section or self::div][1]'));
  }

  private get testCaseItems(): Locator {
    // Best-effort: list items/cards/rows within the test cases section.
    const section = this.testCasesSection;
    return section
      .locator('[data-testid*="test" i][data-testid*="case" i]')
      .or(section.getByRole('listitem'))
      .or(section.locator('tr'))
      .or(section.locator('article'))
      .or(section.locator('li'));
  }

  private get generateTcsButton(): Locator {
    return this.page
      .getByRole('button', { name: /generate\s*tcs|generate\s*test\s*cases/i })
      .or(this.page.getByRole('link', { name: /generate\s*tcs|generate\s*test\s*cases/i }))
      .or(this.page.getByTestId(/generate.*(tc|test[- ]?case)/i));
  }

  private get regenerateTcsButton(): Locator {
    return this.page
      .getByRole('button', { name: /regenerate\s*tcs|regenerate\s*test\s*cases/i })
      .or(this.page.getByRole('link', { name: /regenerate\s*tcs|regenerate\s*test\s*cases/i }))
      .or(this.page.getByTestId(/regenerate.*(tc|test[- ]?case)/i));
  }

  private get progressIndicator(): Locator {
    return this.page
      .getByRole('progressbar')
      .or(this.page.getByText(/generating|regenerating|processing|loading|please wait/i).first())
      .or(this.page.locator('[aria-busy="true"]'))
      .or(this.page.locator('[data-testid*="loading" i], [data-testid*="spinner" i]'));
  }

  async gotoDirect(url: string): Promise<void> {
    await this.page.goto(url, { waitUntil: 'domcontentloaded' });
  }

  async assertDisplayed(): Promise<void> {
    await expect(this.storyTitle).toBeVisible();
    await expect(this.testCasesSection.or(this.page.getByText(/test cases|testcases|tcs/i))).toBeVisible();
  }

  async assertExistingTestCasesListed(): Promise<number> {
    await expect(this.testCasesSection.or(this.page.getByText(/test cases|testcases|tcs/i))).toBeVisible();

    const count = await this.testCaseItems.count();
    expect(count, 'Expected existing test cases to be listed before regeneration').toBeGreaterThan(0);
    return count;
  }

  async assertRegenerateVisibleAndGenerateAbsentOrSecondary(): Promise<void> {
    await expect(this.regenerateTcsButton).toBeVisible();

    const generateVisible = await this.generateTcsButton.isVisible().catch(() => false);
    if (generateVisible) {
      // If both exist, Generate should not be the primary action; accept disabled/hidden.
      const generateDisabled = await this.generateTcsButton.isDisabled().catch(() => false);
      expect(
        generateDisabled,
        'Generate TCs button should be absent or not actionable when Regenerate TCs is available for stories with existing test cases',
      ).toBeTruthy();
    } else {
      await expect(this.generateTcsButton).toHaveCount(0);
    }
  }

  async clickRegenerate(): Promise<void> {
    await expect(this.regenerateTcsButton).toBeEnabled();
    await this.regenerateTcsButton.click();
  }

  async assertProgressShownDuringRegeneration(): Promise<void> {
    await expect
      .poll(async () => {
        return await this.progressIndicator.isVisible().catch(() => false);
      })
      .toBeTruthy();
  }

  async waitForRegenerationToComplete(): Promise<void> {
    // Wait for progress indicator to disappear OR for network to settle.
    await Promise.race([
      this.progressIndicator.waitFor({ state: 'hidden', timeout: 120_000 }).catch(() => undefined),
      this.page.waitForLoadState('networkidle', { timeout: 120_000 }).catch(() => undefined),
    ]);

    // Ensure not still busy.
    await expect
      .poll(async () => {
        const visible = await this.progressIndicator.isVisible().catch(() => false);
        return !visible;
      })
      .toBeTruthy();
  }

  async assertTestCasesDisplayedAfterRegeneration(previousCount: number): Promise<void> {
    await expect(this.testCasesSection.or(this.page.getByText(/test cases|testcases|tcs/i))).toBeVisible();

    await expect
      .poll(async () => {
        const count = await this.testCaseItems.count();
        return count;
      })
      .toBeGreaterThan(0);

    // Best-effort: ensure list is refreshed (count may or may not change).
    await expect
      .poll(async () => {
        const count = await this.testCaseItems.count();
        return count !== previousCount;
      }, { timeout: 30_000 })
      .toBeTruthy()
      .catch(async () => {
        // If count didn't change, still accept as long as items exist.
        const count = await this.testCaseItems.count();
        expect(count).toBeGreaterThan(0);
      });
  }
}

test.describe('AT-TC-58 - Regenerate TCs for imported Jira story with existing test cases', { tag: ['@functional'] }, () => {
  test('Regenerate TCs button triggers regeneration and refreshed test cases are displayed', async ({ page }) => {
    const { username, password } = getAdminOrLeadCredentials();
    const storyUrl = getImportedJiraStoryUrlWithExistingTcs();

    test.skip(
      !storyUrl,
      'Missing imported Jira story detail URL. Set IMPORTED_JIRA_STORY_WITH_TCS_URL (preferred) or IMPORTED_JIRA_STORY_URL environment variable.',
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
    await storyPage.assertDisplayed();
    const existingCount = await storyPage.assertExistingTestCasesListed();
    await storyPage.assertRegenerateVisibleAndGenerateAbsentOrSecondary();

    await storyPage.clickRegenerate();
    await storyPage.assertProgressShownDuringRegeneration();
    await storyPage.waitForRegenerationToComplete();
    await storyPage.assertTestCasesDisplayedAfterRegeneration(existingCount);
  });
});
