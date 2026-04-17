import { test } from '@playwright/test';

/**
 * TP-TC-27
 * Objective: Story listing loads within acceptable time (<= 2000ms)
 *
 * NOTE:
 * - This repository workspace restricts file access to /workspace/repo/tests only.
 * - No application baseURL or story listing route is discoverable from the accessible subset of the repo.
 * - The test below is written to be environment-driven via STORY_LISTING_URL.
 */

test.describe('TP-TC-27 - Performance - Story listing load time', () => {
  test('Story listing loads within 2000ms', async ({ page }) => {
    // Arrange
    const storyListingUrl = process.env.STORY_LISTING_URL;

    test.skip(
      !storyListingUrl,
      'Missing STORY_LISTING_URL env var (e.g., https://app.example.com/stories). Provide the story listing page URL to enable this performance test.',
    );

    // Act
    const startTime = Date.now();
    const response = await page.goto(storyListingUrl!, { waitUntil: 'domcontentloaded' });
    const durationMs = Date.now() - startTime;

    // Assert
    // Per standards: assertions should live in POM, but no POM can be created/reused because only /tests is accessible
    // and we are forbidden from guessing selectors without being able to inspect the app.
    test.expect(response, 'Story listing page should return a response').toBeTruthy();
    test.expect(response?.ok(), `Story listing page should load successfully; status=${response?.status()}`).toBeTruthy();
    test.expect(durationMs, `Load time should be <= 2000ms (actual: ${durationMs}ms)`).toBeLessThanOrEqual(2000);
  });
});
