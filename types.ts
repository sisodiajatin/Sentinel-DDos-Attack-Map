export interface GeoCoord {
  lat: number;
  lng: number;
  city: string;
  country: string;
  weight?: number; // 1-10 scale representing internet traffic density
}

export enum AttackType {
  SYN_FLOOD = 'SYN Flood',
  UDP_FLOOD = 'UDP Flood',
  HTTP_FLOOD = 'HTTP Flood',
  DNS_AMP = 'DNS Amplification',
  SQL_INJECTION = 'SQL Injection',
}

export interface AttackEvent {
  id: string;
  source: GeoCoord;
  target: GeoCoord;
  type: AttackType;
  timestamp: number;
  magnitude: number; // 1-10 scale
  ip: string; // Simulated IP
}

export interface ThreatStats {
  totalAttacks: number;
  activeThreats: number;
  bandwidthUsage: number; // in Gbps
}

// Threat level configuration
export interface ThreatLevel {
  level: 'LOW' | 'ELEVATED' | 'CRITICAL';
  color: string;
  bg: string;
  border: string;
}

// Map view modes
export type MapViewMode = 'GLOBE' | 'PLANAR';

// Simulation scenarios
export type SimulationScenario = 'NORMAL' | 'BOTNET_WAVE' | 'HEAVY_HIT' | 'CAMPAIGN';

// Data source modes
export type DataSource = 'simulation' | 'real' | 'hybrid';

// Country label data for map
export interface CountryLabel {
  id: string;
  name: string;
  centroid: [number, number];
}

// Location count for heatmap
export interface LocationCount {
  lat: number;
  lng: number;
  count: number;
}

// Chart data types
export interface ChartDataPoint {
  name: string;
  value: number;
}

export interface TimelineDataPoint {
  time: number;
  magnitude: number;
}

// Attack type statistics
export interface AttackTypeStat {
  type: AttackType;
  acronym: string;
  count: number;
  color: string;
}