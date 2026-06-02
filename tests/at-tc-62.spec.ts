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

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
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
    await expect(this.loginHeading).toHaveCount(0);
  }
}

class ConfluenceSpaceDropdown {
  constructor(private readonly page: Page, private readonly scope: Locator) {}

  private get listbox(): Locator {
    // Prefer listbox; fall back to common dropdown containers.
    return this.page
      .getByRole('listbox')
      .or(this.page.locator('[role="listbox"]'))
      .or(this.page.locator('[data-testid*="listbox" i]'))
      .or(this.page.locator('[data-testid*="dropdown" i]'));
  }

  private get options(): Locator {
    return this.listbox.getByRole('option').or(this.listbox.locator('[role="option"]'));
  }

  private get searchInput(): Locator {
    return this.listbox
      .getByRole('textbox', { name: /search|filter/i })
      .or(this.listbox.getByPlaceholder(/search|filter/i))
      .or(this.listbox.locator('input[type="text"], input:not([type])').first());
  }

  private get searchIcon(): Locator {
    // Best-effort: common icon patterns.
    return this.listbox
      .locator('[data-icon*="search" i], [aria-label*="search" i], svg[aria-label*="search" i]')
      .first();
  }

  async open(): Promise<void> {
    await expect(this.scope).toBeVisible();
    await expect(this.scope).toBeEnabled();
    await this.scope.click();

    await expect(this.listbox).toBeVisible();
  }

  async assertAllSpacesListed(expectedSpaces: string[]): Promise<void> {
    await expect(this.listbox).toBeVisible();

    for (const space of expectedSpaces) {
      await expect(this.options.filter({ hasText: space })).toHaveCount(1);
    }

    await expect(this.options).toHaveCount(expectedSpaces.length);
  }

  async assertSearchVisibleWithIcon(): Promise<void> {
    await expect(this.searchInput).toBeVisible();

    // Icon may be decorative; assert if present but don't fail if implemented differently.
    const iconCount = await this.searchIcon.count().catch(() => 0);
    expect(iconCount, 'Expected a magnifying glass/search icon in the dropdown panel').toBeGreaterThan(0);
  }

  async typeSearch(value: string): Promise<void> {
    await expect(this.searchInput).toBeVisible();
    await this.searchInput.fill(value);
  }

  async clearSearch(): Promise<void> {
    await expect(this.searchInput).toBeVisible();
    await this.searchInput.fill('');
  }

  async assertOnlySpacesVisible(visibleSpaces: string[], hiddenSpaces: string[]): Promise<void> {
    await expect(this.listbox).toBeVisible();

    // Real-time filtering: poll until the visible set matches.
    await expect
      .poll(async () => {
        const texts = (await this.options.allInnerTexts()).map((t) => t.trim()).filter(Boolean);
        return texts;
      })
      .toEqual(visibleSpaces);

    for (const hidden of hiddenSpaces) {
      await expect(this.options.filter({ hasText: hidden })).toHaveCount(0);
    }
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
      .getByRole('combobox', { name: /select space|space|confluence space/i })
      .or(this.dialog.getByLabel(/select space|space|confluence space/i))
      .or(this.dialog.locator('select'));
  }

  async assertOpen(): Promise<void> {
    await expect(this.dialog).toBeVisible();
    await expect(this.spaceDropdown).toBeVisible();
  }

  async openSpaceDropdown(): Promise<ConfluenceSpaceDropdown> {
    const dropdown = new ConfluenceSpaceDropdown(this.page, this.spaceDropdown);
    await dropdown.open();
    return dropdown;
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

  async assertAuthenticatedLandingState(): Promise<void> {
    await expect(this.page.getByRole('heading', { name: /log in|login|sign in|sign-in/i })).toHaveCount(0);
    await expect(this.connectConfluenceButton).toBeVisible();
  }
}

test.describe('AT-TC-62 - Confluence space dropdown search filters spaces in real time', { tag: ['@functional'] }, () => {
  test('Search input is present and filters Confluence spaces by name in real time', async ({ page }) => {
    const { username, password } = getCredentials();
    const storyUrl = getUserStoryUrl();

    test.skip(
      !storyUrl,
      'Missing user story URL. Set USER_STORY_URL (preferred) or STORY_DETAIL_URL / IMPORTED_JIRA_STORY_URL environment variable.',
    );

    const loginPage = new QMagicLoginPage(page);
    const storyPage = new QMagicUserStoryPage(page);

    const allSpaces = [
      'Demonstration Space (ds)',
      'Knowledge Base (KB)',
      'FeedWatch Service Desk (FWSD)',
      'VAS Knowledge Base (VKB)',
      'DairyComp Service Desk (DCSD)',
    ];

    // Arrange
    await loginPage.goto();
    await loginPage.assertDisplayed();

    // Act
    await loginPage.login(username, password);
    await loginPage.assertAuthenticatedLanding();

    await storyPage.gotoDirect(storyUrl!);
    await storyPage.assertAuthenticatedLandingState();

    const modal = await storyPage.openConnectConfluenceModal();

    // Assert - modal open with Select Space dropdown
    const dropdown = await modal.openSpaceDropdown();

    // Assert - dropdown panel opens and all 5 spaces are listed
    await dropdown.assertAllSpacesListed(allSpaces);

    // Assert - search input visible with magnifying glass icon
    await dropdown.assertSearchVisibleWithIcon();

    // Act - type Knowledge
    await dropdown.typeSearch('Knowledge');

    // Assert - list filters in real time
    const visible = ['Knowledge Base (KB)', 'VAS Knowledge Base (VKB)'];
    const hidden = ['Demonstration Space (ds)', 'FeedWatch Service Desk (FWSD)', 'DairyComp Service Desk (DCSD)'];

    // Some UIs keep original ordering; assert exact visible list in that order.
    await dropdown.assertOnlySpacesVisible(visible, hidden);

    // Act - clear search
    await dropdown.clearSearch();

    // Assert - all spaces return
    await expect
      .poll(async () => {
        const listbox = page.getByRole('listbox').or(page.locator('[role="listbox"]'));
        const options = listbox.getByRole('option').or(listbox.locator('[role="option"]'));
        const texts = (await options.allInnerTexts()).map((t) => t.trim()).filter(Boolean);
        return texts;
      })
      .toEqual(allSpaces);

    // Extra guard: ensure each space is present again.
    for (const space of allSpaces) {
      await expect(page.getByRole('option', { name: new RegExp(`^${escapeRegExp(space)}$`, 'i') })).toBeVisible();
    }
  });
});
