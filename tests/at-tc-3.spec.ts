import { test, expect, APIRequestContext } from '@playwright/test';

interface PowerBankResponse {
  id: string;
  name?: string;
  [key: string]: unknown;
}

const getApiBaseUrl = (): string => {
  const apiBaseUrl = process.env.API_BASE_URL ?? process.env.BASE_URL;
  if (!apiBaseUrl) {
    throw new Error('Missing API_BASE_URL (or BASE_URL) environment variable for API tests.');
  }
  return apiBaseUrl.replace(/\/$/, '');
};

const buildAuthHeaders = (): Record<string, string> => {
  const username = process.env.TEST_USERNAME ?? process.env.APP_USERNAME;
  const password = process.env.TEST_PASSWORD ?? process.env.APP_PASSWORD;

  // Only add auth if credentials exist; otherwise assume public endpoint.
  if (!username || !password) {
    return {};
  }

  const encoded = Buffer.from(`${username}:${password}`).toString('base64');
  return { Authorization: `Basic ${encoded}` };
};

const parseJsonSafely = async (response: Awaited<ReturnType<APIRequestContext['get']>>): Promise<unknown> => {
  const contentType = response.headers()['content-type'] ?? '';
  if (!contentType.includes('application/json')) {
    return await response.text();
  }
  return await response.json();
};

test.describe('AT-TC-3 - Fetch details for an existing power bank by ID', { tag: '@api' }, () => {
  test('AT-TC-3 - GET /powerbanks/{id} should return 200 with power bank data', async ({ request }) => {
    // Arrange
    const apiBaseUrl = getApiBaseUrl();
    const powerBankId = 'PB123';

    // Act
    const response = await request.get(`${apiBaseUrl}/powerbanks/${powerBankId}`, {
      headers: {
        Accept: 'application/json',
        ...buildAuthHeaders(),
      },
    });

    // Assert
    expect(response.status(), 'Response status should be 200').toBe(200);

    const body = (await parseJsonSafely(response)) as PowerBankResponse;
    expect(body, 'Response body should be an object').toBeTruthy();
    expect(body.id, "Response body should contain 'id' equal to 'PB123'").toBe(powerBankId);
    expect(body.name, "Response body should include non-empty 'name' field").toBeTruthy();
  });
});
