import type { VercelRequest, VercelResponse } from '@vercel/node';

const OTX_API_KEY = process.env.OTX_API_KEY || '';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // Only allow GET requests
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { type = 'pulses', limit = '10' } = req.query;

  if (!OTX_API_KEY) {
    return res.status(500).json({ error: 'OTX API key not configured' });
  }

  try {
    let url: string;

    if (type === 'pulses') {
      url = `https://otx.alienvault.com/api/v1/pulses/subscribed?limit=${limit}&page=1`;
    } else if (type === 'indicators') {
      const indicatorType = req.query.indicatorType || 'IPv4';
      url = `https://otx.alienvault.com/api/v1/indicators/export?type=${indicatorType}`;
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
