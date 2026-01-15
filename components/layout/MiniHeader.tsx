import React from 'react';
import { Shield, Pause, Play, Settings, Menu, Sun, Moon, Globe, Map as MapIcon } from 'lucide-react';
import { ThreatLevel, MapViewMode } from '../../types';

interface MiniHeaderProps {
  threatLevel: ThreatLevel;
  isPaused: boolean;
  isDark: boolean;
  viewMode: MapViewMode;
  onViewModeChange: (mode: MapViewMode) => void;
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
  viewMode,
  onViewModeChange,
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

        {/* Center: View Mode Toggle */}
        <div className="absolute left-1/2 -translate-x-1/2 flex bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg p-1">
          <button
            onClick={() => onViewModeChange('GLOBE')}
            className={`p-1.5 rounded transition-all ${viewMode === 'GLOBE' ? 'bg-white dark:bg-slate-700 text-cyan-600 dark:text-cyan-400 shadow-sm' : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-300'}`}
            title="Globe View"
          >
            <Globe className="w-4 h-4" />
          </button>
          <button
            onClick={() => onViewModeChange('PLANAR')}
            className={`p-1.5 rounded transition-all ${viewMode === 'PLANAR' ? 'bg-white dark:bg-slate-700 text-cyan-600 dark:text-cyan-400 shadow-sm' : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-300'}`}
            title="Planar Map View"
          >
            <MapIcon className="w-4 h-4" />
          </button>
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
