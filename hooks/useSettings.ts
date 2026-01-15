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
