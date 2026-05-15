import { expect, test } from '@playwright/test';

/**
 * TestCase ID: fc218e58-9a38-4f6a-a436-8974501bd759
 * TestCase Key: TP-TC-27
 * Objective: Story listing loads within acceptable time (<= 2000ms)
 *
 * Notes:
 * - This is a non-functional (performance) check; keep it deterministic.
 * - The story listing URL is provided via env var to avoid guessing routes.
 */

test.describe('TP-TC-27 - Story listing performance', { tag: ['@tag 1'] }, () => {
  test('Story listing loads within 2000ms', async ({ page }) => {
    // Arrange
    const storyListingUrl = process.env.STORY_LISTING_URL;

    test.skip(
      !storyListingUrl,
      'Missing STORY_LISTING_URL env var (e.g., https://app.example.com/stories). Provide the story listing page URL to enable this performance test.',
    );

    // Act
    const start = performance.now();
    const response = await page.goto(storyListingUrl!, { waitUntil: 'domcontentloaded' });
    const durationMs = performance.now() - start;

    // Assert
    expect(response, 'Story listing page should return a response').toBeTruthy();
    expect(response?.ok(), `Story listing page should load successfully; status=${response?.status()}`).toBeTruthy();
    await expect(page, 'Story listing page should be displayed').toHaveURL(/.+/);
    expect(durationMs, `Load time should be <= 2000ms (actual: ${Math.round(durationMs)}ms)`).toBeLessThanOrEqual(2000);
  });
});
