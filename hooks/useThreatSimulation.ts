import { useState, useEffect, useCallback, useRef } from 'react';
import { AttackEvent } from '../types';
import { generateRandomAttack, generateHistory } from '../services/threatData';
import {
  threatIntelStream,
  isRealDataAvailable,
  getAPIStatus,
  fetchRealThreatData
} from '../services/threatIntelligence';
import { localDB } from '../services/localDB';
import { apiClient } from '../services/apiClient';
import { attackHistoryService } from '../services/attackHistoryService';

export type DataSource = 'simulation' | 'real' | 'hybrid';

export interface ThreatSimulationOptions {
  initialCount?: number;
  maxHistory?: number;
  defaultSource?: DataSource;
  persistHistory?: boolean;
}

export const useThreatSimulation = (
  initialCount: number = 10,
  maxHistory: number = 50,
  persistHistory: boolean = true
) => {
  const [attacks, setAttacks] = useState<AttackEvent[]>([]);
  const intervalRef = useRef<number | null>(null);
  const [isPaused, setIsPaused] = useState(false);
  const [dataSource, setDataSource] = useState<DataSource>('simulation');
  const [isLoadingRealData, setIsLoadingRealData] = useState(false);
  const [realDataError, setRealDataError] = useState<string | null>(null);
  const [isInitialized, setIsInitialized] = useState(false);

  // Check if real data APIs are available
  const apiStatus = getAPIStatus();
  const hasRealDataAPIs = isRealDataAvailable();

  // Initialize History - load from IndexedDB if persistence enabled
  useEffect(() => {
    const initHistory = async () => {
      // Initialize attack history service for replay mode
      await attackHistoryService.init();

      // Try to load from IndexedDB first if persistence is enabled
      if (persistHistory) {
        try {
          await localDB.init();
          const storedAttacks = await localDB.getRecentAttacks(maxHistory);

          if (storedAttacks.length > 0) {
            setAttacks(storedAttacks);
            setIsInitialized(true);
            return;
          }
        } catch (error) {
          console.warn('Failed to load from IndexedDB:', error);
        }
      }

      // No stored data - generate fresh
      if (dataSource === 'real' && hasRealDataAPIs) {
        setIsLoadingRealData(true);
        try {
          // Try API proxy first
          const streamResponse = await apiClient.getThreatStream(initialCount);
          if (streamResponse.attacks.length > 0) {
            setAttacks(streamResponse.attacks);
            if (persistHistory) {
              await localDB.saveAttacks(streamResponse.attacks);
            }
            setRealDataError(null);
          } else {
            // Fallback to local threat intel
            const realAttacks = await fetchRealThreatData();
            if (realAttacks.length > 0) {
              setAttacks(realAttacks.slice(0, initialCount));
              setRealDataError(null);
            } else {
              setAttacks(generateHistory(initialCount));
              setRealDataError('No real threat data available, using simulation');
            }
          }
        } catch (error) {
          console.error('Failed to fetch real threat data:', error);
          setAttacks(generateHistory(initialCount));
          setRealDataError('Failed to fetch real data, using simulation');
        } finally {
          setIsLoadingRealData(false);
        }
      } else {
        setAttacks(generateHistory(initialCount));
      }

      setIsInitialized(true);
    };

    initHistory();

    // Cleanup attack history service on unmount
    return () => {
      attackHistoryService.dispose();
    };
  }, [initialCount, dataSource, hasRealDataAPIs, maxHistory, persistHistory]);

  // Save new attacks to IndexedDB
  const addAttack = useCallback(async (attack: AttackEvent) => {
    setAttacks((prev) => {
      const updated = [...prev, attack];
      if (updated.length > maxHistory) {
        return updated.slice(updated.length - maxHistory);
      }
      return updated;
    });

    // Persist to IndexedDB asynchronously
    if (persistHistory) {
      try {
        await localDB.saveAttack(attack);
      } catch (error) {
        console.warn('Failed to save attack to IndexedDB:', error);
      }
    }

    // Save to attack history for replay mode
    try {
      await attackHistoryService.saveAttack(attack);
    } catch (error) {
      console.warn('Failed to save attack to history:', error);
    }
  }, [maxHistory, persistHistory]);

  // Real data stream subscription
  useEffect(() => {
    if (dataSource !== 'real' && dataSource !== 'hybrid') return;
    if (isPaused) return;
    if (!hasRealDataAPIs) return;

    const unsubscribe = threatIntelStream.subscribe((attack) => {
      addAttack(attack);
    });

    threatIntelStream.start(3000);

    return () => {
      unsubscribe();
      if (dataSource === 'real') {
        threatIntelStream.stop();
      }
    };
  }, [dataSource, isPaused, hasRealDataAPIs, addAttack]);

  // Simulation Loop (for simulation and hybrid modes)
  useEffect(() => {
    if (dataSource === 'real') return;
    if (isPaused) return;

    const interval = dataSource === 'hybrid' ? 4000 : 2000;

    intervalRef.current = window.setInterval(() => {
      const newAttack = generateRandomAttack();
      addAttack(newAttack);
    }, interval);

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [isPaused, dataSource, addAttack]);

  const clearHistory = useCallback(async () => {
    setAttacks([]);
    if (persistHistory) {
      try {
        await localDB.clear();
      } catch (error) {
        console.warn('Failed to clear IndexedDB:', error);
      }
    }
  }, [persistHistory]);

  const togglePause = useCallback(() => {
    setIsPaused(prev => !prev);
  }, []);

  const switchDataSource = useCallback((source: DataSource) => {
    if (source === 'real' && !hasRealDataAPIs) {
      setRealDataError('No threat intelligence APIs configured. Add API keys to .env file.');
      return;
    }
    setDataSource(source);
    setRealDataError(null);
  }, [hasRealDataAPIs]);

  // Export attack history as JSON (useful for debugging/backup)
  const exportHistory = useCallback(async () => {
    if (persistHistory) {
      return await localDB.exportToJSON();
    }
    return JSON.stringify(attacks, null, 2);
  }, [attacks, persistHistory]);

  return {
    attacks,
    clearHistory,
    isPaused,
    togglePause,
    dataSource,
    switchDataSource,
    isLoadingRealData,
    realDataError,
    apiStatus,
    hasRealDataAPIs,
    isInitialized,
    exportHistory,
  };
};
