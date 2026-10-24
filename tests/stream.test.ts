import { describe, it, expect, vi, afterEach } from 'vitest';
import { mockReq, mockRes } from './helpers';

afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
  vi.resetModules();
});

async function loadHandler() {
  return (await import('../api/threat/stream')).default;
}

describe('GET /api/threat/stream', () => {
  it('rejects non-GET', async () => {
    const handler = await loadHandler();
    const res = mockRes();
    await handler(mockReq({ method: 'POST' }), res);
    expect(res.statusCode).toBe(405);
  });

  it('defaults to 10 attacks', async () => {
    const handler = await loadHandler();
    const res = mockRes();
    await handler(mockReq({}), res);
    expect(res.body.attacks).toHaveLength(10);
  });

  it.each([
    ['200000', 100],
    ['-5', 1],
    ['abc', 10],
  ])('clamps count=%s to %i', async (count, expected) => {
    const handler = await loadHandler();
    const res = mockRes();
    await handler(mockReq({ query: { count } }), res);
    expect(res.body.attacks).toHaveLength(expected);
  });

  it('produces valid magnitudes and attack shape', async () => {
    const handler = await loadHandler();
    const res = mockRes();
    await handler(mockReq({ query: { count: '50' } }), res);
    for (const a of res.body.attacks) {
      expect(a.magnitude).toBeGreaterThanOrEqual(1);
      expect(a.magnitude).toBeLessThanOrEqual(10);
      expect(a.source.lat).toBeTypeOf('number');
    }
  });

  it('caches the AbuseIPDB lookup instead of spending quota on every request', async () => {
    vi.stubEnv('ABUSEIPDB_API_KEY', 'test-key');
    const fetchMock = vi.fn(async () => new Response(JSON.stringify({
      data: { ipAddress: '185.220.101.1', countryCode: 'DE', abuseConfidenceScore: 100 },
    }), { status: 200 }));
    vi.stubGlobal('fetch', fetchMock);
    const handler = await loadHandler();

    for (let i = 0; i < 3; i++) {
      const res = mockRes();
      await handler(mockReq({}), res);
      expect(res.body.source).toBe('hybrid');
    }
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('rate limits a single client', async () => {
    const handler = await loadHandler();
    let last = 200;
    for (let i = 0; i < 61; i++) {
      const res = mockRes();
      await handler(mockReq({ ip: '203.0.113.9' }), res);
      last = res.statusCode;
    }
    expect(last).toBe(429);
  });
});
