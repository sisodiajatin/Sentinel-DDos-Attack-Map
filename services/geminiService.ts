import { AttackEvent } from "../types";
import { apiClient } from "./apiClient";

/**
 * Analyze a threat using Gemini AI
 * Routes through /api/ai/analyze - API key stays server-side
 */
export const analyzeThreat = async (attack: AttackEvent): Promise<string> => {
  try {
    return await apiClient.analyzeThreat(attack);
  } catch (error) {
    console.error("Gemini analysis failed:", error);
    return "Automated analysis unavailable. Check system logs.";
  }
};

export interface NewsItem {
  summary: string;
  sources: { title: string; uri: string }[];
}

/**
 * Fetch real-time threat news
 * Note: This still uses fallback data as it requires complex search grounding
 * that isn't easily proxied. Consider adding a dedicated API route for this.
 */
export const fetchRealTimeThreatNews = async (): Promise<NewsItem> => {
  // For now, return simulated news
  // A future enhancement could add /api/ai/news route
  const headlines = [
    "Critical vulnerability discovered in enterprise VPN software affecting thousands of organizations",
    "Major ransomware campaign targets healthcare sector across multiple countries",
    "Zero-day exploit in popular web framework actively exploited in the wild",
    "Nation-state actors suspected in coordinated attacks on financial infrastructure",
    "Supply chain attack compromises widely-used open source package manager",
  ];

  const randomHeadline = headlines[Math.floor(Math.random() * headlines.length)];

  return {
    summary: `Simulated Alert: ${randomHeadline}`,
    sources: [],
  };
};
