import type { VercelRequest, VercelResponse } from '@vercel/node';
import { clampInt, queryString, rateLimit } from '../_lib/http.js';

const INDICATOR_TYPES = new Set(['IPv4', 'IPv6', 'domain', 'hostname', 'URL', 'FileHash-SHA256']);

const OTX_API_KEY = process.env.OTX_API_KEY || '';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // Only allow GET requests
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  if (!rateLimit(req, res, 'otx', 30, 60_000)) return;

  const type = queryString(req.query.type) ?? 'pulses';
  const limit = clampInt(req.query.limit, 10, 1, 50);

  if (!OTX_API_KEY) {
    return res.status(500).json({ error: 'OTX API key not configured' });
  }

  try {
    let url: string;

    if (type === 'pulses') {
      url = `https://otx.alienvault.com/api/v1/pulses/subscribed?limit=${limit}&page=1`;
    } else if (type === 'indicators') {
      const indicatorType = queryString(req.query.indicatorType) ?? 'IPv4';
      if (!INDICATOR_TYPES.has(indicatorType)) {
        return res.status(400).json({ error: 'Invalid indicatorType' });
      }
      url = `https://otx.alienvault.com/api/v1/indicators/export?type=${encodeURIComponent(indicatorType)}`;
    } else {
      return res.status(400).json({ error: 'Invalid type. Use "pulses" or "indicators"' });
    }

    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'X-OTX-API-KEY': OTX_API_KEY,
        'Accept': 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error(`OTX API error: ${response.status}`);
    }

    const data = await response.json();

    // Cache for 5 minutes
    res.setHeader('Cache-Control', 's-maxage=300, stale-while-revalidate=60');
    return res.status(200).json(data);
  } catch (error) {
    console.error('OTX proxy error:', error);
    return res.status(500).json({ error: 'Failed to fetch threat intelligence' });
  }
}
