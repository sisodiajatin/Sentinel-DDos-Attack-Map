import { vi } from 'vitest';

export function mockRes() {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const res: any = { headers: {} as Record<string, string>, statusCode: 200, body: undefined };
  res.status = vi.fn((code: number) => { res.statusCode = code; return res; });
  res.json = vi.fn((b: unknown) => { res.body = b; return res; });
  res.setHeader = vi.fn((k: string, v: string) => { res.headers[k] = v; });
  return res;
}

let ipCounter = 0;
/** A request from a fresh client IP so rate limits don't bleed between tests. */
export function mockReq(init: { method?: string; query?: Record<string, string>; body?: unknown; ip?: string }) {
  ipCounter++;
  return {
    method: init.method ?? 'GET',
    query: init.query ?? {},
    body: init.body,
    headers: { 'x-forwarded-for': init.ip ?? `10.0.${Math.floor(ipCounter / 250)}.${ipCounter % 250}` },
    socket: {},
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  } as any;
}
