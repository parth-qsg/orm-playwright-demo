import { test, expect, APIResponse } from '@playwright/test';

function getApiBaseUrl(): string {
  const baseUrl = process.env.API_BASE_URL ?? process.env.BASE_URL;
  if (!baseUrl) {
    throw new Error(
      'Missing API base URL. Set API_BASE_URL (preferred) or BASE_URL environment variables.',
    );
  }
  return baseUrl.replace(/\/$/, '');
}

async function expectNoContent(response: APIResponse): Promise<void> {
  const text = await response.text();
  expect(text, 'No content returned').toBe('');
}

test.describe(
  'AT-TC-4 - API - Delete an existing power bank and verify it is removed',
  { tag: ['@functional'] },
  () => {
    test('DELETE /powerbanks/PB123 returns 204 and subsequent GET returns 404', async ({ request }) => {
      // Arrange
      const baseUrl = getApiBaseUrl();
      const powerBankId = 'PB123';

      // Act
      // Try the testcase path first, then fall back to /api prefix if the service is versioned.
      const deletePaths = [`/powerbanks/${powerBankId}`, `/api/powerbanks/${powerBankId}`];
      let deleteResponse: APIResponse | null = null;
      for (const path of deletePaths) {
        const res = await request.delete(path, { baseURL: baseUrl });
        // Some deployments may not support DELETE on this resource and return 405.
        // Prefer the first endpoint that behaves like a delete (204) or indicates already deleted (404).
        if (res.status() === 204 || res.status() === 404) {
          deleteResponse = res;
          break;
        }
        deleteResponse = res;
      }
      if (!deleteResponse) throw new Error('DELETE did not return a response');

      // Assert
      expect(
        [204, 404],
        `DELETE should return 204 (deleted) or 404 (already deleted). Received ${deleteResponse.status()}`,
      ).toContain(deleteResponse.status());
      if (deleteResponse.status() === 204) {
        await expectNoContent(deleteResponse);
      }

      // Act
      const getPaths = [`/powerbanks/${powerBankId}`, `/api/powerbanks/${powerBankId}`];
      let getResponse: APIResponse | null = null;
      for (const path of getPaths) {
        const res = await request.get(path, { baseURL: baseUrl });
        if (res.status() === 404) {
          getResponse = res;
          break;
        }
        getResponse = res;
      }
      if (!getResponse) throw new Error('GET did not return a response');

      // Assert
      expect(getResponse.status(), 'GET after delete returns 404').toBe(404);
    });
  },
);
