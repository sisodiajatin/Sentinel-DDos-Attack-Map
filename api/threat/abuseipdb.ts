import type { VercelRequest, VercelResponse } from '@vercel/node';

const ABUSEIPDB_API_KEY = process.env.ABUSEIPDB_API_KEY || '';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // Only allow GET requests
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { ip } = req.query;

  if (!ip || typeof ip !== 'string') {
    return res.status(400).json({ error: 'IP address required' });
  }

  if (!ABUSEIPDB_API_KEY) {
    return res.status(500).json({ error: 'AbuseIPDB API key not configured' });
  }

  try {
    const response = await fetch(
      `https://api.abuseipdb.com/api/v2/check?ipAddress=${encodeURIComponent(ip)}&maxAgeInDays=90&verbose=true`,
      {
        method: 'GET',
        headers: {
          'Key': ABUSEIPDB_API_KEY,
          'Accept': 'application/json',
        },
      }
    );

    if (!response.ok) {
      if (response.status === 429) {
        return res.status(429).json({ error: 'Rate limit exceeded' });
      }
      throw new Error(`AbuseIPDB API error: ${response.status}`);
    }

    const data = await response.json();

    // Cache for 5 minutes
    res.setHeader('Cache-Control', 's-maxage=300, stale-while-revalidate=60');
    return res.status(200).json(data);
  } catch (error) {
    console.error('AbuseIPDB proxy error:', error);
    return res.status(500).json({ error: 'Failed to fetch IP reputation' });
  }
}
