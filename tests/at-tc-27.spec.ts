import { test, expect, APIResponse } from '@playwright/test';

type JsonRecord = Record<string, unknown>;

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

function isValidDateTime(value: unknown): boolean {
  if (typeof value !== 'string' || value.trim().length === 0) return false;
  const ms = Date.parse(value);
  return Number.isFinite(ms);
}

function findFirstKey(obj: JsonRecord, keys: string[]): string | undefined {
  const lowerToActual = new Map<string, string>();
  for (const k of Object.keys(obj)) lowerToActual.set(k.toLowerCase(), k);
  for (const candidate of keys) {
    const actual = lowerToActual.get(candidate.toLowerCase());
    if (actual) return actual;
  }
  return undefined;
}

function getNumberField(obj: JsonRecord, keys: string[]): number | undefined {
  const key = findFirstKey(obj, keys);
  if (!key) return undefined;
  const v = obj[key];
  if (typeof v === 'number' && Number.isFinite(v)) return v;
  if (typeof v === 'string' && v.trim() !== '') {
    const n = Number(v);
    if (Number.isFinite(n)) return n;
  }
  return undefined;
}

function getStringField(obj: JsonRecord, keys: string[]): string | undefined {
  const key = findFirstKey(obj, keys);
  if (!key) return undefined;
  const v = obj[key];
  return typeof v === 'string' ? v : undefined;
}

function collectServiceStatuses(body: JsonRecord): Array<{ name: string; status: string }> {
  const results: Array<{ name: string; status: string }> = [];

  // Common shapes:
  // 1) Spring Boot actuator: { status: 'UP', components: { db: { status: 'UP' }, ... } }
  // 2) Custom: { services: { db: { status: 'UP' } } } or { services: [{ name, status }] }
  // 3) Flat: { db: 'UP', redis: 'UP' }

  const componentsKey = findFirstKey(body, ['components']);
  const servicesKey = findFirstKey(body, ['services', 'dependencies']);

  const container = (componentsKey ? body[componentsKey] : undefined) ??
    (servicesKey ? body[servicesKey] : undefined);

  if (container && typeof container === 'object' && !Array.isArray(container)) {
    for (const [name, value] of Object.entries(container as JsonRecord)) {
      if (value && typeof value === 'object' && !Array.isArray(value)) {
        const status = getStringField(value as JsonRecord, ['status', 'state']);
        if (status) results.push({ name, status });
      } else if (typeof value === 'string') {
        results.push({ name, status: value });
      }
    }
  } else if (Array.isArray(container)) {
    for (const item of container) {
      if (item && typeof item === 'object') {
        const rec = item as JsonRecord;
        const name = getStringField(rec, ['name', 'service', 'component']);
        const status = getStringField(rec, ['status', 'state']);
        if (name && status) results.push({ name, status });
      }
    }
  }

  // Fallback: scan top-level keys for { status: 'UP' }
  if (results.length === 0) {
    for (const [name, value] of Object.entries(body)) {
      if (value && typeof value === 'object' && !Array.isArray(value)) {
        const status = getStringField(value as JsonRecord, ['status', 'state']);
        if (status) results.push({ name, status });
      }
    }
  }

  return results;
}

test.describe('AT-TC-27 - API - Health check reports critical services UP with SLA latency and audit fields', {
  tag: ['@functional', '@regression'],
}, () => {
  test('GET /health validates status, critical services, latency SLA, timestamp, and audit fields', async ({ request }) => {
    // Arrange
    const baseUrl = getApiBaseUrl();
    const slaMs = Number(process.env.HEALTH_SLA_MS ?? '500');
    if (!Number.isFinite(slaMs) || slaMs <= 0) {
      throw new Error('Invalid HEALTH_SLA_MS. Provide a positive number (milliseconds).');
    }

    const criticalServicesEnv = (process.env.HEALTH_CRITICAL_SERVICES ?? '').trim();
    const criticalServices = criticalServicesEnv
      ? criticalServicesEnv.split(',').map((s) => s.trim()).filter(Boolean)
      : [];

    // Act
    // Try common health endpoints. Some deployments mount APIs under a prefix (e.g., /api).
    const healthPaths = [
      '/health',
      '/actuator/health',
      '/api/health',
      '/api/actuator/health',
    ];

    let response: APIResponse | undefined;
    let lastStatus: number | undefined;
    for (const path of healthPaths) {
      response = await request.get(`${baseUrl}${path}`);
      lastStatus = response.status();
      if (lastStatus !== 404) break;
    }

    // Assert
    expect(lastStatus, `HTTP 200 OK is returned from one of: ${healthPaths.join(', ')}`).toBe(200);

    const body = await parseJsonSafely<JsonRecord>(response);

    // Overall status (common in many health endpoints)
    const overallStatus = getStringField(body, ['status', 'state']);
    if (overallStatus) {
      expect(overallStatus, "Overall health status is 'UP'").toBe('UP');
    }

    // Critical services
    const serviceStatuses = collectServiceStatuses(body);
    if (criticalServices.length > 0) {
      for (const svc of criticalServices) {
        const match = serviceStatuses.find((s) => s.name.toLowerCase() === svc.toLowerCase());
        expect(match, `Critical service '${svc}' is present in health payload`).toBeTruthy();
        expect(match?.status, `Critical service '${svc}' status is 'UP'`).toBe('UP');
      }
    } else {
      // If no explicit list is provided, at least ensure we found some services and all are UP.
      expect(serviceStatuses.length, 'Health payload exposes at least one service/component status').toBeGreaterThan(0);
      for (const svc of serviceStatuses) {
        expect(svc.status, `Service '${svc.name}' status is 'UP'`).toBe('UP');
      }
    }

    // Latency SLA (reported by API)
    const latencyMs = getNumberField(body, ['latencyMs', 'latency', 'responseTimeMs', 'responseTime', 'durationMs', 'duration']);
    expect(
      latencyMs,
      "Health payload includes a numeric latency field (e.g., 'latencyMs')",
    ).toBeDefined();
    expect(latencyMs as number, `Reported latency is <= SLA (${slaMs}ms)`).toBeLessThanOrEqual(slaMs);

    // Timestamp
    const timestamp = getStringField(body, ['timestamp', 'time', 'reportedAt', 'generatedAt']);
    expect(timestamp, "Health payload includes a timestamp field (e.g., 'timestamp')").toBeTruthy();
    expect(isValidDateTime(timestamp), 'Timestamp is a valid date-time string').toBe(true);

    // Audit fields
    const reportSource = getStringField(body, ['reportSource', 'source']);
    const reportedBy = getStringField(body, ['reportedBy', 'reporter', 'reported_by']);

    expect(reportSource, "Health payload includes auditable field 'reportSource' (or equivalent)").toBeTruthy();
    expect(reportSource?.trim().length, "'reportSource' is non-empty").toBeGreaterThan(0);

    expect(reportedBy, "Health payload includes auditable field 'reportedBy' (or equivalent)").toBeTruthy();
    expect(reportedBy?.trim().length, "'reportedBy' is non-empty").toBeGreaterThan(0);
  });
});
