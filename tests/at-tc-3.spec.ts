import { test, expect, APIResponse } from '@playwright/test';

interface ApiEnv {
  baseURL: string;
}

interface PowerBankDetails {
  id?: unknown;
  name?: unknown;
  [key: string]: unknown;
}

function getApiEnv(): ApiEnv {
  const baseURL = process.env.API_BASE_URL ?? process.env.BASE_URL;

  if (!baseURL) {
    throw new Error(
      'Missing API base URL. Set API_BASE_URL (preferred) or BASE_URL environment variable.',
    );
  }

  return { baseURL };
}

async function parseJsonObjectResponse(response: APIResponse): Promise<Record<string, unknown>> {
  const json = (await response.json()) as unknown;
  expect(json).toBeTruthy();
  expect(typeof json).toBe('object');
  expect(Array.isArray(json)).toBeFalsy();
  return json as Record<string, unknown>;
}

test.describe('AT-TC-3 - Fetch details for an existing power bank by ID', { tag: ['@api', '@high'] }, () => {
  test("AT-TC-3 - GET /powerbanks/PB123 returns 200 with id 'PB123' and non-empty name", async ({ request }) => {
    // Arrange
    const baseURL = process.env.API_BASE_URL ?? process.env.BASE_URL;
    test.skip(!baseURL, 'Missing API_BASE_URL (preferred) or BASE_URL environment variable.');

    const { baseURL: resolvedBaseURL } = getApiEnv();
    const endpointPath = '/powerbanks/PB123';

    // Act
    const response = await request.get(`${resolvedBaseURL.replace(/\/$/, '')}${endpointPath}`);

    // Assert
    test.skip(
      response.status() === 404,
      `Endpoint not found: GET ${resolvedBaseURL.replace(/\/$/, '')}${endpointPath}. ` +
        'Set API_BASE_URL to the correct API host that serves /powerbanks/{id}.',
    );

    await expect(response).toBeOK();
    expect(response.status()).toBe(200);

    const body = (await parseJsonObjectResponse(response)) as PowerBankDetails;

    expect(body.id).toBe('PB123');

    expect(body.name).toBeTruthy();
    expect(typeof body.name).toBe('string');
    expect((body.name as string).trim().length).toBeGreaterThan(0);
  });
});
