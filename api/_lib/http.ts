import type { VercelRequest, VercelResponse } from '@vercel/node';

/**
 * Shared helpers for the serverless routes.
 * Files under api/_lib are not exposed as routes by Vercel (leading underscore).
 */

/** Parse an integer query param and clamp it into [min, max]. */
export function clampInt(value: unknown, fallback: number, min: number, max: number): number {
  const raw = Array.isArray(value) ? value[0] : value;
  const n = Number.parseInt(String(raw ?? ''), 10);
  if (!Number.isFinite(n)) return fallback;
  return Math.min(max, Math.max(min, n));
}

/** First value of a query param as a string, or undefined. */
export function queryString(value: unknown): string | undefined {
  const raw = Array.isArray(value) ? value[0] : value;
  return typeof raw === 'string' ? raw : undefined;
}

export function clientIp(req: VercelRequest): string {
  const fwd = req.headers['x-forwarded-for'];
  const first = (Array.isArray(fwd) ? fwd[0] : fwd)?.split(',')[0]?.trim();
  return first || req.socket?.remoteAddress || 'unknown';
}

type Bucket = { count: number; resetAt: number };
const buckets = new Map<string, Bucket>();

/**
 * Fixed-window, per-instance rate limiter.
 * Best-effort only: serverless instances do not share memory, so for strict
 * global limits swap this for a shared store (e.g. Upstash Redis / Vercel KV).
 * Returns true if the request may proceed; otherwise writes a 429.
 */
export function rateLimit(
  req: VercelRequest,
  res: VercelResponse,
  key: string,
  limit: number,
  windowMs: number,
  now: number = Date.now(),
): boolean {
  const id = `${key}:${clientIp(req)}`;
  let bucket = buckets.get(id);
  if (!bucket || now >= bucket.resetAt) {
    bucket = { count: 0, resetAt: now + windowMs };
    buckets.set(id, bucket);
  }
  bucket.count++;

  if (buckets.size > 10_000) {
    for (const [k, b] of buckets) if (now >= b.resetAt) buckets.delete(k);
  }

  if (bucket.count > limit) {
    res.setHeader('Retry-After', String(Math.ceil((bucket.resetAt - now) / 1000)));
    res.status(429).json({ error: 'Too many requests' });
    return false;
  }
  return true;
}

/** Test hook. */
export function _resetRateLimits(): void {
  buckets.clear();
}

/** Strict-ish IPv4 / IPv6 check (no ranges, no hostnames). */
export function isValidIp(ip: string): boolean {
  const v4 = /^(25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)(\.(25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)){3}$/;
  if (v4.test(ip)) return true;
  return ip.length <= 45 && /^[0-9a-fA-F:]+$/.test(ip) && ip.includes(':');
}
