# Focus-First UI Redesign

**Date:** 2026-01-14
**Status:** Approved
**Goal:** Reduce information overload through progressive disclosure

---

## Overview

Transform Sentinelvis from an "everything visible" dashboard to a "focus-first" interface where users start with a clean map view and progressively reveal details as needed.

### Core Principles

1. **Map is king** - Maximum viewport for the threat visualization
2. **Progressive disclosure** - Show complexity only when requested
3. **Consistent interaction model** - Drawers, popovers, keyboard shortcuts
4. **Mobile-friendly** - Works well on all screen sizes

---

## 1. Overall Layout Structure

```
+-------------------------------------------------------------+
|  [Mini Header - Floating, Semi-transparent]                 |
|  +------+                              +------------------+ |
|  | Logo |  * CRITICAL                  | [P] [G] [M] [T]  | |
|  +------+                              +------------------+ |
+------------------------------------------------------------|
|                                                       +---+ |
|                                                       | > | |
|                                                       |   | |
|                    FULL MAP AREA                      | F | |
|                  (No overlapping UI)                  | E | |
|                                                       | E | |
|                                                       | D | |
|                                                       |   | |
|                                                       +---+ |
|                                                             |
+------------------------------------------------------------|
|  [Pull-up Stats Panel - Collapsed by default]         ^     |
|  +---------+---------+---------+---------+                  |
|  | Summary | Traffic | Types   | Timeline|  (tabs)          |
|  +---------+---------+---------+---------+                  |
+-------------------------------------------------------------+
```

### Key Changes

- **Header:** Shrinks to 48px, floats over map with blur background
- **Map:** Takes full viewport height minus minimal header
- **Attack Feed:** Collapsed to thin vertical tab on right edge, expands on click
- **Stats Panel:** Hidden by default, pull up from bottom edge
- **Controls:** All moved into Settings popover (gear icon)

### Keyboard Shortcuts

| Key | Action |
|-----|--------|
| `F` | Toggle Focus mode (hide all chrome) |
| `]` | Toggle Attack Feed drawer |
| `S` | Toggle Stats panel |
| `Ctrl+,` | Open Settings |
| `Esc` | Close any open panel |

---

## 2. Header Redesign

### Current (10+ elements)
```
[Logo] [Threat Level] [DEFCON] [Net Load] | [Sim/Live/Mix] | [API Status] | [Pause] [Threats: 42] [Theme]
```

### New Mini-Header
```
+------------------------------------------------------------------------+
|  SENTINEL-VIS   * CRITICAL          <spacer>      [Pause] [Gear] [Menu] [Theme]  |
+------------------------------------------------------------------------+
```

### Element Behavior

| Element | Behavior |
|---------|----------|
| **Logo** | Static, clicking resets map to global view |
| **Threat Badge** | Pulsing dot + level text. Click to see breakdown |
| **Pause Button** | Toggle simulation. Shows play icon when paused |
| **Settings Gear** | Opens popover with: Data Source, Speed, Density, Min Magnitude |
| **Menu** | Opens drawer with: API Status, Active Threats count, About, Help |
| **Theme Toggle** | Sun/Moon icon |

### Visual Treatment

- Height: 48px (down from 64px)
- Background: `bg-white/80 dark:bg-slate-900/80 backdrop-blur-md`
- No border - uses subtle shadow instead
- Floats over map content (position: fixed)

### Removed from Header

- DEFCON display -> merged into threat badge tooltip
- Net Load -> moves to Stats panel "Summary" tab
- Data Source buttons -> moves to Settings popover
- API Status indicators -> moves to Menu drawer
- Active Threats count -> moves to Menu drawer (or feed tab badge)

---

## 3. Attack Feed Redesign (Right Drawer)

### Collapsed State (Default)
```
                                          +-----+
                                          |  Z  | <- Icon
                                          | 47  | <- Badge count
                                          |     |
                                          |  >  | <- Expand hint
                                          |     |
                                          +-----+
```

- Width: 48px
- Shows attack icon + live count badge
- Subtle pulse animation when new attacks arrive
- Click or press `]` key to expand

### Expanded State
```
+--------------------------------------+
|  THREAT FEED              [-] [X]   |
+--------------------------------------+
|  +--------+ +--------+ +--------+   |
|  | All    | |BySource| |ByType  |   |
|  |  47    | |   12   | |   5    |   |
|  +--------+ +--------+ +--------+   |
+--------------------------------------+
|  [Search] Filter attacks...         |
+--------------------------------------+
|                                      |
|  v China (12 attacks)               |
|    - SYN Flood -> USA      8.2  [AI]|
|    - HTTP Flood -> UK      6.1  [AI]|
|                                      |
|  v Russia (8 attacks)               |
|    - DNS Amp -> Germany    7.5  [AI]|
|    ...                               |
|                                      |
+--------------------------------------+
|  [Clear History]                     |
+--------------------------------------+
```

### Features

| Feature | Benefit |
|---------|---------|
| **Grouped by Source/Type** | Reduces visual noise, shows patterns |
| **Collapsible groups** | Focus on regions of interest |
| **Search filter** | Find specific IPs, countries, attack types |
| **Summary counts in tabs** | Quick overview without scrolling |
| **Width: 360px** | Wider for readability when open |

### Animations

- Slides in from right (300ms ease-out)
- New attacks fade-in at top with highlight
- Collapsed tab pulses cyan on new critical attack

---

## 4. Bottom Stats Panel (Pull-Up Drawer)

### Collapsed State (Default)
```
+-------------------------------------------------------------------------+
|  ^ Stats    | 142 attacks | 23/min | 12 countries |        [Expand]    |
+-------------------------------------------------------------------------+
```

- Height: 40px
- Shows key metrics inline as preview
- Click anywhere or press `S` key to expand
- Drag handle for pull-up gesture

### Expanded State (Tabbed Panel)
```
+-------------------------------------------------------------------------+
|  v Stats                                                    [Collapse]  |
+------------+------------+------------+------------+---------------------+
|  Summary   |  Traffic   |  By Type   |  Timeline  |                    |
|    *       |            |            |            |                    |
+------------+------------+------------+------------+---------------------+
|                                                                         |
|  +-------------+  +-------------+  +-------------+  +-------------+   |
|  | Total       |  | Per Minute  |  | Countries   |  | Avg Mag     |   |
|  |   142       |  |    23       |  |    12       |  |   6.4       |   |
|  | attacks     |  | attacks/min |  | active      |  | /10         |   |
|  +-------------+  +-------------+  +-------------+  +-------------+   |
|                                                                         |
|  Net Load: 59.6 TB/s    DEFCON 3    Latency: 12ms    Nodes: 4,021     |
|                                                                         |
+-------------------------------------------------------------------------+
```

### Tab Contents

| Tab | Content |
|-----|---------|
| **Summary** | Live counters + net load + DEFCON |
| **Traffic** | TrafficStats charts (bandwidth over time, top sources) |
| **By Type** | AttackTypeBar visualization + breakdown percentages |
| **Timeline** | ThreatTicker marquee + timeline chart |

### Panel Behavior

- Height: 180px expanded (configurable via drag)
- Remembers last active tab
- Semi-transparent blur background
- Can be "pinned" open (persists across sessions)
- Swipe down or press `Esc` to collapse

### Visual Treatment

```css
bg-white/90 dark:bg-slate-900/90
backdrop-blur-xl
border-t border-slate-200 dark:border-slate-700
shadow-[0_-4px_20px_rgba(0,0,0,0.1)]
```

---

## 5. Settings Popover (Controls Consolidation)

### Structure
```
                                    +-----------------------------+
                                    |  Settings              [X]  |
                                    +-----------------------------+
                                    |                             |
                                    |  DATA SOURCE                |
                                    |  +-------+-------+-------+  |
                                    |  |* Sim  |  Live |  Mix  |  |
                                    |  +-------+-------+-------+  |
                                    |                             |
                                    +-----------------------------+
                                    |  VISUALIZATION              |
                                    |                             |
                                    |  Min Magnitude      [5]     |
                                    |  o========*========o        |
                                    |  1                 10       |
                                    |                             |
                                    |  Animation Speed    [1x]    |
                                    |  o==*==============o        |
                                    |  0.1x              5x       |
                                    |                             |
                                    |  Attack Density    [20]     |
                                    |  o====*============o        |
                                    |  10               100       |
                                    |                             |
                                    +-----------------------------+
                                    |  FILTER                     |
                                    |  +---------------------+    |
                                    |  | All Attack Types  v |    |
                                    |  +---------------------+    |
                                    |                             |
                                    +-----------------------------+
                                    |  [x] Auto-rotate globe      |
                                    |  [x] Show impact effects    |
                                    |  [ ] Show country labels    |
                                    |                             |
                                    +-----------------------------+
```

### Sections

| Section | Contents |
|---------|----------|
| **Data Source** | Toggle buttons for Sim/Live/Mix |
| **Visualization** | Sliders for magnitude, speed, density |
| **Filter** | Attack type dropdown |
| **Options** | Checkboxes for auto-rotate, impact effects, labels |

### Behavior

- Opens on gear icon click or `Ctrl+,`
- Positioned below gear icon, aligned to right edge
- Closes on outside click or `Esc`
- Changes apply immediately (no save button)
- Settings persist in localStorage

---

## Implementation Order

### Phase 1: Layout Foundation
1. Create new layout shell with floating header
2. Implement collapsible right drawer (empty)
3. Implement pull-up bottom panel (empty)
4. Add keyboard shortcut system

### Phase 2: Header Migration
1. Build new mini-header component
2. Create Settings popover component
3. Create Menu drawer component
4. Migrate controls from old header

### Phase 3: Attack Feed Migration
1. Build collapsed tab state
2. Build expanded drawer with tabs
3. Add grouping logic (by source, by type)
4. Add search/filter functionality
5. Migrate from old AttackFeed component

### Phase 4: Stats Panel Migration
1. Build tabbed panel structure
2. Migrate Summary tab (LiveStatsCounter)
3. Migrate Traffic tab (TrafficStats)
4. Migrate By Type tab (AttackTypeBar)
5. Migrate Timeline tab (ThreatTicker)

### Phase 5: Polish
1. Add animations and transitions
2. Implement Focus mode
3. Add localStorage persistence
4. Test responsive behavior
5. Remove old components

---

## Files to Create

- `components/layout/MiniHeader.tsx`
- `components/layout/SettingsPopover.tsx`
- `components/layout/MenuDrawer.tsx`
- `components/layout/RightDrawer.tsx`
- `components/layout/BottomPanel.tsx`
- `components/feed/AttackFeedDrawer.tsx`
- `components/feed/GroupedAttackList.tsx`
- `components/stats/StatsPanel.tsx`
- `components/stats/SummaryTab.tsx`
- `hooks/useKeyboardShortcuts.ts`
- `hooks/useDrawerState.ts`
- `hooks/useSettings.ts`

## Files to Modify

- `App.tsx` - New layout structure
- `index.css` - Drawer animations

## Files to Remove (after migration)

- `components/AttackFeed.tsx` (replaced by AttackFeedDrawer)
- `components/ThreatTicker.tsx` (merged into StatsPanel)
- `components/AttackTypeBar.tsx` (merged into StatsPanel)
- `components/LiveStatsCounter.tsx` (merged into StatsPanel)
- `components/TrafficStats.tsx` (merged into StatsPanel)
