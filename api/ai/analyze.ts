import type { VercelRequest, VercelResponse } from '@vercel/node';
import { GoogleGenAI } from '@google/genai';

const GEMINI_API_KEY = process.env.GEMINI_API_KEY || '';

interface AttackEvent {
  ip: string;
  source: { city: string; country: string };
  target: { city: string; country: string };
  type: string;
  magnitude: number;
  timestamp: number;
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // Only allow POST requests
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  if (!GEMINI_API_KEY) {
    return res.status(500).json({ error: 'Gemini API key not configured' });
  }

  const attack = req.body as AttackEvent;

  if (!attack || !attack.type) {
    return res.status(400).json({ error: 'Attack data required' });
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
