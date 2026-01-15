import { AttackType } from './types';

export const ATTACK_COLORS = {
  [AttackType.SYN_FLOOD]: '#ef4444', // Red-500
  [AttackType.UDP_FLOOD]: '#f97316', // Orange-500
  [AttackType.HTTP_FLOOD]: '#eab308', // Yellow-500
  [AttackType.DNS_AMP]: '#a855f7', // Purple-500
  [AttackType.SQL_INJECTION]: '#3b82f6', // Blue-500
};

// Expanded list including major internet exchange points (IXPs) and data center hubs
// Weight 1-10: 10 being a major global hub (e.g., Ashburn, Frankfurt)
export const MAJOR_CITIES = [
  // North America
  { lat: 39.0438, lng: -77.4874, city: 'Ashburn', country: 'USA', weight: 10 }, // "Data Center Alley"
  { lat: 37.7749, lng: -122.4194, city: 'San Francisco', country: 'USA', weight: 9 },
  { lat: 40.7128, lng: -74.0060, city: 'New York', country: 'USA', weight: 9 },
  { lat: 43.6532, lng: -79.3832, city: 'Toronto', country: 'Canada', weight: 7 },
  { lat: 32.7767, lng: -96.7970, city: 'Dallas', country: 'USA', weight: 8 },

  // Europe
  { lat: 51.5074, lng: -0.1278, city: 'London', country: 'UK', weight: 9 }, // LINX
  { lat: 50.1109, lng: 8.6821, city: 'Frankfurt', country: 'Germany', weight: 10 }, // DE-CIX (Largest IXP)
  { lat: 52.3676, lng: 4.9041, city: 'Amsterdam', country: 'Netherlands', weight: 9 }, // AMS-IX
  { lat: 48.8566, lng: 2.3522, city: 'Paris', country: 'France', weight: 7 },
  { lat: 55.7558, lng: 37.6173, city: 'Moscow', country: 'Russia', weight: 6 },

  // Asia Pacific
  { lat: 1.3521, lng: 103.8198, city: 'Singapore', country: 'Singapore', weight: 9 },
  { lat: 35.6762, lng: 139.6503, city: 'Tokyo', country: 'Japan', weight: 9 },
  { lat: 22.3193, lng: 114.1694, city: 'Hong Kong', country: 'China', weight: 8 },
  { lat: 39.9042, lng: 116.4074, city: 'Beijing', country: 'China', weight: 7 },
  { lat: -33.8688, lng: 151.2093, city: 'Sydney', country: 'Australia', weight: 6 },
  { lat: 28.6139, lng: 77.2090, city: 'New Delhi', country: 'India', weight: 7 },

  // South America & Others
  { lat: -23.5505, lng: -46.6333, city: 'São Paulo', country: 'Brazil', weight: 8 }, // IX.br
  { lat: -33.4489, lng: -70.6693, city: 'Santiago', country: 'Chile', weight: 5 },
  { lat: -26.2041, lng: 28.0473, city: 'Johannesburg', country: 'South Africa', weight: 6 },
  { lat: 25.2048, lng: 55.2708, city: 'Dubai', country: 'UAE', weight: 7 }
];

export const MOCK_IPS = [
  '192.168.1.45', '10.0.0.12', '172.16.254.1', '203.0.113.195', '198.51.100.2',
  '45.33.22.11', '104.21.55.2', '185.199.108.153', '142.250.182.14', '1.1.1.1'
];