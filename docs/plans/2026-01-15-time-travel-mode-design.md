# Time-Travel Mode Design

**Date:** 2026-01-15
**Status:** Approved
**Goal:** Enable post-incident analysis through attack replay

---

## Overview

Add a "Replay" tab to the bottom Stats panel that lets users scrub through historical attack data like a video timeline. Security teams can pause, rewind, and fast-forward through past attacks for post-incident analysis.

### Design Decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| UI Location | Bottom Stats panel tab | Fits focus-first design, no new chrome |
| Playback style | Full reconstruction | Most authentic for incident analysis |
| Data retention | 24 hours in IndexedDB | Covers most use cases, manageable storage |
| Controls | Essential set | Play/pause, scrub, speed - covers 90% of needs |
| Keyboard shortcuts | Full support | Matches existing app patterns |

---

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│  Stats Panel (Bottom)                                        │
├──────────┬──────────┬──────────┬──────────┬─────────────────┤
│ Summary  │ Traffic  │ By Type  │ Timeline │ ★ Replay ★     │
└──────────┴──────────┴──────────┴──────────┴─────────────────┘
```

### Data Flow

1. `useThreatSimulation` emits attacks → `attackHistoryService` stores to IndexedDB
2. User selects Replay tab → switches map from "live" to "replay" mode
3. Scrub bar position → queries IndexedDB for attacks at that timestamp
4. `ThreatMap` renders historical attacks instead of live stream

---

## Replay Tab UI

```
┌─────────────────────────────────────────────────────────────────┐
│ Replay                                                          │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│   ┌──────────────────────────────────────────────────────────┐  │
│   │▓▓▓▓▓░░░░░░░░●░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░│  │
│   └──────────────────────────────────────────────────────────┘  │
│   10:00 AM                 ↑ NOW                      2:34 PM   │
│                        12:17:34 PM                              │
│                                                                 │
│   ┌─────┐  ┌─────────┐  ┌─────┐      ┌──────────┐  ┌────────┐  │
│   │ ⏪  │  │  ▶ Play │  │ ⏩  │      │ Speed 1x │  │  LIVE  │  │
│   └─────┘  └─────────┘  └─────┘      └──────────┘  └────────┘  │
│                                                                 │
│   Attacks at this time: 3    │    Total in range: 1,247        │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### Controls

| Control | Behavior |
|---------|----------|
| **Scrub bar** | Drag to seek. Shows attack density as bar graph overlay. |
| **Play/Pause** | Plays forward from current position at selected speed |
| **⏪ / ⏩** | Skip 1 minute backward/forward |
| **Speed dropdown** | 0.5x, 1x, 2x, 4x playback speed |
| **LIVE button** | Exit replay mode, return to live view |

### Visual States

- **Live mode**: Tab shows "LIVE" badge, scrub bar disabled
- **Replay mode**: Tab shows timestamp, map border gets subtle orange tint
- **Playing**: Play button shows pause icon, current time animates
- **Paused**: Scrub bar shows exact position, attacks frozen

---

## Data Storage

### Schema

```typescript
interface StoredAttack {
  id: string;              // UUID from original attack
  timestamp: number;       // Unix ms when attack occurred
  attack: Attack;          // Full attack object
}

// IndexedDB store: "attackHistory"
// Indexes:
//   - "timestamp" (for range queries)
//   - "id" (for deduplication)
```

### Operations

| Operation | Purpose |
|-----------|---------|
| `saveAttack(attack)` | Store incoming attack with timestamp |
| `getAttacksInRange(start, end)` | Query attacks between two timestamps |
| `getAttacksAtTime(timestamp, windowMs)` | Get attacks visible at a point in time |
| `cleanup()` | Delete attacks older than 24 hours |
| `getTimeRange()` | Return {earliest, latest} for scrub bar bounds |

### Storage Estimates

- ~500 bytes per attack
- 20 attacks/minute × 60 × 24 = ~28,800 attacks/day
- **~14 MB max** - well within IndexedDB limits

---

## Keyboard Shortcuts

| Key | Action | Context |
|-----|--------|---------|
| `R` | Toggle Replay tab open | Global |
| `Space` | Play/Pause | When Replay tab active |
| `←` | Scrub back 10 seconds | When Replay tab active |
| `→` | Scrub forward 10 seconds | When Replay tab active |
| `Shift+←` | Skip back 1 minute | When Replay tab active |
| `Shift+→` | Skip forward 1 minute | When Replay tab active |
| `-` | Slower playback | When Replay tab active |
| `+` / `=` | Faster playback | When Replay tab active |
| `L` | Return to LIVE | When in replay mode |

---

## Map Integration

When in replay mode:
- Attack arcs render from historical data at selected timestamp
- Globe rotation pauses (unless manually dragged)
- Subtle visual indicator: thin orange border
- Impact ripples still animate for attacks entering the view window

---

## Files

### New Files
- `services/attackHistoryService.ts` - IndexedDB CRUD + 24hr cleanup
- `hooks/useReplayMode.ts` - Playback state machine
- `components/stats/ReplayTab.tsx` - Timeline controls UI

### Modified Files
- `hooks/useThreatSimulation.ts` - Add attack storage hook
- `hooks/useKeyboardShortcuts.ts` - Add replay shortcuts
- `components/stats/StatsPanel.tsx` - Add Replay tab
- `components/ThreatMap.tsx` - Accept replay mode props
- `App.tsx` - Wire up replay state
