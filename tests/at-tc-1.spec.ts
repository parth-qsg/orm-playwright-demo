import { test, expect, APIResponse } from '@playwright/test';

interface HealthResponseBody {
  status: string;
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

test.describe('AT-TC-1 - API - Health check endpoint returns 200 and healthy status', {
  tag: ['@functional'],
}, () => {
  test('Send GET /health and validate 200 with { status: "UP" }', async ({ request }) => {
    // Arrange
    const baseUrl = getApiBaseUrl();

    // Act
    // Some deployments expose health under /actuator/health (Spring Boot) instead of /health.
    // Try /health first (per testcase), then fall back to /actuator/health if /health is not found.
    let response = await request.get(`${baseUrl}/health`);
    if (response.status() === 404) {
      response = await request.get(`${baseUrl}/actuator/health`);
    }

    // Assert
    expect(response.status(), 'Response status is 200').toBe(200);
    const body = await parseJsonSafely<HealthResponseBody>(response);
    expect(body.status, "Response body contains field 'status' with value 'UP'").toBe('UP');
  });
});
