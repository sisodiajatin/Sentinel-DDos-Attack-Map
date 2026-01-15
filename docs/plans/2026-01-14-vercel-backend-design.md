# Vercel Backend Design

**Date:** 2026-01-14
**Status:** Approved
**Goal:** Add secure API proxy layer using Vercel serverless functions

## Problem Statement

Current issues with frontend-only architecture:
1. API keys exposed in browser bundle (security risk)
2. CORS blocks direct calls to AbuseIPDB/OTX
3. Attack history lost on page refresh (50 events max, in-memory)
4. No caching layer (wastes API quota)

## Solution Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                        VERCEL DEPLOYMENT                        │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  ┌─────────────────┐         ┌─────────────────────────────┐   │
│  │   React SPA     │ ──────► │   Vercel API Routes         │   │
│  │   (Frontend)    │         │   /api/*                    │   │
│  │                 │         │                             │   │
│  │  • ThreatMap    │         │  /api/threat/abuseipdb      │   │
│  │  • Settings     │         │  /api/threat/otx            │   │
│  │  • IndexedDB    │         │  /api/threat/stream         │   │
│  └─────────────────┘         │  /api/ai/analyze            │   │
│                              └──────────────┬──────────────┘   │
│                                             │                   │
└─────────────────────────────────────────────┼───────────────────┘
                                              │
                    ┌─────────────────────────┼─────────────────────────┐
                    │                         │                         │
                    ▼                         ▼                         ▼
            ┌───────────────┐       ┌───────────────┐       ┌───────────────┐
            │   AbuseIPDB   │       │  AlienVault   │       │    Gemini     │
            │   API         │       │  OTX API      │       │    API        │
            └───────────────┘       └───────────────┘       └───────────────┘
```

## API Routes

### 1. `/api/threat/abuseipdb`
- **Purpose:** Proxy IP reputation lookups
- **Method:** GET
- **Query:** `?ip=x.x.x.x`
- **Cache:** 5 minutes (s-maxage=300)

### 2. `/api/threat/otx`
- **Purpose:** Proxy threat intelligence pulses
- **Method:** GET
- **Query:** `?type=pulses|indicators`
- **Cache:** 5 minutes

### 3. `/api/threat/stream`
- **Purpose:** Combined threat data endpoint for polling
- **Method:** GET
- **Returns:** Aggregated threats from all sources
- **Cache:** 30 seconds
- **Fallback:** Returns simulation data if APIs fail

### 4. `/api/ai/analyze`
- **Purpose:** Proxy Gemini AI threat analysis
- **Method:** POST
- **Body:** AttackEvent JSON
- **Returns:** AI analysis response

## Frontend Changes

### New Files
- `services/apiClient.ts` - Centralized API client for proxy routes
- `services/localDB.ts` - IndexedDB wrapper for attack history

### Modified Files
- `services/threatIntelligence.ts` - Use apiClient instead of direct fetch
- `services/geminiService.ts` - Route through /api/ai/analyze
- `hooks/useThreatSimulation.ts` - Load history from IndexedDB on init

### Removed from Frontend Bundle
- Direct API key references
- `@google/genai` import (moves to API route only)

## Local Data Persistence

Using IndexedDB for attack history:
- **Database:** `sentinelvis`
- **Store:** `attacks`
- **Capacity:** 500 events (up from 50 in-memory)
- **Package:** `idb` (~1KB wrapper)

## Environment Variables

### Vercel Dashboard (Server-side only)
```
GEMINI_API_KEY=xxx
ABUSEIPDB_API_KEY=xxx
OTX_API_KEY=xxx
```

### Frontend (.env)
```
# No API keys needed - all proxied through /api/*
VITE_API_BASE=/api
```

## Implementation Tasks

### Phase 1: API Routes (4 tasks)
1. Create `/api/threat/abuseipdb.ts`
2. Create `/api/threat/otx.ts`
3. Create `/api/threat/stream.ts`
4. Create `/api/ai/analyze.ts`

### Phase 2: Frontend Services (3 tasks)
5. Create `services/apiClient.ts`
6. Create `services/localDB.ts`
7. Install `idb` package

### Phase 3: Integration (3 tasks)
8. Update `services/threatIntelligence.ts` to use apiClient
9. Update `services/geminiService.ts` to use apiClient
10. Update `hooks/useThreatSimulation.ts` to use IndexedDB

### Phase 4: Cleanup & Config (2 tasks)
11. Update `vercel.json` with rewrites config
12. Remove API keys from frontend `.env` files

## Verification

1. `npm run build` - Must complete without API key errors
2. `vercel dev` - Test API routes locally
3. Deploy to Vercel - Verify all routes work in production
4. Check Network tab - No API keys in browser requests

## Rollback Plan

If issues occur:
1. Revert to direct API calls (current behavior)
2. Keep API keys in frontend `.env` temporarily
3. IndexedDB changes are additive (no data loss)
