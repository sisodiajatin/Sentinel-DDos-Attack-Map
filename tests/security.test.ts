import { describe, it, expect } from 'vitest';
import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';

function walk(dir: string): string[] {
  return readdirSync(dir, { withFileTypes: true }).flatMap((e) => {
    if (['node_modules', 'dist', '.git', 'api', 'tests'].includes(e.name)) return [];
    const p = join(dir, e.name);
    return e.isDirectory() ? walk(p) : /\.(ts|tsx)$/.test(e.name) ? [p] : [];
  });
}

describe('secret hygiene', () => {
  it('.env.example contains only placeholders', () => {
    const text = readFileSync('.env.example', 'utf8');
    expect(text).not.toMatch(/=\s*"?[0-9a-f]{40,}"?/i);
  });

  it('.env.example is UTF-8 (UTF-16 breaks dotenv/Vite parsing)', () => {
    const raw = readFileSync('.env.example');
    expect(raw[0] === 0xff && raw[1] === 0xfe).toBe(false);
  });

  it('vite config does not inline server-side secrets into the client bundle', () => {
    const cfg = readFileSync('vite.config.ts', 'utf8');
    expect(cfg).not.toMatch(/ABUSEIPDB_API_KEY|OTX_API_KEY|GEMINI_API_KEY/);
  });

  it('no browser code reads API keys from the environment', () => {
    const offenders = walk('.').filter((f) =>
      /process\.env\.\w*(API_KEY|SECRET|TOKEN)|import\.meta\.env\.\w*(API_KEY|SECRET|TOKEN)/.test(readFileSync(f, 'utf8')),
    );
    expect(offenders).toEqual([]);
  });
});
