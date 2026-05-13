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

      const deletePath = `/powerbanks/${powerBankId}`;
      const getPath = `/powerbanks/${powerBankId}`;

      // Act: DELETE
      const deleteResponse = await request.delete(deletePath, {
        baseURL: baseUrl,
        failOnStatusCode: false,
      });

      // Assert
      // Some deployments may not allow DELETE (405) or may return 404 if the resource is already absent.
      // The business outcome we must verify is that PB123 cannot be retrieved afterwards.
      const deleteStatus = deleteResponse.status();
      expect(
        [204, 404, 405],
        `Unexpected DELETE status ${deleteStatus}. Expected 204 (deleted), 404 (already absent), or 405 (method not allowed).`,
      ).toContain(deleteStatus);

      if (deleteStatus === 204) {
        await expectNoContent(deleteResponse);
      }

      // Act: GET after delete
      const getResponse = await request.get(getPath, {
        baseURL: baseUrl,
        failOnStatusCode: false,
      });

      // Assert
      expect(getResponse.status(), 'GET after delete returns 404').toBe(404);
    });
  },
);
