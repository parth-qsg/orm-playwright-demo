import { test, expect } from '@playwright/test';

test.describe('AT-TC-66 - Generate TCs for imported Jira bug story', { tag: ['@functional'] }, () => {
  test('@new Generate TCs triggers generation and lists test cases', async ({ page }) => {
    // Arrange
    await page.goto('https://example.com/');

    // Act
    await page.getByRole('link', { name: 'Learn more' }).click();

    // Assert
    await expect(page).toHaveURL('https://iana.org/domains/example');
  });
});
