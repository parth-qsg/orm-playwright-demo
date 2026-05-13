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

      // Act: DELETE
      // Some deployments expose the API under an /api prefix. If the first attempt returns 405,
      // retry once with /api to keep the test deterministic across environments.
      const deletePath = `/powerbanks/${powerBankId}`;
      let deleteResponse = await request.delete(deletePath, {
        baseURL: baseUrl,
        failOnStatusCode: false,
      });
      if (deleteResponse.status() === 405) {
        deleteResponse = await request.delete(`/api${deletePath}`, {
          baseURL: baseUrl,
          failOnStatusCode: false,
        });
      }

      // Assert
      expect(deleteResponse.status(), 'Response status is 204').toBe(204);
      await expectNoContent(deleteResponse);

      // Act: GET after delete
      const getPath = `/powerbanks/${powerBankId}`;
      let getResponse = await request.get(getPath, {
        baseURL: baseUrl,
        failOnStatusCode: false,
      });
      if (getResponse.status() === 405) {
        getResponse = await request.get(`/api${getPath}`, {
          baseURL: baseUrl,
          failOnStatusCode: false,
        });
      }

      // Assert
      expect(getResponse.status(), 'GET after delete returns 404').toBe(404);
    });
  },
);
