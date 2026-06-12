import { test, expect } from '@playwright/test';

test.describe('AT-TC-67 - Unauthenticated access protection', { tag: '@secure' }, () => {
  test('@new AT-TC-67 - Unauthenticated users cannot access Confluence space selection popup', async ({ page }) => {
    // Arrange: ensure no active session exists
    await page.context().clearCookies();
    await page.addInitScript(() => {
      window.localStorage.clear();
      window.sessionStorage.clear();
    });

    const userStoryPath: string | undefined = process.env.QMAGIC_USER_STORY_PATH;
    if (!userStoryPath) {
      throw new Error(
        'Missing QM user story path. Set env var QMAGIC_USER_STORY_PATH to the deep-link path for a known projectId/userStoryId (e.g. "/projects/<id>/user-stories/<id>").',
      );
    }

    // Act: navigate directly to the protected user story URL
    await page.goto(userStoryPath);

    // Assert: redirected to login/auth page and protected content is not accessible
    // NOTE: Exact URL and locators must be derived from live QMagic snapshots.
    // In this environment BASE_URL is not configured, so we assert generically that we are not on the requested page.
    await expect(page).not.toHaveURL(userStoryPath);

    // Assert: a login/authentication prompt is displayed (generic, snapshot-derived locators required to harden)
    const loginHeading = page.getByRole('heading', { name: 'Login' });
    const usernameField = page.getByRole('textbox', { name: 'Username' });
    const passwordField = page.getByRole('textbox', { name: 'Password' });

    await expect(loginHeading.or(usernameField).or(passwordField)).toBeVisible();

    // Assert: Confluence space selection popup is not accessible
    // (Placeholder assertion; must be updated after observing the real modal accessible name.)
    await expect(page.getByRole('dialog')).toHaveCount(0);
  });
});
