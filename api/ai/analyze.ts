import type { VercelRequest, VercelResponse } from '@vercel/node';
import { GoogleGenAI } from '@google/genai';
import { isValidIp, rateLimit } from '../_lib/http.js';

const GEMINI_API_KEY = process.env.GEMINI_API_KEY || '';

const ATTACK_TYPES = new Set([
  'SYN Flood',
  'UDP Flood',
  'HTTP Flood',
  'DNS Amplification',
  'SQL Injection',
]);

export interface SanitizedAttack {
  ip: string;
  source: { city: string; country: string };
  target: { city: string; country: string };
  type: string;
  magnitude: number;
  timestamp: number;
}

/**
 * Keep only letters, digits, spaces and a few punctuation marks, capped in
 * length. Request fields are interpolated into the LLM prompt, so free text
 * must not be able to carry instructions.
 */
function cleanText(value: unknown, max = 60): string | null {
  if (typeof value !== 'string') return null;
  const cleaned = value.replace(/[^\p{L}\p{N} .,'()-]/gu, '').trim().slice(0, max);
  return cleaned.length > 0 ? cleaned : null;
}

/** Validate the untrusted request body. Returns null when it is not acceptable. */
export function sanitizeAttack(body: unknown): SanitizedAttack | null {
  if (!body || typeof body !== 'object') return null;
  const b = body as Record<string, unknown>;
  const src = (b.source ?? {}) as Record<string, unknown>;
  const tgt = (b.target ?? {}) as Record<string, unknown>;

  const type = typeof b.type === 'string' && ATTACK_TYPES.has(b.type) ? b.type : null;
  const ip = typeof b.ip === 'string' && isValidIp(b.ip) ? b.ip : null;
  const magnitude = typeof b.magnitude === 'number' && Number.isFinite(b.magnitude)
    ? Math.min(10, Math.max(1, Math.round(b.magnitude)))
    : null;
  const timestamp = typeof b.timestamp === 'number' && Number.isFinite(b.timestamp)
    && !Number.isNaN(new Date(b.timestamp).getTime())
    ? b.timestamp
    : Date.now();

  const sourceCity = cleanText(src.city);
  const sourceCountry = cleanText(src.country);
  const targetCity = cleanText(tgt.city);
  const targetCountry = cleanText(tgt.country);

  if (!type || !ip || magnitude === null || !sourceCity || !sourceCountry || !targetCity || !targetCountry) {
    return null;
  }

  return {
    ip,
    type,
    magnitude,
    timestamp,
    source: { city: sourceCity, country: sourceCountry },
    target: { city: targetCity, country: targetCountry },
  };
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // Only allow POST requests
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // Each call spends Gemini quota; keep this tight.
  if (!rateLimit(req, res, 'analyze', 10, 60_000)) return;

  if (!GEMINI_API_KEY) {
    return res.status(500).json({ error: 'Gemini API key not configured' });
  }

  const attack = sanitizeAttack(req.body);

  if (!attack) {
    return res.status(400).json({ error: 'Invalid attack data' });
  }

  try {
    const ai = new GoogleGenAI({ apiKey: GEMINI_API_KEY });

    const prompt = `
      Act as a senior cybersecurity analyst. Analyze the following network traffic event captured by our honeypot system.

      Event Details:
      - Source IP (Anonymized): ${attack.ip}
      - Origin: ${attack.source.city}, ${attack.source.country}
      - Target: ${attack.target.city}, ${attack.target.country}
      - Attack Type: ${attack.type}
      - Magnitude (1-10): ${attack.magnitude}
      - Timestamp: ${new Date(attack.timestamp).toISOString()}

      Provide a concise threat intelligence report (max 3 sentences).
      Explain what this attack type tries to achieve and recommend a mitigation strategy (e.g., Rate Limiting, WAF rules, Blackholing).
      Do not format as markdown, just plain text.
    `;

    const response = await ai.models.generateContent({
      model: 'gemini-2.0-flash',
      contents: [{ role: 'user', parts: [{ text: prompt }] }],
    });

    const analysis = response.text || 'Analysis failed to generate content.';

    // Cache for 10 minutes (same attack = same analysis)
    res.setHeader('Cache-Control', 's-maxage=600, stale-while-revalidate=60');

    return res.status(200).json({ analysis });
  } catch (error) {
    console.error('Gemini analysis error:', error);
    return res.status(500).json({
      error: 'Analysis failed',
      analysis: 'Automated analysis unavailable. Check system logs.'
    });
  }
}
