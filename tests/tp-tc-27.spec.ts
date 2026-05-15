import { expect, test } from '@playwright/test';

/**
 * TestCase ID: fc218e58-9a38-4f6a-a436-8974501bd759
 * TestCase Key: TP-TC-27
 * Priority: Medium
 * Type: Non-functional (performance)
 * Objective: Story listing loads within acceptable time (<= 2000ms)
 */

test.describe('TP-TC-27 - Story listing loads within acceptable time', { tag: ['@tag 1'] }, () => {
  test('Story listing loads within 2000ms', async ({ page }) => {
    // Arrange
    const storyListingUrl = process.env.STORY_LISTING_URL;
    test.skip(
      !storyListingUrl,
      'Missing STORY_LISTING_URL env var (e.g., https://app.example.com/stories). Provide the story listing page URL to enable this performance test.',
    );

    // Act
    const start = Date.now();
    const response = await page.goto(storyListingUrl!, { waitUntil: 'domcontentloaded' });

    // Ensure the page is actually displayed (not just DOMContentLoaded fired early)
    await page.waitForLoadState('networkidle');
    const durationMs = Date.now() - start;

    // Assert
    expect(response, 'Story listing page should return a response').toBeTruthy();
    expect(response?.ok(), `Story listing page should load successfully; status=${response?.status()}`).toBeTruthy();

    // Minimal deterministic display assertion: document is interactive/complete.
    await expect
      .poll(async () => page.evaluate(() => document.readyState))
      .toMatch(/interactive|complete/);

    expect(durationMs, `Load time should be <= 2000ms (actual: ${durationMs}ms)`).toBeLessThanOrEqual(2000);
  });
});
