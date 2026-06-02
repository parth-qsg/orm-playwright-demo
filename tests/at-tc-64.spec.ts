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

const EXPECTED_SPACES: string[] = [
  'Demonstration Space (ds)',
  'Knowledge Base (KB)',
  'FeedWatch Service Desk (FWSD)',
  'VAS Knowledge Base (VKB)',
  'DairyComp Service Desk (DCSD)',
];

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

  private get dropdownSearchbox(): Locator {
    // Many searchable dropdowns render an input with role=combobox or textbox.
    return this.dialog
      .getByRole('textbox', { name: /search/i })
      .or(this.dialog.getByPlaceholder(/search/i))
      .or(this.dialog.locator('input[type="search"]'))
      .or(this.dialog.locator('input[placeholder*="Search" i]'));
  }

  private get dropdownOptions(): Locator {
    // Prefer ARIA options; fall back to list items.
    return this.page.getByRole('option').or(this.page.locator('[role="listbox"] [role="option"]')).or(this.page.locator('li[role="option"], li'));
  }

  private get noResultsIndicator(): Locator {
    return this.dialog
      .getByText(/no results|no matches|nothing found|no spaces found|no space found/i)
      .or(this.page.getByText(/no results|no matches|nothing found|no spaces found|no space found/i));
  }

  async assertOpen(): Promise<void> {
    await expect(this.dialog).toBeVisible();
  }

  async openSpaceDropdown(): Promise<void> {
    await expect(this.spaceDropdown).toBeVisible();
    await this.spaceDropdown.click();

    // Ensure options panel is rendered.
    await expect
      .poll(async () => {
        const count = await this.dropdownOptions.count();
        return count;
      })
      .toBeGreaterThan(0);
  }

  async assertAllSpacesListed(): Promise<void> {
    for (const space of EXPECTED_SPACES) {
      await expect(this.page.getByRole('option', { name: new RegExp(space.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i') })).toBeVisible();
    }
  }

  async typeInSpaceSearch(term: string): Promise<void> {
    const search = this.dropdownSearchbox;
    const visible = await search.isVisible().catch(() => false);
    if (visible) {
      await search.fill(term);
      return;
    }

    // If the combobox itself is the search input.
    await this.spaceDropdown.fill(term);
  }

  async clearSpaceSearch(): Promise<void> {
    const search = this.dropdownSearchbox;
    const visible = await search.isVisible().catch(() => false);
    if (visible) {
      await search.fill('');
      return;
    }

    await this.spaceDropdown.fill('');
  }

  async assertNoSpaceItemsShown(): Promise<void> {
    // Wait for filtering to apply.
    await expect
      .poll(async () => {
        const optionCount = await this.page.getByRole('option').count().catch(() => 0);
        const liCount = await this.page.locator('[role="listbox"] li, [role="listbox"] [role="option"]').count().catch(() => 0);
        return Math.max(optionCount, liCount);
      })
      .toBe(0);
  }

  async assertNoResultsStateShown(): Promise<void> {
    // Accept either explicit message OR an empty listbox.
    await expect
      .poll(async () => {
        const msgVisible = await this.noResultsIndicator.first().isVisible().catch(() => false);
        const listboxVisible = await this.page.getByRole('listbox').isVisible().catch(() => false);
        const optionCount = await this.page.getByRole('option').count().catch(() => 0);
        return msgVisible || (listboxVisible && optionCount === 0);
      })
      .toBeTruthy();

    if (await this.noResultsIndicator.first().isVisible().catch(() => false)) {
      await expect(this.noResultsIndicator.first()).toBeVisible();
    }
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
}

test.describe('AT-TC-64 - Search with no matching results shows empty/no-results state', { tag: ['@functional'] }, () => {
  test('No matching Confluence space search shows no-results state and clearing restores list', async ({ page }) => {
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

    // Act - open modal and dropdown
    const modal = await storyPage.openConnectConfluenceModal();
    await modal.openSpaceDropdown();

    // Assert - all 5 spaces listed
    await modal.assertAllSpacesListed();

    // Act - search for non-existent term
    await modal.typeInSpaceSearch('XYZNONEXISTENT');

    // Assert - no items and no-results state
    await modal.assertNoSpaceItemsShown();
    await modal.assertNoResultsStateShown();

    // Act - clear search
    await modal.clearSpaceSearch();

    // Assert - all 5 spaces listed again
    await modal.assertAllSpacesListed();
  });
});
