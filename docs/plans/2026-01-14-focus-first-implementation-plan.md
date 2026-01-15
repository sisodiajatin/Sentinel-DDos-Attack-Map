# Focus-First UI Redesign Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Transform Sentinelvis from "everything visible" to "focus-first" interface with progressive disclosure.

**Architecture:** Create reusable drawer/panel primitives, then migrate existing components into them. Header becomes minimal floating bar, sidebar becomes collapsible right drawer, bottom stats consolidate into tabbed pull-up panel.

**Tech Stack:** React 19, TypeScript, Tailwind CSS, Lucide Icons, Recharts

---

## Phase 1: Foundation Hooks & Layout Primitives

### Task 1.1: Create useKeyboardShortcuts Hook

**Files:**
- Create: `hooks/useKeyboardShortcuts.ts`

**Step 1: Create the hook file**

```typescript
// hooks/useKeyboardShortcuts.ts
import { useEffect, useCallback } from 'react';

export interface KeyboardShortcut {
  key: string;
  ctrl?: boolean;
  shift?: boolean;
  alt?: boolean;
  action: () => void;
  description: string;
}

export function useKeyboardShortcuts(shortcuts: KeyboardShortcut[]) {
  const handleKeyDown = useCallback((event: KeyboardEvent) => {
    // Don't trigger shortcuts when typing in inputs
    if (
      event.target instanceof HTMLInputElement ||
      event.target instanceof HTMLTextAreaElement ||
      event.target instanceof HTMLSelectElement
    ) {
      return;
    }

    for (const shortcut of shortcuts) {
      const keyMatch = event.key.toLowerCase() === shortcut.key.toLowerCase();
      const ctrlMatch = !!shortcut.ctrl === (event.ctrlKey || event.metaKey);
      const shiftMatch = !!shortcut.shift === event.shiftKey;
      const altMatch = !!shortcut.alt === event.altKey;

      if (keyMatch && ctrlMatch && shiftMatch && altMatch) {
        event.preventDefault();
        shortcut.action();
        return;
      }
    }
  }, [shortcuts]);

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);
}
```

**Step 2: Verify file created**

Run: `dir hooks\useKeyboardShortcuts.ts`
Expected: File exists

**Step 3: Run type check**

Run: `npm run type-check`
Expected: No errors related to useKeyboardShortcuts

---

### Task 1.2: Create useDrawerState Hook

**Files:**
- Create: `hooks/useDrawerState.ts`

**Step 1: Create the hook file**

```typescript
// hooks/useDrawerState.ts
import { useState, useCallback, useEffect } from 'react';

export interface DrawerState {
  isOpen: boolean;
  open: () => void;
  close: () => void;
  toggle: () => void;
}

export function useDrawerState(
  key: string,
  defaultOpen: boolean = false,
  persist: boolean = false
): DrawerState {
  const [isOpen, setIsOpen] = useState(() => {
    if (persist && typeof window !== 'undefined') {
      const stored = localStorage.getItem(`drawer-${key}`);
      if (stored !== null) {
        return stored === 'true';
      }
    }
    return defaultOpen;
  });

  useEffect(() => {
    if (persist) {
      localStorage.setItem(`drawer-${key}`, String(isOpen));
    }
  }, [isOpen, key, persist]);

  const open = useCallback(() => setIsOpen(true), []);
  const close = useCallback(() => setIsOpen(false), []);
  const toggle = useCallback(() => setIsOpen(prev => !prev), []);

  return { isOpen, open, close, toggle };
}
```

**Step 2: Run type check**

Run: `npm run type-check`
Expected: No errors

---

### Task 1.3: Create useSettings Hook

**Files:**
- Create: `hooks/useSettings.ts`

**Step 1: Create the settings hook**

```typescript
// hooks/useSettings.ts
import { useState, useEffect, useCallback } from 'react';
import { AttackType } from '../types';
import { DataSource } from './useThreatSimulation';

export interface AppSettings {
  // Visualization
  minMagnitude: number;
  animationSpeed: number;
  attackDensity: number;
  selectedType: AttackType | 'ALL';
  // Options
  autoRotate: boolean;
  showImpactEffects: boolean;
  showCountryLabels: boolean;
  // Data
  dataSource: DataSource;
}

const DEFAULT_SETTINGS: AppSettings = {
  minMagnitude: 1,
  animationSpeed: 1,
  attackDensity: 20,
  selectedType: 'ALL',
  autoRotate: true,
  showImpactEffects: true,
  showCountryLabels: false,
  dataSource: 'simulation',
};

const STORAGE_KEY = 'sentinelvis-settings';

export function useSettings() {
  const [settings, setSettings] = useState<AppSettings>(() => {
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        try {
          return { ...DEFAULT_SETTINGS, ...JSON.parse(stored) };
        } catch {
          return DEFAULT_SETTINGS;
        }
      }
    }
    return DEFAULT_SETTINGS;
  });

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
  }, [settings]);

  const updateSetting = useCallback(<K extends keyof AppSettings>(
    key: K,
    value: AppSettings[K]
  ) => {
    setSettings(prev => ({ ...prev, [key]: value }));
  }, []);

  const resetSettings = useCallback(() => {
    setSettings(DEFAULT_SETTINGS);
  }, []);

  return { settings, updateSetting, resetSettings };
}
```

**Step 2: Run type check**

Run: `npm run type-check`
Expected: No errors

---

### Task 1.4: Create RightDrawer Layout Component

**Files:**
- Create: `components/layout/RightDrawer.tsx`

**Step 1: Create layout directory and component**

```typescript
// components/layout/RightDrawer.tsx
import React from 'react';
import { X, ChevronLeft } from 'lucide-react';

interface RightDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  onToggle: () => void;
  title: string;
  badge?: number;
  icon: React.ReactNode;
  children: React.ReactNode;
}

const RightDrawer: React.FC<RightDrawerProps> = ({
  isOpen,
  onClose,
  onToggle,
  title,
  badge,
  icon,
  children,
}) => {
  return (
    <>
      {/* Collapsed Tab */}
      {!isOpen && (
        <button
          onClick={onToggle}
          className="fixed right-0 top-1/2 -translate-y-1/2 z-40 flex flex-col items-center gap-2 py-4 px-2 bg-white/90 dark:bg-slate-900/90 backdrop-blur-md border border-r-0 border-slate-200 dark:border-slate-700 rounded-l-lg shadow-lg hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
          aria-label={`Open ${title}`}
        >
          {icon}
          {badge !== undefined && badge > 0 && (
            <span className="text-xs font-bold font-mono text-red-500 bg-red-100 dark:bg-red-900/30 px-1.5 py-0.5 rounded">
              {badge > 99 ? '99+' : badge}
            </span>
          )}
          <ChevronLeft className="w-3 h-3 text-slate-400" />
        </button>
      )}

      {/* Expanded Drawer */}
      <div
        className={`fixed right-0 top-0 h-full z-40 flex flex-col bg-white dark:bg-slate-900 border-l border-slate-200 dark:border-slate-700 shadow-2xl transition-transform duration-300 ease-out ${
          isOpen ? 'translate-x-0' : 'translate-x-full'
        }`}
        style={{ width: '360px' }}
        role="dialog"
        aria-label={title}
        aria-hidden={!isOpen}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-slate-200 dark:border-slate-700">
          <h2 className="font-bold text-slate-900 dark:text-white flex items-center gap-2">
            {icon}
            {title}
          </h2>
          <div className="flex items-center gap-1">
            <button
              onClick={onToggle}
              className="p-1.5 rounded hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 transition-colors"
              aria-label="Collapse drawer"
            >
              <ChevronLeft className="w-4 h-4 rotate-180" />
            </button>
            <button
              onClick={onClose}
              className="p-1.5 rounded hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 transition-colors"
              aria-label="Close drawer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-hidden flex flex-col">
          {children}
        </div>
      </div>

      {/* Backdrop */}
      {isOpen && (
        <div
          className="fixed inset-0 z-30 bg-black/20 dark:bg-black/40 md:hidden"
          onClick={onClose}
          aria-hidden="true"
        />
      )}
    </>
  );
};

export default RightDrawer;
```

**Step 2: Run type check**

Run: `npm run type-check`
Expected: No errors

---

### Task 1.5: Create BottomPanel Layout Component

**Files:**
- Create: `components/layout/BottomPanel.tsx`

**Step 1: Create the component**

```typescript
// components/layout/BottomPanel.tsx
import React, { useState } from 'react';
import { ChevronUp, ChevronDown, Pin, PinOff } from 'lucide-react';

interface Tab {
  id: string;
  label: string;
  content: React.ReactNode;
}

interface BottomPanelProps {
  isOpen: boolean;
  onToggle: () => void;
  tabs: Tab[];
  previewContent: React.ReactNode;
  defaultTab?: string;
}

const BottomPanel: React.FC<BottomPanelProps> = ({
  isOpen,
  onToggle,
  tabs,
  previewContent,
  defaultTab,
}) => {
  const [activeTab, setActiveTab] = useState(defaultTab || tabs[0]?.id);
  const [isPinned, setIsPinned] = useState(false);

  const activeContent = tabs.find(t => t.id === activeTab)?.content;

  return (
    <div
      className={`fixed bottom-0 left-0 right-0 z-30 bg-white/95 dark:bg-slate-900/95 backdrop-blur-xl border-t border-slate-200 dark:border-slate-700 shadow-[0_-4px_20px_rgba(0,0,0,0.1)] transition-all duration-300 ease-out ${
        isOpen ? 'h-[200px]' : 'h-[44px]'
      }`}
    >
      {/* Collapsed Bar */}
      <button
        onClick={onToggle}
        className="w-full h-[44px] px-4 flex items-center justify-between hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors"
        aria-expanded={isOpen}
        aria-label={isOpen ? 'Collapse stats panel' : 'Expand stats panel'}
      >
        <div className="flex items-center gap-3">
          {isOpen ? (
            <ChevronDown className="w-4 h-4 text-slate-400" />
          ) : (
            <ChevronUp className="w-4 h-4 text-slate-400" />
          )}
          <span className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase">
            Stats
          </span>
        </div>

        {/* Preview metrics (only when collapsed) */}
        {!isOpen && (
          <div className="flex items-center gap-4 text-xs text-slate-600 dark:text-slate-400">
            {previewContent}
          </div>
        )}

        {isOpen && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              setIsPinned(!isPinned);
            }}
            className={`p-1.5 rounded transition-colors ${
              isPinned
                ? 'bg-cyan-100 dark:bg-cyan-900/30 text-cyan-600 dark:text-cyan-400'
                : 'text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
            }`}
            aria-label={isPinned ? 'Unpin panel' : 'Pin panel open'}
          >
            {isPinned ? <PinOff className="w-4 h-4" /> : <Pin className="w-4 h-4" />}
          </button>
        )}
      </button>

      {/* Expanded Content */}
      {isOpen && (
        <div className="h-[calc(100%-44px)] flex flex-col">
          {/* Tabs */}
          <div className="flex border-b border-slate-200 dark:border-slate-700 px-4">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`px-4 py-2 text-xs font-bold uppercase transition-colors relative ${
                  activeTab === tab.id
                    ? 'text-cyan-600 dark:text-cyan-400'
                    : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
                }`}
              >
                {tab.label}
                {activeTab === tab.id && (
                  <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-cyan-500" />
                )}
              </button>
            ))}
          </div>

          {/* Tab Content */}
          <div className="flex-1 overflow-auto p-4">
            {activeContent}
          </div>
        </div>
      )}
    </div>
  );
};

export default BottomPanel;
```

**Step 2: Run type check**

Run: `npm run type-check`
Expected: No errors

---

### Task 1.6: Add Drawer Animations to CSS

**Files:**
- Modify: `index.css`

**Step 1: Add animation keyframes**

Add the following to the end of `index.css`:

```css
/* Drawer slide animations */
@keyframes slide-in-from-right {
  from {
    transform: translateX(100%);
  }
  to {
    transform: translateX(0);
  }
}

@keyframes slide-out-to-right {
  from {
    transform: translateX(0);
  }
  to {
    transform: translateX(100%);
  }
}

@keyframes slide-up-from-bottom {
  from {
    transform: translateY(100%);
  }
  to {
    transform: translateY(0);
  }
}

.animate-slide-in-from-right {
  animation: slide-in-from-right 0.3s ease-out;
}

.animate-slide-out-to-right {
  animation: slide-out-to-right 0.3s ease-out;
}

.animate-slide-up-from-bottom {
  animation: slide-up-from-bottom 0.3s ease-out;
}

/* Panel backdrop blur enhancement */
.panel-blur {
  backdrop-filter: blur(12px) saturate(180%);
  -webkit-backdrop-filter: blur(12px) saturate(180%);
}
```

**Step 2: Run dev server to verify CSS**

Run: `npm run dev`
Expected: Server starts without CSS errors

---

## Phase 2: Header Components

### Task 2.1: Create MiniHeader Component

**Files:**
- Create: `components/layout/MiniHeader.tsx`

**Step 1: Create the component**

```typescript
// components/layout/MiniHeader.tsx
import React from 'react';
import { Shield, Pause, Play, Settings, Menu, Sun, Moon } from 'lucide-react';
import { ThreatLevel } from '../../types';

interface MiniHeaderProps {
  threatLevel: ThreatLevel;
  isPaused: boolean;
  isDark: boolean;
  onTogglePause: () => void;
  onToggleTheme: () => void;
  onOpenSettings: () => void;
  onOpenMenu: () => void;
  onLogoClick: () => void;
}

const MiniHeader: React.FC<MiniHeaderProps> = ({
  threatLevel,
  isPaused,
  isDark,
  onTogglePause,
  onToggleTheme,
  onOpenSettings,
  onOpenMenu,
  onLogoClick,
}) => {
  return (
    <header className="fixed top-0 left-0 right-0 z-50 h-12 bg-white/80 dark:bg-slate-900/80 backdrop-blur-md shadow-sm transition-colors">
      <div className="h-full px-4 flex items-center justify-between">
        {/* Left: Logo + Threat Badge */}
        <div className="flex items-center gap-3">
          <button
            onClick={onLogoClick}
            className="flex items-center gap-2 hover:opacity-80 transition-opacity"
            aria-label="Reset map view"
          >
            <div className={`p-1.5 rounded-lg border ${threatLevel.border} border-opacity-30 bg-slate-100 dark:bg-slate-800`}>
              <Shield className={`w-5 h-5 ${threatLevel.color}`} />
            </div>
            <span className="text-lg font-bold tracking-tight text-slate-900 dark:text-white">
              SENTINEL<span className="text-cyan-600 dark:text-cyan-500">VIS</span>
            </span>
          </button>

          {/* Threat Badge */}
          <div className="flex items-center gap-2 px-2 py-1 rounded-full bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
            <span className={`w-2 h-2 rounded-full ${threatLevel.bg} animate-pulse`} />
            <span className={`text-xs font-bold ${threatLevel.color}`}>
              {threatLevel.level}
            </span>
          </div>
        </div>

        {/* Right: Actions */}
        <div className="flex items-center gap-1">
          <button
            onClick={onTogglePause}
            className="p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-400 hover:text-cyan-600 dark:hover:text-cyan-400 transition-colors"
            aria-label={isPaused ? 'Resume simulation' : 'Pause simulation'}
            aria-pressed={isPaused}
          >
            {isPaused ? <Play className="w-5 h-5" /> : <Pause className="w-5 h-5" />}
          </button>

          <button
            onClick={onOpenSettings}
            className="p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-400 hover:text-cyan-600 dark:hover:text-cyan-400 transition-colors"
            aria-label="Open settings"
          >
            <Settings className="w-5 h-5" />
          </button>

          <button
            onClick={onOpenMenu}
            className="p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-400 hover:text-cyan-600 dark:hover:text-cyan-400 transition-colors"
            aria-label="Open menu"
          >
            <Menu className="w-5 h-5" />
          </button>

          <button
            onClick={onToggleTheme}
            className="p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-400 hover:text-cyan-600 dark:hover:text-cyan-400 transition-colors"
            aria-label={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
          >
            {isDark ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
          </button>
        </div>
      </div>
    </header>
  );
};

export default MiniHeader;
```

**Step 2: Run type check**

Run: `npm run type-check`
Expected: No errors

---

### Task 2.2: Create SettingsPopover Component

**Files:**
- Create: `components/layout/SettingsPopover.tsx`

**Step 1: Create the component**

```typescript
// components/layout/SettingsPopover.tsx
import React, { useEffect, useRef } from 'react';
import { X, Zap, Radio, Database } from 'lucide-react';
import { AttackType } from '../../types';
import { DataSource } from '../../hooks/useThreatSimulation';
import { AppSettings } from '../../hooks/useSettings';

interface SettingsPopoverProps {
  isOpen: boolean;
  onClose: () => void;
  settings: AppSettings;
  onUpdateSetting: <K extends keyof AppSettings>(key: K, value: AppSettings[K]) => void;
  hasRealDataAPIs: boolean;
}

const SettingsPopover: React.FC<SettingsPopoverProps> = ({
  isOpen,
  onClose,
  settings,
  onUpdateSetting,
  hasRealDataAPIs,
}) => {
  const popoverRef = useRef<HTMLDivElement>(null);

  // Close on outside click
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (popoverRef.current && !popoverRef.current.contains(event.target as Node)) {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen, onClose]);

  // Close on Escape
  useEffect(() => {
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };

    if (isOpen) {
      document.addEventListener('keydown', handleEscape);
    }
    return () => document.removeEventListener('keydown', handleEscape);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div
      ref={popoverRef}
      className="fixed top-14 right-4 z-50 w-72 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg shadow-xl animate-fade-in"
      role="dialog"
      aria-label="Settings"
    >
      {/* Header */}
      <div className="flex items-center justify-between p-3 border-b border-slate-200 dark:border-slate-700">
        <h3 className="font-bold text-slate-900 dark:text-white">Settings</h3>
        <button
          onClick={onClose}
          className="p-1 rounded hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      <div className="p-3 space-y-4 max-h-[70vh] overflow-y-auto">
        {/* Data Source */}
        <div>
          <label className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase mb-2 block">
            Data Source
          </label>
          <div className="flex gap-1 bg-slate-100 dark:bg-slate-800 p-1 rounded-lg">
            {[
              { value: 'simulation' as DataSource, label: 'Sim', icon: Zap, color: 'cyan' },
              { value: 'real' as DataSource, label: 'Live', icon: Radio, color: 'green' },
              { value: 'hybrid' as DataSource, label: 'Mix', icon: Database, color: 'purple' },
            ].map(({ value, label, icon: Icon, color }) => (
              <button
                key={value}
                onClick={() => onUpdateSetting('dataSource', value)}
                disabled={value !== 'simulation' && !hasRealDataAPIs}
                className={`flex-1 flex items-center justify-center gap-1.5 px-2 py-1.5 rounded text-xs font-bold transition-all ${
                  settings.dataSource === value
                    ? `bg-white dark:bg-slate-700 text-${color}-600 dark:text-${color}-400 shadow-sm`
                    : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 disabled:opacity-50 disabled:cursor-not-allowed'
                }`}
              >
                <Icon className="w-3 h-3" />
                {label}
              </button>
            ))}
          </div>
        </div>

        {/* Visualization Sliders */}
        <div>
          <label className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase mb-2 block">
            Visualization
          </label>

          {/* Min Magnitude */}
          <div className="mb-3">
            <div className="flex justify-between text-xs mb-1">
              <span className="text-slate-600 dark:text-slate-400">Min Magnitude</span>
              <span className="font-mono text-cyan-600 dark:text-cyan-400">{settings.minMagnitude}</span>
            </div>
            <input
              type="range"
              min="1"
              max="10"
              value={settings.minMagnitude}
              onChange={(e) => onUpdateSetting('minMagnitude', parseInt(e.target.value))}
              className="w-full h-1.5 bg-slate-200 dark:bg-slate-700 rounded-lg appearance-none cursor-pointer accent-cyan-500"
            />
          </div>

          {/* Animation Speed */}
          <div className="mb-3">
            <div className="flex justify-between text-xs mb-1">
              <span className="text-slate-600 dark:text-slate-400">Animation Speed</span>
              <span className="font-mono text-cyan-600 dark:text-cyan-400">{settings.animationSpeed}x</span>
            </div>
            <input
              type="range"
              min="0.1"
              max="5"
              step="0.1"
              value={settings.animationSpeed}
              onChange={(e) => onUpdateSetting('animationSpeed', parseFloat(e.target.value))}
              className="w-full h-1.5 bg-slate-200 dark:bg-slate-700 rounded-lg appearance-none cursor-pointer accent-cyan-500"
            />
          </div>

          {/* Attack Density */}
          <div>
            <div className="flex justify-between text-xs mb-1">
              <span className="text-slate-600 dark:text-slate-400">Attack Density</span>
              <span className="font-mono text-cyan-600 dark:text-cyan-400">{settings.attackDensity}</span>
            </div>
            <input
              type="range"
              min="10"
              max="100"
              step="10"
              value={settings.attackDensity}
              onChange={(e) => onUpdateSetting('attackDensity', parseInt(e.target.value))}
              className="w-full h-1.5 bg-slate-200 dark:bg-slate-700 rounded-lg appearance-none cursor-pointer accent-cyan-500"
            />
          </div>
        </div>

        {/* Filter */}
        <div>
          <label className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase mb-2 block">
            Filter
          </label>
          <select
            value={settings.selectedType}
            onChange={(e) => onUpdateSetting('selectedType', e.target.value as AttackType | 'ALL')}
            className="w-full bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-700 dark:text-slate-300 focus:outline-none focus:ring-2 focus:ring-cyan-500"
          >
            <option value="ALL">All Attack Types</option>
            {Object.values(AttackType).map((type) => (
              <option key={type} value={type}>{type}</option>
            ))}
          </select>
        </div>

        {/* Options */}
        <div>
          <label className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase mb-2 block">
            Options
          </label>
          <div className="space-y-2">
            {[
              { key: 'autoRotate' as const, label: 'Auto-rotate globe' },
              { key: 'showImpactEffects' as const, label: 'Show impact effects' },
              { key: 'showCountryLabels' as const, label: 'Show country labels' },
            ].map(({ key, label }) => (
              <label key={key} className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={settings[key]}
                  onChange={(e) => onUpdateSetting(key, e.target.checked)}
                  className="w-4 h-4 rounded border-slate-300 dark:border-slate-600 text-cyan-500 focus:ring-cyan-500"
                />
                <span className="text-sm text-slate-700 dark:text-slate-300">{label}</span>
              </label>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default SettingsPopover;
```

**Step 2: Run type check**

Run: `npm run type-check`
Expected: No errors

---

### Task 2.3: Create MenuDrawer Component

**Files:**
- Create: `components/layout/MenuDrawer.tsx`

**Step 1: Create the component**

```typescript
// components/layout/MenuDrawer.tsx
import React, { useEffect, useRef } from 'react';
import { X, Activity, CheckCircle2, XCircle, Info, HelpCircle, ExternalLink } from 'lucide-react';

interface MenuDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  activeThreats: number;
  apiStatus: {
    abuseipdb: boolean;
    otx: boolean;
  };
}

const MenuDrawer: React.FC<MenuDrawerProps> = ({
  isOpen,
  onClose,
  activeThreats,
  apiStatus,
}) => {
  const drawerRef = useRef<HTMLDivElement>(null);

  // Close on Escape
  useEffect(() => {
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };

    if (isOpen) {
      document.addEventListener('keydown', handleEscape);
    }
    return () => document.removeEventListener('keydown', handleEscape);
  }, [isOpen, onClose]);

  return (
    <>
      {/* Backdrop */}
      {isOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/20 dark:bg-black/40"
          onClick={onClose}
          aria-hidden="true"
        />
      )}

      {/* Drawer */}
      <div
        ref={drawerRef}
        className={`fixed top-0 right-0 h-full w-72 z-50 bg-white dark:bg-slate-900 border-l border-slate-200 dark:border-slate-700 shadow-2xl transition-transform duration-300 ease-out ${
          isOpen ? 'translate-x-0' : 'translate-x-full'
        }`}
        role="dialog"
        aria-label="Menu"
        aria-hidden={!isOpen}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-slate-200 dark:border-slate-700">
          <h2 className="font-bold text-slate-900 dark:text-white">Menu</h2>
          <button
            onClick={onClose}
            className="p-1.5 rounded hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500"
            aria-label="Close menu"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-4 space-y-6">
          {/* Active Threats */}
          <div className="p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
            <div className="flex items-center gap-2 mb-1">
              <Activity className="w-4 h-4 text-red-500" />
              <span className="text-xs font-bold text-red-600 dark:text-red-400 uppercase">Active Threats</span>
            </div>
            <span className="text-2xl font-bold font-mono text-red-600 dark:text-red-400">
              {activeThreats}
            </span>
          </div>

          {/* API Status */}
          <div>
            <h3 className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase mb-2">
              API Status
            </h3>
            <div className="space-y-2">
              <div className="flex items-center justify-between p-2 bg-slate-50 dark:bg-slate-800 rounded">
                <span className="text-sm text-slate-700 dark:text-slate-300">AbuseIPDB</span>
                {apiStatus.abuseipdb ? (
                  <span className="flex items-center gap-1 text-xs text-green-600 dark:text-green-400">
                    <CheckCircle2 className="w-4 h-4" />
                    Connected
                  </span>
                ) : (
                  <span className="flex items-center gap-1 text-xs text-slate-400">
                    <XCircle className="w-4 h-4" />
                    Not configured
                  </span>
                )}
              </div>
              <div className="flex items-center justify-between p-2 bg-slate-50 dark:bg-slate-800 rounded">
                <span className="text-sm text-slate-700 dark:text-slate-300">AlienVault OTX</span>
                {apiStatus.otx ? (
                  <span className="flex items-center gap-1 text-xs text-green-600 dark:text-green-400">
                    <CheckCircle2 className="w-4 h-4" />
                    Connected
                  </span>
                ) : (
                  <span className="flex items-center gap-1 text-xs text-slate-400">
                    <XCircle className="w-4 h-4" />
                    Not configured
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Links */}
          <div className="pt-4 border-t border-slate-200 dark:border-slate-700 space-y-1">
            <button className="w-full flex items-center gap-2 p-2 rounded hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 text-sm transition-colors">
              <Info className="w-4 h-4" />
              About SentinelVis
            </button>
            <button className="w-full flex items-center gap-2 p-2 rounded hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 text-sm transition-colors">
              <HelpCircle className="w-4 h-4" />
              Keyboard Shortcuts
            </button>
            <a
              href="https://github.com"
              target="_blank"
              rel="noreferrer"
              className="w-full flex items-center gap-2 p-2 rounded hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 text-sm transition-colors"
            >
              <ExternalLink className="w-4 h-4" />
              GitHub Repository
            </a>
          </div>
        </div>
      </div>
    </>
  );
};

export default MenuDrawer;
```

**Step 2: Run type check**

Run: `npm run type-check`
Expected: No errors

---

## Phase 3: Attack Feed Drawer

### Task 3.1: Create GroupedAttackList Component

**Files:**
- Create: `components/feed/GroupedAttackList.tsx`

**Step 1: Create the component**

```typescript
// components/feed/GroupedAttackList.tsx
import React, { useState, useMemo } from 'react';
import { ChevronDown, ChevronRight, Bot } from 'lucide-react';
import { AttackEvent, AttackType } from '../../types';
import { ATTACK_COLORS } from '../../constants';
import CountryFlag from '../CountryFlag';

interface GroupedAttackListProps {
  attacks: AttackEvent[];
  groupBy: 'source' | 'type' | 'none';
  onAnalyze: (attack: AttackEvent) => void;
}

interface AttackGroup {
  key: string;
  label: string;
  attacks: AttackEvent[];
  color?: string;
}

const GroupedAttackList: React.FC<GroupedAttackListProps> = ({
  attacks,
  groupBy,
  onAnalyze,
}) => {
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set());

  const groups = useMemo((): AttackGroup[] => {
    if (groupBy === 'none') {
      return [{ key: 'all', label: 'All Attacks', attacks }];
    }

    const grouped: Record<string, AttackEvent[]> = {};

    attacks.forEach((attack) => {
      const key = groupBy === 'source' ? attack.source.country : attack.type;
      if (!grouped[key]) grouped[key] = [];
      grouped[key].push(attack);
    });

    return Object.entries(grouped)
      .map(([key, attacks]) => ({
        key,
        label: key,
        attacks,
        color: groupBy === 'type' ? ATTACK_COLORS[key as AttackType] : undefined,
      }))
      .sort((a, b) => b.attacks.length - a.attacks.length);
  }, [attacks, groupBy]);

  const toggleGroup = (key: string) => {
    setExpandedGroups((prev) => {
      const next = new Set(prev);
      if (next.has(key)) {
        next.delete(key);
      } else {
        next.add(key);
      }
      return next;
    });
  };

  // Auto-expand first 3 groups
  React.useEffect(() => {
    if (groupBy !== 'none') {
      setExpandedGroups(new Set(groups.slice(0, 3).map((g) => g.key)));
    }
  }, [groupBy, groups]);

  return (
    <div className="space-y-1">
      {groups.map((group) => {
        const isExpanded = groupBy === 'none' || expandedGroups.has(group.key);

        return (
          <div key={group.key}>
            {/* Group Header */}
            {groupBy !== 'none' && (
              <button
                onClick={() => toggleGroup(group.key)}
                className="w-full flex items-center gap-2 px-2 py-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded transition-colors"
              >
                {isExpanded ? (
                  <ChevronDown className="w-4 h-4 text-slate-400" />
                ) : (
                  <ChevronRight className="w-4 h-4 text-slate-400" />
                )}
                {groupBy === 'source' && <CountryFlag country={group.label} size="sm" />}
                <span
                  className="font-bold text-sm"
                  style={{ color: group.color || 'inherit' }}
                >
                  {group.label}
                </span>
                <span className="ml-auto text-xs text-slate-500 bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded">
                  {group.attacks.length}
                </span>
              </button>
            )}

            {/* Attack Items */}
            {isExpanded && (
              <div className={groupBy !== 'none' ? 'pl-6 space-y-1' : 'space-y-1'}>
                {group.attacks.map((attack) => (
                  <button
                    key={attack.id}
                    onClick={() => onAnalyze(attack)}
                    className="w-full p-2 bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded hover:bg-slate-100 dark:hover:bg-slate-800 hover:border-cyan-500/50 transition-colors text-left group"
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span
                        className="text-[10px] font-bold uppercase px-1.5 py-0.5 rounded"
                        style={{
                          backgroundColor: `${ATTACK_COLORS[attack.type]}20`,
                          color: ATTACK_COLORS[attack.type],
                        }}
                      >
                        {attack.type}
                      </span>
                      <span className="text-[10px] text-slate-500 font-mono">
                        {new Date(attack.timestamp).toLocaleTimeString()}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 text-xs">
                      <span className="text-slate-600 dark:text-slate-400">
                        {attack.source.city}
                      </span>
                      <span className="text-slate-400">→</span>
                      <span className="text-red-600 dark:text-red-400">
                        {attack.target.city}
                      </span>
                      <span className="ml-auto font-bold text-slate-700 dark:text-slate-300">
                        {attack.magnitude.toFixed(1)}
                      </span>
                    </div>
                    <div className="mt-1 flex justify-end opacity-0 group-hover:opacity-100 transition-opacity">
                      <span className="text-[10px] text-cyan-600 dark:text-cyan-400 flex items-center gap-1">
                        <Bot className="w-3 h-3" />
                        Analyze
                      </span>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
};

export default GroupedAttackList;
```

**Step 2: Run type check**

Run: `npm run type-check`
Expected: No errors

---

### Task 3.2: Create AttackFeedDrawer Component

**Files:**
- Create: `components/feed/AttackFeedDrawer.tsx`

**Step 1: Create the component**

```typescript
// components/feed/AttackFeedDrawer.tsx
import React, { useState, useMemo } from 'react';
import { ShieldAlert, Search, X, Trash2 } from 'lucide-react';
import { AttackEvent, AttackType } from '../../types';
import RightDrawer from '../layout/RightDrawer';
import GroupedAttackList from './GroupedAttackList';

interface AttackFeedDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  onToggle: () => void;
  attacks: AttackEvent[];
  selectedType: AttackType | 'ALL';
  onAnalyze: (attack: AttackEvent) => void;
  onClear: () => void;
}

type ViewMode = 'all' | 'bySource' | 'byType';

const AttackFeedDrawer: React.FC<AttackFeedDrawerProps> = ({
  isOpen,
  onClose,
  onToggle,
  attacks,
  selectedType,
  onAnalyze,
  onClear,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [viewMode, setViewMode] = useState<ViewMode>('all');

  // Filter attacks
  const filteredAttacks = useMemo(() => {
    return attacks.filter((attack) => {
      const matchesSearch =
        !searchQuery ||
        attack.source.city.toLowerCase().includes(searchQuery.toLowerCase()) ||
        attack.source.country.toLowerCase().includes(searchQuery.toLowerCase()) ||
        attack.target.city.toLowerCase().includes(searchQuery.toLowerCase()) ||
        attack.target.country.toLowerCase().includes(searchQuery.toLowerCase()) ||
        attack.ip.includes(searchQuery);

      const matchesType = selectedType === 'ALL' || attack.type === selectedType;

      return matchesSearch && matchesType;
    });
  }, [attacks, searchQuery, selectedType]);

  // Count by grouping
  const sourceCount = useMemo(() => {
    const countries = new Set(filteredAttacks.map((a) => a.source.country));
    return countries.size;
  }, [filteredAttacks]);

  const typeCount = useMemo(() => {
    const types = new Set(filteredAttacks.map((a) => a.type));
    return types.size;
  }, [filteredAttacks]);

  const groupBy = viewMode === 'bySource' ? 'source' : viewMode === 'byType' ? 'type' : 'none';

  return (
    <RightDrawer
      isOpen={isOpen}
      onClose={onClose}
      onToggle={onToggle}
      title="THREAT FEED"
      badge={attacks.length}
      icon={<ShieldAlert className="w-5 h-5 text-red-500" />}
    >
      {/* View Mode Tabs */}
      <div className="flex border-b border-slate-200 dark:border-slate-700">
        {[
          { mode: 'all' as ViewMode, label: 'All', count: filteredAttacks.length },
          { mode: 'bySource' as ViewMode, label: 'By Source', count: sourceCount },
          { mode: 'byType' as ViewMode, label: 'By Type', count: typeCount },
        ].map(({ mode, label, count }) => (
          <button
            key={mode}
            onClick={() => setViewMode(mode)}
            className={`flex-1 py-2 text-xs font-bold transition-colors relative ${
              viewMode === mode
                ? 'text-cyan-600 dark:text-cyan-400'
                : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
            }`}
          >
            <span>{label}</span>
            <span className="ml-1 text-[10px] opacity-60">{count}</span>
            {viewMode === mode && (
              <div className="absolute bottom-0 left-2 right-2 h-0.5 bg-cyan-500 rounded-full" />
            )}
          </button>
        ))}
      </div>

      {/* Search */}
      <div className="p-3 border-b border-slate-200 dark:border-slate-700">
        <div className="relative">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="search"
            placeholder="Filter attacks..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg py-2 pl-9 pr-8 text-sm placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:border-transparent"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-white"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {/* Attack List */}
      <div className="flex-1 overflow-y-auto p-2">
        {filteredAttacks.length === 0 ? (
          <div className="text-center py-8 text-slate-500">
            No threats matching criteria
          </div>
        ) : (
          <GroupedAttackList
            attacks={filteredAttacks}
            groupBy={groupBy}
            onAnalyze={onAnalyze}
          />
        )}
      </div>

      {/* Footer */}
      <div className="p-3 border-t border-slate-200 dark:border-slate-700">
        <button
          onClick={onClear}
          className="w-full flex items-center justify-center gap-2 py-2 text-sm text-slate-500 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded transition-colors"
        >
          <Trash2 className="w-4 h-4" />
          Clear History
        </button>
      </div>
    </RightDrawer>
  );
};

export default AttackFeedDrawer;
```

**Step 2: Run type check**

Run: `npm run type-check`
Expected: No errors

---

## Phase 4: Stats Panel

### Task 4.1: Create SummaryTab Component

**Files:**
- Create: `components/stats/SummaryTab.tsx`

**Step 1: Create the component**

```typescript
// components/stats/SummaryTab.tsx
import React from 'react';
import { Activity, Zap, Globe, Target, Wifi, Shield } from 'lucide-react';

interface SummaryTabProps {
  totalAttacks: number;
  attacksPerMinute: number;
  activeCountries: number;
  avgMagnitude: number;
  netLoad: number;
  defconLevel: number;
}

const SummaryTab: React.FC<SummaryTabProps> = ({
  totalAttacks,
  attacksPerMinute,
  activeCountries,
  avgMagnitude,
  netLoad,
  defconLevel,
}) => {
  return (
    <div className="h-full flex flex-col gap-4">
      {/* Main Stats Grid */}
      <div className="grid grid-cols-4 gap-3">
        <div className="bg-slate-50 dark:bg-slate-800/50 rounded-lg p-3">
          <div className="flex items-center gap-2 mb-1">
            <Activity className="w-4 h-4 text-red-500" />
            <span className="text-[10px] text-slate-500 uppercase font-bold">Total</span>
          </div>
          <div className="text-xl font-bold font-mono text-slate-900 dark:text-white">
            {totalAttacks.toLocaleString()}
          </div>
        </div>

        <div className="bg-slate-50 dark:bg-slate-800/50 rounded-lg p-3">
          <div className="flex items-center gap-2 mb-1">
            <Zap className="w-4 h-4 text-orange-500" />
            <span className="text-[10px] text-slate-500 uppercase font-bold">Per Min</span>
          </div>
          <div className="text-xl font-bold font-mono text-slate-900 dark:text-white">
            {attacksPerMinute.toFixed(1)}
          </div>
        </div>

        <div className="bg-slate-50 dark:bg-slate-800/50 rounded-lg p-3">
          <div className="flex items-center gap-2 mb-1">
            <Globe className="w-4 h-4 text-blue-500" />
            <span className="text-[10px] text-slate-500 uppercase font-bold">Countries</span>
          </div>
          <div className="text-xl font-bold font-mono text-slate-900 dark:text-white">
            {activeCountries}
          </div>
        </div>

        <div className="bg-slate-50 dark:bg-slate-800/50 rounded-lg p-3">
          <div className="flex items-center gap-2 mb-1">
            <Target className="w-4 h-4 text-purple-500" />
            <span className="text-[10px] text-slate-500 uppercase font-bold">Avg Mag</span>
          </div>
          <div className="text-xl font-bold font-mono text-slate-900 dark:text-white">
            {avgMagnitude.toFixed(1)}
          </div>
        </div>
      </div>

      {/* Secondary Stats */}
      <div className="flex items-center justify-center gap-8 text-sm">
        <div className="flex items-center gap-2">
          <Wifi className="w-4 h-4 text-cyan-500" />
          <span className="text-slate-500">Net Load:</span>
          <span className="font-mono font-bold text-slate-900 dark:text-white">
            {netLoad.toFixed(1)} TB/s
          </span>
        </div>
        <div className="flex items-center gap-2">
          <Shield className="w-4 h-4 text-yellow-500" />
          <span className="text-slate-500">DEFCON:</span>
          <span className={`font-mono font-bold ${
            defconLevel === 1 ? 'text-red-500' : defconLevel <= 3 ? 'text-orange-500' : 'text-green-500'
          }`}>
            {defconLevel}
          </span>
        </div>
      </div>
    </div>
  );
};

export default SummaryTab;
```

**Step 2: Run type check**

Run: `npm run type-check`
Expected: No errors

---

### Task 4.2: Create StatsPanel Integration Component

**Files:**
- Create: `components/stats/StatsPanel.tsx`

**Step 1: Create the integration component**

```typescript
// components/stats/StatsPanel.tsx
import React, { useMemo } from 'react';
import { AttackEvent } from '../../types';
import BottomPanel from '../layout/BottomPanel';
import SummaryTab from './SummaryTab';
import TrafficStats from '../TrafficStats';
import AttackTypeBar from '../AttackTypeBar';
import ThreatTicker from '../ThreatTicker';

interface StatsPanelProps {
  isOpen: boolean;
  onToggle: () => void;
  attacks: AttackEvent[];
  isDark: boolean;
  selectedType: any;
  onTypeSelect: (type: any) => void;
}

const StatsPanel: React.FC<StatsPanelProps> = ({
  isOpen,
  onToggle,
  attacks,
  isDark,
  selectedType,
  onTypeSelect,
}) => {
  // Calculate stats
  const stats = useMemo(() => {
    const uniqueCountries = new Set(attacks.map((a) => a.source.country));
    const avgMagnitude =
      attacks.length > 0
        ? attacks.reduce((acc, curr) => acc + curr.magnitude, 0) / attacks.length
        : 0;
    const recentAttacks = attacks.filter((a) => Date.now() - a.timestamp < 60000);

    return {
      totalAttacks: attacks.length,
      attacksPerMinute: recentAttacks.length,
      activeCountries: uniqueCountries.size,
      avgMagnitude,
      netLoad: attacks.length * 0.42,
    };
  }, [attacks]);

  // Calculate DEFCON level
  const defconLevel = useMemo(() => {
    if (attacks.length === 0) return 5;
    const recentMagnitude = attacks.slice(-10).reduce((acc, curr) => acc + curr.magnitude, 0);
    const avg = recentMagnitude / 10 || 0;
    if (avg > 7) return 1;
    if (avg > 4) return 3;
    return 5;
  }, [attacks]);

  const tabs = [
    {
      id: 'summary',
      label: 'Summary',
      content: (
        <SummaryTab
          totalAttacks={stats.totalAttacks}
          attacksPerMinute={stats.attacksPerMinute}
          activeCountries={stats.activeCountries}
          avgMagnitude={stats.avgMagnitude}
          netLoad={stats.netLoad}
          defconLevel={defconLevel}
        />
      ),
    },
    {
      id: 'traffic',
      label: 'Traffic',
      content: <TrafficStats attacks={attacks} isDark={isDark} />,
    },
    {
      id: 'types',
      label: 'By Type',
      content: (
        <AttackTypeBar
          attacks={attacks}
          selectedType={selectedType}
          onSelect={onTypeSelect}
        />
      ),
    },
    {
      id: 'timeline',
      label: 'Timeline',
      content: <ThreatTicker />,
    },
  ];

  const previewContent = (
    <>
      <span className="font-mono">{stats.totalAttacks} attacks</span>
      <span className="text-slate-400">|</span>
      <span className="font-mono">{stats.attacksPerMinute}/min</span>
      <span className="text-slate-400">|</span>
      <span className="font-mono">{stats.activeCountries} countries</span>
    </>
  );

  return (
    <BottomPanel
      isOpen={isOpen}
      onToggle={onToggle}
      tabs={tabs}
      previewContent={previewContent}
      defaultTab="summary"
    />
  );
};

export default StatsPanel;
```

**Step 2: Run type check**

Run: `npm run type-check`
Expected: No errors

---

## Phase 5: App Integration

### Task 5.1: Refactor App.tsx with New Layout

**Files:**
- Modify: `App.tsx`

**Step 1: Update imports at top of App.tsx**

Replace the import section with:

```typescript
import React, { useState, useMemo, useEffect, useCallback } from 'react';
import ThreatMap from './components/ThreatMap';
import AnalysisModal from './components/AnalysisModal';
import ToastNotification, { Toast } from './components/ToastNotification';
import MiniHeader from './components/layout/MiniHeader';
import SettingsPopover from './components/layout/SettingsPopover';
import MenuDrawer from './components/layout/MenuDrawer';
import AttackFeedDrawer from './components/feed/AttackFeedDrawer';
import StatsPanel from './components/stats/StatsPanel';
import { useThreatSimulation } from './hooks/useThreatSimulation';
import { useDrawerState } from './hooks/useDrawerState';
import { useSettings } from './hooks/useSettings';
import { useKeyboardShortcuts } from './hooks/useKeyboardShortcuts';
import { AttackEvent, ThreatLevel } from './types';
```

**Step 2: Update App component state and hooks**

Replace the state declarations inside App component with:

```typescript
const App: React.FC = () => {
  // Settings
  const { settings, updateSetting } = useSettings();

  // Simulation hook
  const {
    attacks,
    clearHistory,
    isPaused,
    togglePause,
    switchDataSource,
    isLoadingRealData,
    realDataError,
    apiStatus,
    hasRealDataAPIs,
  } = useThreatSimulation(10, 50);

  // UI State
  const [selectedAttack, setSelectedAttack] = useState<AttackEvent | null>(null);
  const [isDark, setIsDark] = useState(true);
  const [toasts, setToasts] = useState<Toast[]>([]);
  const [lastAttackId, setLastAttackId] = useState<string | null>(null);

  // Panel State
  const feedDrawer = useDrawerState('feed', false);
  const statsPanel = useDrawerState('stats', false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [focusMode, setFocusMode] = useState(false);

  // Keyboard shortcuts
  useKeyboardShortcuts([
    { key: 'f', action: () => setFocusMode(prev => !prev), description: 'Toggle focus mode' },
    { key: ']', action: feedDrawer.toggle, description: 'Toggle attack feed' },
    { key: 's', action: statsPanel.toggle, description: 'Toggle stats panel' },
    { key: ',', ctrl: true, action: () => setSettingsOpen(true), description: 'Open settings' },
    { key: 'Escape', action: () => {
      setSettingsOpen(false);
      setMenuOpen(false);
      feedDrawer.close();
      statsPanel.close();
    }, description: 'Close panels' },
  ]);
```

**Step 3: Keep the existing computed values (threatLevel, liveStats, toast effect)**

Keep these existing useMemo and useEffect hooks as-is:

```typescript
  // Calculate Threat Level
  const threatLevel = useMemo((): ThreatLevel => {
    if (attacks.length === 0) return { level: 'LOW', color: 'text-green-500', bg: 'bg-green-500', border: 'border-green-500' };
    const recentMagnitude = attacks.slice(-10).reduce((acc, curr) => acc + curr.magnitude, 0);
    const avg = recentMagnitude / 10 || 0;
    if (avg > 7) return { level: 'CRITICAL', color: 'text-red-500', bg: 'bg-red-500', border: 'border-red-500' };
    if (avg > 4) return { level: 'ELEVATED', color: 'text-orange-500', bg: 'bg-orange-500', border: 'border-orange-500' };
    return { level: 'LOW', color: 'text-green-500', bg: 'bg-green-500', border: 'border-green-500' };
  }, [attacks]);

  // Toast notification for critical attacks
  useEffect(() => {
    if (attacks.length === 0) return;
    const latestAttack = attacks[attacks.length - 1];
    if (latestAttack.id !== lastAttackId && latestAttack.magnitude >= 7) {
      setLastAttackId(latestAttack.id);
      const newToast: Toast = {
        id: `toast-${latestAttack.id}`,
        attack: latestAttack,
        timestamp: Date.now(),
      };
      setToasts(prev => [...prev.slice(-2), newToast]);
    }
  }, [attacks, lastAttackId]);

  const dismissToast = useCallback((id: string) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  }, []);

  // Reset map view handler
  const handleLogoClick = useCallback(() => {
    // This will be passed to ThreatMap to reset view
  }, []);
```

**Step 4: Replace the return JSX with new layout**

```typescript
  return (
    <div className={`${isDark ? 'dark' : ''} h-screen w-screen overflow-hidden`}>
      <div className="h-full w-full bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-white font-sans transition-colors duration-300">

        {/* Mini Header (hidden in focus mode) */}
        {!focusMode && (
          <MiniHeader
            threatLevel={threatLevel}
            isPaused={isPaused}
            isDark={isDark}
            onTogglePause={togglePause}
            onToggleTheme={() => setIsDark(!isDark)}
            onOpenSettings={() => setSettingsOpen(true)}
            onOpenMenu={() => setMenuOpen(true)}
            onLogoClick={handleLogoClick}
          />
        )}

        {/* Settings Popover */}
        <SettingsPopover
          isOpen={settingsOpen}
          onClose={() => setSettingsOpen(false)}
          settings={settings}
          onUpdateSetting={updateSetting}
          hasRealDataAPIs={hasRealDataAPIs}
        />

        {/* Menu Drawer */}
        <MenuDrawer
          isOpen={menuOpen}
          onClose={() => setMenuOpen(false)}
          activeThreats={attacks.length}
          apiStatus={apiStatus}
        />

        {/* Main Content - Full viewport map */}
        <main className={`h-full w-full ${!focusMode ? 'pt-12' : ''} ${!focusMode && statsPanel.isOpen ? 'pb-[200px]' : !focusMode ? 'pb-[44px]' : ''}`}>
          <ThreatMap
            attacks={attacks}
            selectedType={settings.selectedType}
            onTypeChange={(type) => updateSetting('selectedType', type)}
            onAnalyze={setSelectedAttack}
            isDark={isDark}
          />
        </main>

        {/* Attack Feed Drawer (hidden in focus mode) */}
        {!focusMode && (
          <AttackFeedDrawer
            isOpen={feedDrawer.isOpen}
            onClose={feedDrawer.close}
            onToggle={feedDrawer.toggle}
            attacks={attacks}
            selectedType={settings.selectedType}
            onAnalyze={setSelectedAttack}
            onClear={clearHistory}
          />
        )}

        {/* Stats Panel (hidden in focus mode) */}
        {!focusMode && (
          <StatsPanel
            isOpen={statsPanel.isOpen}
            onToggle={statsPanel.toggle}
            attacks={attacks}
            isDark={isDark}
            selectedType={settings.selectedType}
            onTypeSelect={(type) => updateSetting('selectedType', type)}
          />
        )}

        {/* Modals */}
        <AnalysisModal attack={selectedAttack} onClose={() => setSelectedAttack(null)} />

        {/* Toast Notifications */}
        <ToastNotification
          toasts={toasts}
          onDismiss={dismissToast}
          onAnalyze={setSelectedAttack}
        />

        {/* Focus Mode Indicator */}
        {focusMode && (
          <div className="fixed bottom-4 left-4 z-50 bg-black/50 text-white text-xs px-3 py-1.5 rounded-full backdrop-blur">
            Focus Mode • Press <kbd className="bg-white/20 px-1 rounded">F</kbd> to exit
          </div>
        )}
      </div>
    </div>
  );
};

export default App;
```

**Step 5: Run type check and dev server**

Run: `npm run type-check && npm run dev`
Expected: No type errors, app runs with new layout

---

### Task 5.2: Final Verification

**Step 1: Test keyboard shortcuts**

1. Press `F` - Should toggle focus mode
2. Press `]` - Should toggle attack feed drawer
3. Press `S` - Should toggle stats panel
4. Press `Ctrl+,` - Should open settings
5. Press `Escape` - Should close all panels

**Step 2: Test responsive behavior**

1. Resize browser to mobile width
2. Verify drawers show backdrop on mobile
3. Verify stats panel collapses properly

**Step 3: Test dark/light theme**

1. Click theme toggle
2. Verify all new components respect theme

---

## Summary

**Files Created (12):**
- `hooks/useKeyboardShortcuts.ts`
- `hooks/useDrawerState.ts`
- `hooks/useSettings.ts`
- `components/layout/RightDrawer.tsx`
- `components/layout/BottomPanel.tsx`
- `components/layout/MiniHeader.tsx`
- `components/layout/SettingsPopover.tsx`
- `components/layout/MenuDrawer.tsx`
- `components/feed/GroupedAttackList.tsx`
- `components/feed/AttackFeedDrawer.tsx`
- `components/stats/SummaryTab.tsx`
- `components/stats/StatsPanel.tsx`

**Files Modified (2):**
- `index.css` - Added animations
- `App.tsx` - New layout integration

**Files to Remove After Verification (5):**
- `components/AttackFeed.tsx`
- `components/LiveStatsCounter.tsx`
- *(Keep TrafficStats, AttackTypeBar, ThreatTicker - used inside StatsPanel)*
