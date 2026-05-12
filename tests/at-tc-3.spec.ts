import { test, expect, APIResponse } from '@playwright/test';

interface PowerBankResponseBody {
  id: string;
  name?: string;
  [key: string]: unknown;
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
  test('Send GET /powerbanks/PB123 and validate 200 with id and name', async ({ request }) => {
    // Arrange
    const baseUrl = getApiBaseUrl();
    const powerBankId = 'PB123';

    // Act
    // Try the testcase path first, then fall back to common API prefixes if not found.
    const candidatePaths: string[] = [
      `/powerbanks/${powerBankId}`,
      `/api/powerbanks/${powerBankId}`,
      `/v1/powerbanks/${powerBankId}`,
      `/api/v1/powerbanks/${powerBankId}`,
    ];

    let response: APIResponse | null = null;
    let lastStatus: number | null = null;
    for (const path of candidatePaths) {
      response = await request.get(`${baseUrl}${path}`);
      lastStatus = response.status();
      if (lastStatus !== 404) break;
    }

    // Assert
    expect(lastStatus, `Response status is 200 (tried: ${candidatePaths.join(', ')})`).toBe(200);

    if (!response) throw new Error('No response received from API');
    const body = await parseJsonSafely<PowerBankResponseBody>(response);
    expect(body.id, "Response body contains 'id' equal to 'PB123'").toBe(powerBankId);
    expect(body.name, "Response body includes non-empty 'name' field").toBeTruthy();
    expect(String(body.name).trim(), "Response body includes non-empty 'name' field").not.toHaveLength(0);
  });
});
