import { test, expect, APIResponse, APIRequestContext } from '@playwright/test';

type JsonRecord = Record<string, unknown>;

type ServiceStatus = { name: string; status: string };

type HealthAssertions = {
  overallStatus?: string;
  services: ServiceStatus[];
  latencyMs?: number;
  timestamp?: string;
  reportSource?: string;
  reportedBy?: string;
};

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
  const bodyText = await response.text();

  const looksLikeJson = /^[\s\r\n]*[\[{]/.test(bodyText);
  const looksLikeHtml = /<!doctype html>|<html[\s>]/i.test(bodyText);

  if (!contentType.toLowerCase().includes('application/json') && !looksLikeJson) {
    throw new Error(
      `Expected JSON response but got content-type: ${contentType}. Body: ${bodyText}`,
    );
  }
  if (looksLikeHtml) {
    throw new Error(
      `Health endpoint returned HTML (likely UI/login page). Check API_BASE_URL/HEALTH_PATH. Body: ${bodyText}`,
    );
  }

  try {
    return JSON.parse(bodyText) as T;
  } catch (e) {
    throw new Error(
      `Failed to parse JSON from response. content-type: ${contentType}. Body: ${bodyText}. Error: ${String(e)}`,
    );
  }
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

function collectServiceStatuses(body: JsonRecord): ServiceStatus[] {
  const results: ServiceStatus[] = [];

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

class HealthApi {
  constructor(private readonly request: APIRequestContext, private readonly baseUrl: string) {}

  async getHealth(): Promise<{ response: APIResponse; body: JsonRecord; pathUsed: string }> {
    const configuredPath = (process.env.HEALTH_PATH ?? '').trim();
    const healthPaths = (
      configuredPath
        ? [configuredPath]
        : [
            '/health',
            '/actuator/health',
            '/api/health',
            '/api/actuator/health',
            '/api/v1/health',
            '/api/v1/actuator/health',
            '/status/health',
            '/healthz',
            '/readyz',
            '/livez',
          ]
    ).map((p) => (p.startsWith('/') ? p : `/${p}`));

    const candidateUrls: Array<{ url: string; pathUsed: string }> = [
      { url: this.baseUrl, pathUsed: '(baseUrl)' },
      ...healthPaths.map((p) => ({ url: `${this.baseUrl}${p}`, pathUsed: p })),
    ];

    let lastResponse: APIResponse | undefined;
    for (const candidate of candidateUrls) {
      const res = await this.request.get(candidate.url, {
        headers: {
          Accept: 'application/json',
        },
      });
      lastResponse = res;
      if (res.status() === 404) continue;

      // Some apps return HTML (SPA/login) for unknown routes or when not authenticated.
      // Treat non-JSON responses as a non-match and try the next candidate path.
      try {
        const body = await parseJsonSafely<JsonRecord>(res);
        return { response: res, body, pathUsed: candidate.pathUsed };
      } catch {
        continue;
      }
    }

    const bodyText = lastResponse ? await lastResponse.text() : '';
    throw new Error(
      `Health endpoint not found. Set HEALTH_PATH env var to the correct endpoint. Tried baseUrl and: ${healthPaths.join(
        ', ',
      )}. Last status: ${lastResponse?.status()}. Body: ${bodyText}`,
    );
  }

  extractAssertions(body: JsonRecord): HealthAssertions {
    return {
      overallStatus: getStringField(body, ['status', 'state']),
      services: collectServiceStatuses(body),
      latencyMs: getNumberField(body, [
        'latencyMs',
        'latency',
        'responseTimeMs',
        'responseTime',
        'durationMs',
        'duration',
      ]),
      timestamp: getStringField(body, ['timestamp', 'time', 'reportedAt', 'generatedAt']),
      reportSource: getStringField(body, ['reportSource', 'source']),
      reportedBy: getStringField(body, ['reportedBy', 'reporter', 'reported_by']),
    };
  }

  assertHealth(extracted: HealthAssertions, opts: { slaMs: number; criticalServices: string[] }): void {
    if (extracted.overallStatus) {
      expect(extracted.overallStatus, "Overall health status is 'UP'").toBe('UP');
    }

    if (opts.criticalServices.length > 0) {
      for (const svc of opts.criticalServices) {
        const match = extracted.services.find((s) => s.name.toLowerCase() === svc.toLowerCase());
        expect(match, `Critical service '${svc}' is present in health payload`).toBeTruthy();
        expect(match?.status, `Critical service '${svc}' status is 'UP'`).toBe('UP');
      }
    } else {
      expect(
        extracted.services.length,
        'Health payload exposes at least one service/component status',
      ).toBeGreaterThan(0);
      for (const svc of extracted.services) {
        expect(svc.status, `Service '${svc.name}' status is 'UP'`).toBe('UP');
      }
    }

    expect(
      extracted.latencyMs,
      "Health payload includes a numeric latency field (e.g., 'latencyMs')",
    ).toBeDefined();
    expect(
      extracted.latencyMs as number,
      `Reported latency is <= SLA (${opts.slaMs}ms)`,
    ).toBeLessThanOrEqual(opts.slaMs);

    expect(extracted.timestamp, "Health payload includes a timestamp field (e.g., 'timestamp')").toBeTruthy();
    expect(isValidDateTime(extracted.timestamp), 'Timestamp is a valid date-time string').toBe(true);

    expect(
      extracted.reportSource,
      "Health payload includes auditable field 'reportSource' (or equivalent)",
    ).toBeTruthy();
    expect(extracted.reportSource?.trim().length, "'reportSource' is non-empty").toBeGreaterThan(0);

    expect(
      extracted.reportedBy,
      "Health payload includes auditable field 'reportedBy' (or equivalent)",
    ).toBeTruthy();
    expect(extracted.reportedBy?.trim().length, "'reportedBy' is non-empty").toBeGreaterThan(0);
  }
}

test.describe(
  'AT-TC-27 - API - Health check reports critical services UP with SLA latency and audit fields',
  { tag: ['@functional', '@regression'] },
  () => {
    test('GET /health validates status, critical services, latency SLA, timestamp, and audit fields', async ({
      request,
    }) => {
      // Arrange
      const baseUrl = getApiBaseUrl();
      const slaMs = Number(process.env.HEALTH_SLA_MS ?? '500');
      if (!Number.isFinite(slaMs) || slaMs <= 0) {
        throw new Error('Invalid HEALTH_SLA_MS. Provide a positive number (milliseconds).');
      }

      const criticalServicesEnv = (process.env.HEALTH_CRITICAL_SERVICES ?? '').trim();
      const criticalServices = criticalServicesEnv
        ? criticalServicesEnv
            .split(',')
            .map((s) => s.trim())
            .filter(Boolean)
        : [];

      const healthApi = new HealthApi(request, baseUrl);

      // Act
      const { response, body, pathUsed } = await healthApi.getHealth();

      // Assert
      expect(response.status(), `HTTP 200 OK is returned from ${pathUsed}`).toBe(200);

      const extracted = healthApi.extractAssertions(body);
      healthApi.assertHealth(extracted, { slaMs, criticalServices });
    });
  },
);
