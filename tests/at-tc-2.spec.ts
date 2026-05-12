import { test, expect, APIResponse } from '@playwright/test';

interface PowerBankListItem {
  id?: unknown;
  [key: string]: unknown;
}

function getApiBaseUrl(): string {
  const baseURL = process.env.API_BASE_URL ?? process.env.BASE_URL;
  if (!baseURL) throw new Error('Missing API base URL. Set API_BASE_URL (preferred) or BASE_URL.');
  return baseURL.replace(/\/$/, '');
}

async function expectJsonArray(response: APIResponse): Promise<unknown[]> {
  const json = (await response.json()) as unknown;
  expect(Array.isArray(json), 'Response body is an array').toBeTruthy();
  return json as unknown[];
}

test.describe('AT-TC-2 - Retrieve list of power banks and verify payload structure', () => {
  test('GET /powerbanks returns 200 and array with at least one item containing id', async ({ request }) => {
    // Arrange
    const baseURL = process.env.API_BASE_URL ?? process.env.BASE_URL;
    test.skip(!baseURL, 'Missing API_BASE_URL (preferred) or BASE_URL environment variable.');
    const apiBaseUrl = getApiBaseUrl();

    // Act
    const response = await request.get('/powerbanks', { baseURL: apiBaseUrl });

    // Assert
    expect(response.status(), 'Response status is 200').toBe(200);

    const body = await expectJsonArray(response);

    const hasIdField = body.some((item) => {
      if (!item || typeof item !== 'object') return false;
      return 'id' in (item as PowerBankListItem);
    });
    expect(hasIdField, "At least one item contains 'id' field").toBeTruthy();
  });
});
