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

async function readBodyTextSafely(response: APIResponse): Promise<string> {
  try {
    return await response.text();
  } catch {
    return '';
  }
}

test.describe('AT-TC-4 - API - Delete an existing power bank and verify it is removed', {
  tag: ['@functional'],
}, () => {
  test('DELETE /powerbanks/{id} should return 204 and subsequent GET should fail with 404', async ({
    request,
  }) => {
    // Arrange
    const baseUrl = getApiBaseUrl();
    const powerBankId = 'PB123';
    const resourceUrl = `${baseUrl}/powerbanks/${powerBankId}`;

    // Act: DELETE
    // Some APIs require a trailing slash for non-GET methods; retry once with it if method is rejected.
    let deleteResponse = await request.delete(resourceUrl);
    if (deleteResponse.status() === 405) {
      deleteResponse = await request.delete(`${resourceUrl}/`);
    }

    // Assert: 204 + no content
    expect(deleteResponse.status(), 'Response status is 204').toBe(204);
    const deleteBody = await readBodyTextSafely(deleteResponse);
    expect(deleteBody, 'No content returned').toBe('');

    // Act: GET after delete
    const getResponse = await request.get(resourceUrl);

    // Assert: 404 not found
    expect(getResponse.status(), 'GET after delete returns 404').toBe(404);
  });
});
