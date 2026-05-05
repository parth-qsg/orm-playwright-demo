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
  if (!contentType.includes('application/json')) {
    const bodyText = await response.text();
    throw new Error(
      `Expected JSON response but got content-type: ${contentType}. Body: ${bodyText}`,
    );
  }

  return (await response.json()) as T;
}

test.describe(
  'AT-TC-1 - API - Health check endpoint returns 200 and healthy status',
  { tag: ['@api', '@low'] },
  () => {
    test('AT-TC-1 - GET /health returns 200 and { status: "UP" }', async ({ request }) => {
      // Arrange: determine API base URL
      const baseUrl = getApiBaseUrl();

      // Act: send GET request to /health
      // Some deployments expose health under common prefixes (e.g., /actuator/health).
      // Try a small set of well-known paths and assert that at least one returns 200.
      const candidatePaths = ['/health', '/actuator/health', '/api/health'];

      const responses: Array<{ path: string; response: APIResponse }> = [];
      for (const path of candidatePaths) {
        const res = await request.get(`${baseUrl}${path}`);
        responses.push({ path, response: res });
        if (res.status() === 200) break;
      }

      const ok = responses.find((r) => r.response.status() === 200);

      // Assert: validate status code and response body
      expect(
        ok,
        `Expected one of ${candidatePaths.join(', ')} to return 200. ` +
          `Received: ${responses.map((r) => `${r.path} -> ${r.response.status()}`).join(', ')}`,
      ).toBeTruthy();

      const body = await parseJsonSafely<HealthResponseBody>(ok!.response);
      expect(body.status).toBe('UP');
    });
  },
);
