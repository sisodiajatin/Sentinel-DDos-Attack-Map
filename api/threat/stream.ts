import type { VercelRequest, VercelResponse } from '@vercel/node';

const ABUSEIPDB_API_KEY = process.env.ABUSEIPDB_API_KEY || '';
const OTX_API_KEY = process.env.OTX_API_KEY || '';

// Attack types matching frontend
const AttackType = {
  SYN_FLOOD: 'SYN Flood',
  UDP_FLOOD: 'UDP Flood',
  HTTP_FLOOD: 'HTTP Flood',
  DNS_AMP: 'DNS Amplification',
  SQL_INJECTION: 'SQL Injection',
} as const;

// Known threat IPs (fallback when APIs unavailable)
const THREAT_DATABASE = [
  { ip: '185.220.101.1', country: 'DE', city: 'Frankfurt', type: AttackType.SYN_FLOOD, confidence: 100 },
  { ip: '185.220.101.46', country: 'DE', city: 'Frankfurt', type: AttackType.HTTP_FLOOD, confidence: 100 },
  { ip: '45.155.205.233', country: 'RU', city: 'Moscow', type: AttackType.HTTP_FLOOD, confidence: 98 },
  { ip: '92.63.197.48', country: 'RU', city: 'Moscow', type: AttackType.SYN_FLOOD, confidence: 95 },
  { ip: '218.92.0.107', country: 'CN', city: 'Beijing', type: AttackType.SYN_FLOOD, confidence: 95 },
  { ip: '222.186.42.7', country: 'CN', city: 'Shanghai', type: AttackType.UDP_FLOOD, confidence: 92 },
  { ip: '178.128.23.9', country: 'SG', city: 'Singapore', type: AttackType.SYN_FLOOD, confidence: 87 },
  { ip: '51.15.43.205', country: 'FR', city: 'Paris', type: AttackType.UDP_FLOOD, confidence: 90 },
  { ip: '171.25.193.25', country: 'SE', city: 'Stockholm', type: AttackType.DNS_AMP, confidence: 85 },
  { ip: '91.240.118.172', country: 'UA', city: 'Kyiv', type: AttackType.SYN_FLOOD, confidence: 89 },
];

// Target cities
const TARGET_CITIES = [
  { city: 'Ashburn', country: 'USA', lat: 39.0438, lng: -77.4874 },
  { city: 'Frankfurt', country: 'Germany', lat: 50.1109, lng: 8.6821 },
  { city: 'Tokyo', country: 'Japan', lat: 35.6762, lng: 139.6503 },
  { city: 'London', country: 'UK', lat: 51.5074, lng: -0.1278 },
  { city: 'Singapore', country: 'Singapore', lat: 1.3521, lng: 103.8198 },
];

// Country to coordinates
const COUNTRY_COORDS: Record<string, { lat: number; lng: number; city: string; country: string }> = {
  DE: { lat: 50.1109, lng: 8.6821, city: 'Frankfurt', country: 'Germany' },
  RU: { lat: 55.7558, lng: 37.6173, city: 'Moscow', country: 'Russia' },
  CN: { lat: 39.9042, lng: 116.4074, city: 'Beijing', country: 'China' },
  SG: { lat: 1.3521, lng: 103.8198, city: 'Singapore', country: 'Singapore' },
  FR: { lat: 48.8566, lng: 2.3522, city: 'Paris', country: 'France' },
  SE: { lat: 59.3293, lng: 18.0686, city: 'Stockholm', country: 'Sweden' },
  UA: { lat: 50.4501, lng: 30.5234, city: 'Kyiv', country: 'Ukraine' },
  US: { lat: 39.0438, lng: -77.4874, city: 'Ashburn', country: 'USA' },
};

interface AttackEvent {
  id: string;
  source: { lat: number; lng: number; city: string; country: string };
  target: { lat: number; lng: number; city: string; country: string };
  type: string;
  timestamp: number;
  magnitude: number;
  ip: string;
}

async function fetchAbuseIPDBData(): Promise<AttackEvent[]> {
  if (!ABUSEIPDB_API_KEY) return [];

  try {
    // Check a known bad IP to get real data
    const response = await fetch(
      `https://api.abuseipdb.com/api/v2/check?ipAddress=185.220.101.1&maxAgeInDays=90&verbose=true`,
      {
        method: 'GET',
        headers: {
          'Key': ABUSEIPDB_API_KEY,
          'Accept': 'application/json',
        },
      }
    );

    if (!response.ok) return [];

    const data = await response.json();
    const report = data.data;

    if (!report) return [];

    const source = COUNTRY_COORDS[report.countryCode] || COUNTRY_COORDS.US;
    const target = TARGET_CITIES[Math.floor(Math.random() * TARGET_CITIES.length)];

    return [{
      id: `abuseipdb-${Date.now()}`,
      source,
      target,
      type: AttackType.SYN_FLOOD,
      timestamp: Date.now(),
      magnitude: Math.ceil(report.abuseConfidenceScore / 10),
      ip: report.ipAddress,
    }];
  } catch {
    return [];
  }
}

function generateFromDatabase(count: number): AttackEvent[] {
  const attacks: AttackEvent[] = [];

  for (let i = 0; i < count; i++) {
    const threat = THREAT_DATABASE[Math.floor(Math.random() * THREAT_DATABASE.length)];
    const source = COUNTRY_COORDS[threat.country] || COUNTRY_COORDS.US;
    const target = TARGET_CITIES[Math.floor(Math.random() * TARGET_CITIES.length)];
    const variance = Math.floor(Math.random() * 20) - 10;

    attacks.push({
      id: `stream-${Date.now()}-${i}`,
      source: { ...source, city: threat.city },
      target,
      type: threat.type,
      timestamp: Date.now() - Math.floor(Math.random() * 300000),
      magnitude: Math.min(10, Math.max(1, Math.ceil((threat.confidence + variance) / 10))),
      ip: threat.ip,
    });
  }

  return attacks;
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const count = parseInt(req.query.count as string) || 10;
  const attacks: AttackEvent[] = [];

  // Try to get real data from AbuseIPDB
  const realData = await fetchAbuseIPDBData();
  attacks.push(...realData);

  // Fill rest with database-generated attacks
  const remaining = count - attacks.length;
  if (remaining > 0) {
    attacks.push(...generateFromDatabase(remaining));
  }

  // Cache for 30 seconds
  res.setHeader('Cache-Control', 's-maxage=30, stale-while-revalidate=10');

  return res.status(200).json({
    attacks,
    source: realData.length > 0 ? 'hybrid' : 'database',
    apiStatus: {
      abuseipdb: Boolean(ABUSEIPDB_API_KEY),
      otx: Boolean(OTX_API_KEY),
    },
  });
}
