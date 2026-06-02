import { expect, Locator, Page, test } from '@playwright/test';

function getCredentials(): { username: string; password: string } {
  const username = process.env.TEST_USERNAME ?? process.env.APP_USERNAME;
  const password = process.env.TEST_PASSWORD ?? process.env.APP_PASSWORD;
  if (!username || !password) {
    throw new Error(
      'Missing credentials. Set TEST_USERNAME/TEST_PASSWORD (preferred) or APP_USERNAME/APP_PASSWORD environment variables.',
    );
  }
  return { username, password };
}

function getUserStoryUrl(): string | null {
  return process.env.USER_STORY_URL ?? process.env.STORY_DETAIL_URL ?? process.env.IMPORTED_JIRA_STORY_URL ?? null;
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

  async assertAuthenticatedLanding(): Promise<void> {
    // Best-effort: after login, the login heading should disappear.
    await expect(this.loginHeading).toHaveCount(0);
  }
}

class ConfluenceConnectModal {
  constructor(private readonly page: Page) {}

  private get dialog(): Locator {
    return this.page
      .getByRole('dialog', { name: /connect your confluence space|connect confluence|confluence/i })
      .or(this.page.getByRole('dialog'));
  }

  private get spaceDropdown(): Locator {
    return this.dialog
      .getByRole('combobox', { name: /space|confluence space/i })
      .or(this.dialog.getByLabel(/space|confluence space/i))
      .or(this.dialog.locator('select'));
  }

  private get loadPagesButton(): Locator {
    return this.dialog.getByRole('button', { name: /load pages/i });
  }

  private get cancelButton(): Locator {
    return this.dialog.getByRole('button', { name: /^cancel$/i });
  }

  private get doneButton(): Locator {
    return this.dialog.getByRole('button', { name: /^done$/i });
  }

  private get pagesPanel(): Locator {
    return this.dialog
      .getByRole('region', { name: /pages|confluence pages/i })
      .or(this.dialog.getByText(/pages/i).locator('xpath=ancestor-or-self::*[self::section or self::div][1]'));
  }

  private get pageCheckboxes(): Locator {
    return this.dialog
      .getByRole('checkbox')
      .or(this.dialog.locator('input[type="checkbox"]'));
  }

  async assertOpen(): Promise<void> {
    await expect(this.dialog).toBeVisible();
  }

  async selectSpace(spaceName: string): Promise<void> {
    await expect(this.spaceDropdown).toBeVisible();

    // Prefer selectOption when it's a native <select>, otherwise fall back to click+option.
    const tagName = await this.spaceDropdown.evaluate((el) => el.tagName).catch(() => '');
    if (tagName.toLowerCase() === 'select') {
      await this.spaceDropdown.selectOption({ label: spaceName });
      return;
    }

    await this.spaceDropdown.click();
    await this.page.getByRole('option', { name: new RegExp(spaceName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i') }).click();
  }

  async loadPagesAndAssertLoaded(): Promise<void> {
    await expect(this.loadPagesButton).toBeEnabled();
    await this.loadPagesButton.click();

    // Assert at least one selectable page appears.
    await expect
      .poll(async () => {
        const count = await this.pageCheckboxes.count();
        return count;
      })
      .toBeGreaterThan(0);
  }

  async selectFirstAvailablePages(minCount: number = 1): Promise<string[]> {
    const selected: string[] = [];

    const count = await this.pageCheckboxes.count();
    expect(count, 'Expected at least one page checkbox after loading pages').toBeGreaterThan(0);

    const toSelect = Math.min(Math.max(minCount, 1), count);
    for (let i = 0; i < toSelect; i++) {
      const cb = this.pageCheckboxes.nth(i);

      // Try to capture a stable label for later assertions.
      const labelText = await cb
        .locator('xpath=ancestor-or-self::*[self::label or self::div or self::li][1]')
        .innerText()
        .catch(() => '');

      await cb.check({ force: true });
      selected.push(labelText.trim());
    }

    return selected.filter((t) => t.length > 0);
  }

  async clickCancel(): Promise<void> {
    await expect(this.cancelButton).toBeEnabled();
    await this.cancelButton.click();
  }

  async clickDone(): Promise<void> {
    await expect(this.doneButton).toBeEnabled();
    await this.doneButton.click();
  }

  async assertDismissed(): Promise<void> {
    await expect(this.dialog).toHaveCount(0);
  }
}

class QMagicUserStoryPage {
  constructor(private readonly page: Page) {}

  private get connectConfluenceButton(): Locator {
    return this.page
      .getByRole('button', { name: /connect your confluence space|connect confluence|connect.*confluence/i })
      .or(this.page.getByRole('link', { name: /connect your confluence space|connect confluence|connect.*confluence/i }))
      .or(this.page.getByTestId(/connect.*confluence/i));
  }

  private get connectedConfluenceSection(): Locator {
    return this.page
      .getByRole('region', { name: /confluence|knowledge base|kb/i })
      .or(this.page.getByText(/confluence|knowledge base|kb/i).locator('xpath=ancestor-or-self::*[self::section or self::div][1]'));
  }

  private get connectedPageLinks(): Locator {
    return this.connectedConfluenceSection
      .getByRole('link')
      .or(this.connectedConfluenceSection.locator('a'));
  }

  async gotoDirect(url: string): Promise<void> {
    await this.page.goto(url, { waitUntil: 'domcontentloaded' });
  }

  async openConnectConfluenceModal(): Promise<ConfluenceConnectModal> {
    await expect(this.connectConfluenceButton).toBeVisible();
    await expect(this.connectConfluenceButton).toBeEnabled();
    await this.connectConfluenceButton.click();

    const modal = new ConfluenceConnectModal(this.page);
    await modal.assertOpen();
    return modal;
  }

  async assertOnStoryView(urlBefore?: string): Promise<void> {
    // Deterministic check: we should not be on login page.
    await expect(this.page.getByRole('heading', { name: /log in|login|sign in|sign-in/i })).toHaveCount(0);

    if (urlBefore) {
      await expect(this.page).toHaveURL(urlBefore);
    }

    // Story view should have the connect button available.
    await expect(this.connectConfluenceButton).toBeVisible();
  }

  async assertNoConfluenceConnected(): Promise<void> {
    // Best-effort: either the section is absent, or it contains no page links.
    const sectionVisible = await this.connectedConfluenceSection.isVisible().catch(() => false);
    if (!sectionVisible) {
      await expect(this.connectedConfluenceSection).toHaveCount(0);
      return;
    }

    await expect(this.connectedPageLinks).toHaveCount(0);
    await expect(this.connectedConfluenceSection).toContainText(/no .*connected|not connected|connect/i);
  }

  async assertConfluencePagesConnected(expectedPageNames: string[]): Promise<void> {
    await expect(this.connectedConfluenceSection).toBeVisible();

    // If we captured labels, assert they appear as links/text.
    for (const name of expectedPageNames) {
      if (!name) continue;
      await expect(this.connectedConfluenceSection).toContainText(name, { timeout: 30_000 });
    }

    // At minimum, ensure at least one link exists.
    await expect(this.connectedPageLinks).toHaveCountGreaterThan(0);
  }
}

test.describe('AT-TC-61 - Cancel and Done modal actions for Confluence connection', { tag: ['@functional'] }, () => {
  test('Cancel discards changes; Done saves selected Confluence pages', async ({ page }) => {
    const { username, password } = getCredentials();
    const storyUrl = getUserStoryUrl();

    test.skip(
      !storyUrl,
      'Missing user story URL. Set USER_STORY_URL (preferred) or STORY_DETAIL_URL / IMPORTED_JIRA_STORY_URL environment variable.',
    );

    const loginPage = new QMagicLoginPage(page);
    const storyPage = new QMagicUserStoryPage(page);

    // Arrange
    await loginPage.goto();
    await loginPage.assertDisplayed();

    // Act - login and open story
    await loginPage.login(username, password);
    await loginPage.assertAuthenticatedLanding();

    await storyPage.gotoDirect(storyUrl!);
    const storyUrlBeforeModal = page.url();

    // Assert precondition: no confluence connected
    await storyPage.assertNoConfluenceConnected();

    // Act - open modal, select KB, load pages, select pages, cancel
    const modal1 = await storyPage.openConnectConfluenceModal();
    await modal1.selectSpace('Knowledge Base (KB)');
    await modal1.loadPagesAndAssertLoaded();
    await modal1.selectFirstAvailablePages(1);
    await modal1.clickCancel();

    // Assert - modal dismissed and no changes saved
    await modal1.assertDismissed();
    await storyPage.assertOnStoryView(storyUrlBeforeModal);
    await storyPage.assertNoConfluenceConnected();

    // Act - reopen modal, select KB, load pages, select pages, done
    const modal2 = await storyPage.openConnectConfluenceModal();
    await modal2.selectSpace('Knowledge Base (KB)');
    await modal2.loadPagesAndAssertLoaded();
    const selectedPageNames = await modal2.selectFirstAvailablePages(1);
    await modal2.clickDone();

    // Assert - modal dismissed and pages connected
    await modal2.assertDismissed();
    await storyPage.assertConfluencePagesConnected(selectedPageNames);
  });
});
