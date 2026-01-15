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
      className="fixed top-14 left-4 z-50 w-72 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg shadow-xl animate-fade-in"
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
