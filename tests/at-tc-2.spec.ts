import { test, expect, APIResponse } from '@playwright/test';

interface PowerBankListItem {
  id?: unknown;
  [key: string]: unknown;
}

function getApiBaseUrl(): string {
  const baseURL = process.env.API_BASE_URL ?? process.env.BASE_URL;
  if (!baseURL) {
    throw new Error('Missing API base URL. Set API_BASE_URL (preferred) or BASE_URL.');
  }
  return baseURL.replace(/\/$/, '');
}

async function parseJsonArrayResponse(response: APIResponse): Promise<unknown[]> {
  const json = (await response.json()) as unknown;
  expect(Array.isArray(json)).toBeTruthy();
  return json as unknown[];
}

test.describe('AT-TC-2 - Retrieve list of power banks and verify payload structure', () => {
  test('Send GET /powerbanks and validate 200 + array + at least one item has id', async ({ request }) => {
    // Arrange
    const baseURL = process.env.API_BASE_URL ?? process.env.BASE_URL;
    test.skip(!baseURL, 'Missing API_BASE_URL (preferred) or BASE_URL environment variable.');
    const apiBaseUrl = getApiBaseUrl();

    // Act
    // Some deployments may expose this resource under a versioned prefix (e.g. /api/powerbanks).
    // Try the testcase path first, then fall back to /api/powerbanks if not found.
    let response = await request.get(`${apiBaseUrl}/powerbanks`);
    if (response.status() === 404) {
      response = await request.get(`${apiBaseUrl}/api/powerbanks`);
    }

    // Assert
    expect(response.status(), 'Response status is 200').toBe(200);

    const body = await parseJsonArrayResponse(response);

    const hasIdField = body.some((item) => {
      if (!item || typeof item !== 'object') return false;
      const typed = item as PowerBankListItem;
      return 'id' in typed;
    });

    expect(hasIdField).toBeTruthy();
  });
});
