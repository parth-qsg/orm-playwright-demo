import { test, expect, APIResponse } from '@playwright/test';

interface PowerBankResponseBody {
  id: string;
  name?: string;
}

function getApiBaseUrl(): string {
  const baseUrl = process.env.API_BASE_URL ?? process.env.BASE_URL;
  if (!baseUrl) {
    throw new Error(
      'Missing API base URL. Set API_BASE_URL (preferred) or BASE_URL environment variables.',
    );
  }
  return baseUrl.replace(/\/$/, '');
}

async function parseJsonSafely<T>(response: APIResponse): Promise<T> {
  const contentType = response.headers()['content-type'] ?? '';
  if (!contentType.toLowerCase().includes('application/json')) {
    const bodyText = await response.text();
    throw new Error(
      `Expected JSON response but got content-type: ${contentType}. Body: ${bodyText}`,
    );
  }
  return (await response.json()) as T;
}

test.describe('AT-TC-3 - API - Fetch details for an existing power bank by ID', { tag: ['@api'] }, () => {
  test('GET /powerbanks/{id} returns 200 with id=PB123 and non-empty name', async ({ request }) => {
    // Arrange
    const baseUrl = getApiBaseUrl();
    const powerBankId = 'PB123';

    // Act
    const response = await request.get(`/powerbanks/${powerBankId}`, {
      // Ensure we use the configured baseURL from Playwright config (if present)
      // and avoid double-prefixing when API_BASE_URL/BASE_URL points to a UI host.
      baseURL: baseUrl,
    });

    // Assert
    expect(response.status(), 'Response status is 200').toBe(200);

    const body = await parseJsonSafely<PowerBankResponseBody>(response);
    expect(body.id, "Response body id is 'PB123'").toBe(powerBankId);
    expect(body.name, "Response body contains non-empty 'name' field").toBeTruthy();
    expect(String(body.name).trim(), "Response body contains non-empty 'name' field").not.toHaveLength(0);
  });
});
