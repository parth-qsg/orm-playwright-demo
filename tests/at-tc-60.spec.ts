import { expect, Locator, Page, test } from '@playwright/test';

function getImportedJiraStoryUrl(): string | null {
  const url =
    process.env.IMPORTED_JIRA_STORY_URL ??
    process.env.JIRA_IMPORTED_STORY_URL ??
    process.env.STORY_DETAIL_URL;
  return url ?? null;
}

class QMagicAuthGuardPage {
  constructor(private readonly page: Page) {}

  private get loginHeading(): Locator {
    return this.page.getByRole('heading', { name: /log in|login|sign in|sign-in/i });
  }

  private get loginForm(): Locator {
    return this.page
      .getByRole('form', { name: /log in|login|sign in|sign-in/i })
      .or(this.page.locator('form:has-text("Login")'))
      .or(this.page.locator('form:has-text("Sign in")'));
  }

  private get generateTcsButton(): Locator {
    return this.page
      .getByRole('button', { name: /generate\s*tcs|generate\s*test\s*cases/i })
      .or(this.page.getByRole('link', { name: /generate\s*tcs|generate\s*test\s*cases/i }))
      .or(this.page.getByTestId(/generate.*(tc|test[- ]?case)/i));
  }

  private get storyContentHeading(): Locator {
    return this.page.getByRole('heading', { name: /story|user story|jira story|details/i });
  }

  async clearSession(): Promise<void> {
    await this.page.context().clearCookies();
    await this.page.addInitScript(() => {
      window.sessionStorage.clear();
      window.localStorage.clear();
    });
  }

  async gotoStoryDirect(url: string): Promise<void> {
    await this.page.goto(url, { waitUntil: 'domcontentloaded' });
  }

  async assertUnauthenticatedAccessDenied(): Promise<void> {
    // Accept either:
    // - redirect to login page
    // - an unauthorized/forbidden page
    // - a raw 401/403 response (app may render blank)

    const response = this.page
      .waitForResponse(
        (r) => r.url() === this.page.url() && [401, 403].includes(r.status()),
        { timeout: 5000 },
      )
      .catch(() => null);

    await expect
      .poll(async () => {
        const url = this.page.url();
        const looksLikeLogin = /login|sign[- ]?in|auth/i.test(url);
        const headingVisible = await this.loginHeading.isVisible().catch(() => false);
        const formVisible = await this.loginForm.isVisible().catch(() => false);

        const unauthorizedTextVisible = await this.page
          .getByText(/unauthorized|forbidden|access denied|not authorized/i)
          .first()
          .isVisible()
          .catch(() => false);

        const resp = await response;
        const has401or403 = resp ? [401, 403].includes(resp.status()) : false;

        return looksLikeLogin || headingVisible || formVisible || unauthorizedTextVisible || has401or403;
      })
      .toBeTruthy();
  }

  async assertGenerateTcsNotAccessible(): Promise<void> {
    // Generate TCs should not be visible for unauthenticated users.
    await expect(this.generateTcsButton).toHaveCount(0);

    // Story detail content should not be rendered (best-effort: either no story heading or it is hidden).
    await expect(this.storyContentHeading).toHaveCount(0);
  }
}

test.describe(
  'AT-TC-60 - Unauthenticated users cannot access Generate TCs for imported Jira stories',
  { tag: ['@logout', '@secure'] },
  () => {
    test('Direct navigation to imported Jira story detail denies access when unauthenticated', async ({ page }) => {
      const guard = new QMagicAuthGuardPage(page);
      const storyUrl = getImportedJiraStoryUrl();
      test.skip(
        !storyUrl,
        'Missing imported Jira story detail URL. Set IMPORTED_JIRA_STORY_URL (preferred) or JIRA_IMPORTED_STORY_URL environment variable.',
      );

      // Arrange
      await guard.clearSession();

      // Act
      await guard.gotoStoryDirect(storyUrl);

      // Assert
      await guard.assertUnauthenticatedAccessDenied();
      await guard.assertGenerateTcsNotAccessible();
    });
  },
);
