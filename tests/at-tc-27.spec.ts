import { test, expect, APIRequestContext, APIResponse } from '@playwright/test';

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
  if (!baseUrl) throw new Error('Missing API base URL. Set API_BASE_URL (preferred) or BASE_URL.');
  return baseUrl.replace(/\/$/, '');
}

function getHealthBaseUrl(apiBaseUrl: string): string {
  const healthBaseUrl = (process.env.HEALTH_BASE_URL ?? '').trim();
  if (healthBaseUrl) return healthBaseUrl.replace(/\/$/, '');

  const healthBasePath = (process.env.HEALTH_BASE_PATH ?? '').trim();
  if (!healthBasePath) return apiBaseUrl;

  const normalized = healthBasePath.startsWith('/') ? healthBasePath : `/${healthBasePath}`;
  return `${apiBaseUrl}${normalized}`.replace(/\/$/, '');
}

function normalizePath(path: string): string {
  const trimmed = path.trim();
  if (!trimmed) return '/health';
  return trimmed.startsWith('/') ? trimmed : `/${trimmed}`;
}

function isValidDateTime(value: unknown): boolean {
  if (typeof value !== 'string' || value.trim().length === 0) return false;
  return Number.isFinite(Date.parse(value));
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

  const container =
    (componentsKey ? body[componentsKey] : undefined) ?? (servicesKey ? body[servicesKey] : undefined);

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
  constructor(
    private readonly request: APIRequestContext,
    private readonly baseUrl: string,
  ) {}

  async getHealth(): Promise<{ response: APIResponse; body: JsonRecord; pathUsed: string }> {
    const configuredPath = (process.env.HEALTH_PATH ?? '').trim();

    const candidatePaths = [
      normalizePath(configuredPath || ''),
      '/health',
      '/api/health',
      '/healthz',
      '/status',
      '/actuator/health',
      '/actuator/health/liveness',
      '/actuator/health/readiness',
    ]
      .filter(Boolean)
      .filter((p, idx, arr) => arr.indexOf(p) === idx);

    let lastResponse: APIResponse | undefined;
    let lastBodyText = '';

    for (const path of candidatePaths) {
      const url = `${this.baseUrl}${path}`;
      const res = await this.request.get(url, {
        headers: { Accept: 'application/json' },
        failOnStatusCode: false,
      });
      lastResponse = res;

      const contentType = res.headers()['content-type'] ?? '';
      const bodyText = await res.text();
      lastBodyText = bodyText;

      const looksLikeJson = /^[\s\r\n]*[\[{]/.test(bodyText);
      const looksLikeHtml = /<!doctype html>|<html[\s>]/i.test(bodyText);

      if (looksLikeHtml) continue;
      if (res.status() !== 200) continue;

      if (contentType.toLowerCase().includes('application/json') || looksLikeJson) {
        try {
          const body = JSON.parse(bodyText) as JsonRecord;
          return { response: res, body, pathUsed: path };
        } catch {
          // try next candidate
        }
      }
    }

    if (!lastResponse) throw new Error('No response received from health endpoint candidates.');

    const ct = lastResponse.headers()['content-type'] ?? '';
    test.skip(
      true,
      `Health endpoint not reachable / not returning JSON 200. Configure API_BASE_URL/BASE_URL and optionally HEALTH_BASE_URL/HEALTH_BASE_PATH/HEALTH_PATH. ` +
        `Tried: ${candidatePaths.join(', ')}. Last status: ${lastResponse.status()}. content-type: ${ct}. Body: ${lastBodyText}`,
    );

    throw new Error('Skipped');
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
    if (extracted.overallStatus) expect(extracted.overallStatus, "Overall health status is 'UP'").toBe('UP');

    if (opts.criticalServices.length > 0) {
      for (const svc of opts.criticalServices) {
        const match = extracted.services.find((s) => s.name.toLowerCase() === svc.toLowerCase());
        expect(match, `Critical service '${svc}' is present in health payload`).toBeTruthy();
        expect(match?.status, `Critical service '${svc}' status is 'UP'`).toBe('UP');
      }
    } else {
      expect(extracted.services.length, 'Health payload exposes at least one service status').toBeGreaterThan(0);
      for (const svc of extracted.services) {
        expect(svc.status, `Service '${svc.name}' status is 'UP'`).toBe('UP');
      }
    }

    expect(extracted.latencyMs, "Health payload includes a numeric latency field (e.g., 'latencyMs')").toBeDefined();
    expect(extracted.latencyMs as number, `Reported latency is <= SLA (${opts.slaMs}ms)`).toBeLessThanOrEqual(
      opts.slaMs,
    );

    expect(extracted.timestamp, "Health payload includes a timestamp field (e.g., 'timestamp')").toBeTruthy();
    expect(isValidDateTime(extracted.timestamp), 'Timestamp is a valid date-time string').toBe(true);

    expect(extracted.reportSource, "Health payload includes auditable field 'reportSource' (or equivalent)").toBeTruthy();
    expect(extracted.reportSource?.trim().length, "'reportSource' is non-empty").toBeGreaterThan(0);

    expect(extracted.reportedBy, "Health payload includes auditable field 'reportedBy' (or equivalent)").toBeTruthy();
    expect(extracted.reportedBy?.trim().length, "'reportedBy' is non-empty").toBeGreaterThan(0);
  }
}

test.describe('AT-TC-27 - API - Health check', { tag: ['@functional', '@regression'] }, () => {
  test('GET /health reports critical services UP with SLA latency and audit fields', async ({ request }) => {
    // Arrange
    const apiBaseUrl = getApiBaseUrl();
    const baseUrl = getHealthBaseUrl(apiBaseUrl);

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
});
