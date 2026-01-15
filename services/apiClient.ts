/**
 * API Client for Vercel Serverless Functions
 * All external API calls are proxied through /api/* routes
 * to keep API keys secure on the server side.
 */

import { AttackEvent } from '../types';

// API base is empty - all routes are relative (same origin)
// In development with Vite, you may need to configure proxy in vite.config.ts
// In production on Vercel, API routes are served from the same domain
const API_BASE = '';

export interface AbuseIPDBReport {
  ipAddress: string;
  isPublic: boolean;
  ipVersion: number;
  isWhitelisted: boolean;
  abuseConfidenceScore: number;
  countryCode: string;
  countryName: string;
  usageType: string;
  isp: string;
  domain: string;
  hostnames: string[];
  totalReports: number;
  numDistinctUsers: number;
  lastReportedAt: string;
}

export interface OTXPulse {
  id: string;
  name: string;
  description: string;
  author_name: string;
  created: string;
  modified: string;
  tags: string[];
  targeted_countries: string[];
  malware_families: string[];
}

export interface ThreatStreamResponse {
  attacks: AttackEvent[];
  source: 'hybrid' | 'database' | 'simulation';
  apiStatus: {
    abuseipdb: boolean;
    otx: boolean;
  };
}

export interface AIAnalysisResponse {
  analysis: string;
  error?: string;
}

/**
 * API Client - all methods call Vercel serverless functions
 */
export const apiClient = {
  /**
   * Check IP reputation via AbuseIPDB proxy
   */
  async checkIPReputation(ip: string): Promise<AbuseIPDBReport | null> {
    try {
      const response = await fetch(`${API_BASE}/api/threat/abuseipdb?ip=${encodeURIComponent(ip)}`);

      if (!response.ok) {
        if (response.status === 429) {
          console.warn('Rate limit exceeded for AbuseIPDB');
        }
        return null;
      }

      const data = await response.json();
      return data.data as AbuseIPDBReport;
    } catch (error) {
      console.error('Failed to check IP reputation:', error);
      return null;
    }
  },

  /**
   * Get threat pulses from AlienVault OTX proxy
   */
  async getOTXPulses(limit: number = 10): Promise<OTXPulse[]> {
    try {
      const response = await fetch(`${API_BASE}/api/threat/otx?type=pulses&limit=${limit}`);

      if (!response.ok) {
        return [];
      }

      const data = await response.json();
      return data.results as OTXPulse[];
    } catch (error) {
      console.error('Failed to get OTX pulses:', error);
      return [];
    }
  },

  /**
   * Get aggregated threat stream (main data endpoint)
   * This is the primary method for fetching attack data
   */
  async getThreatStream(count: number = 10): Promise<ThreatStreamResponse> {
    try {
      const response = await fetch(`${API_BASE}/api/threat/stream?count=${count}`);

      if (!response.ok) {
        throw new Error(`Stream API error: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Failed to get threat stream:', error);
      // Return empty response on failure
      return {
        attacks: [],
        source: 'simulation',
        apiStatus: { abuseipdb: false, otx: false },
      };
    }
  },

  /**
   * Analyze threat using Gemini AI proxy
   */
  async analyzeThreat(attack: AttackEvent): Promise<string> {
    try {
      const response = await fetch(`${API_BASE}/api/ai/analyze`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(attack),
      });

      if (!response.ok) {
        throw new Error(`AI analysis error: ${response.status}`);
      }

      const data: AIAnalysisResponse = await response.json();
      return data.analysis;
    } catch (error) {
      console.error('Failed to analyze threat:', error);
      return 'Automated analysis unavailable. The API proxy may be misconfigured.';
    }
  },

  /**
   * Check if backend APIs are available
   */
  async getAPIStatus(): Promise<{ abuseipdb: boolean; otx: boolean; gemini: boolean }> {
    try {
      const response = await fetch(`${API_BASE}/api/threat/stream?count=1`);

      if (!response.ok) {
        return { abuseipdb: false, otx: false, gemini: false };
      }

      const data: ThreatStreamResponse = await response.json();
      return {
        ...data.apiStatus,
        gemini: true, // Assume available if stream works
      };
    } catch {
      return { abuseipdb: false, otx: false, gemini: false };
    }
  },
};

export default apiClient;
