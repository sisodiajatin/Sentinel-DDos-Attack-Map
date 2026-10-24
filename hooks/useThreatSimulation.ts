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

  // API status - check via API endpoint (env vars aren't available in browser)
  const [apiStatus, setApiStatus] = useState<{ abuseipdb: boolean; otx: boolean }>({ abuseipdb: false, otx: false });
  const [hasRealDataAPIs, setHasRealDataAPIs] = useState(false);
  const apiStatusChecked = useRef(false);

  // Check API status on mount via the API endpoint
  useEffect(() => {
    if (apiStatusChecked.current) return;
    apiStatusChecked.current = true;

    const checkApiStatus = async () => {
      try {
        const status = await apiClient.getAPIStatus();
        setApiStatus({ abuseipdb: status.abuseipdb, otx: status.otx });
        setHasRealDataAPIs(status.abuseipdb || status.otx);
      } catch {
        // Fallback to local check if API unavailable
        setApiStatus(getAPIStatus());
        setHasRealDataAPIs(isRealDataAvailable());
      }
    };
    checkApiStatus();
  }, []);

  // Initialize history once on mount: restore from IndexedDB, else generate.
  // Deliberately independent of dataSource, so switching sources does not
  // reload the cache or tear down the replay history service.
  useEffect(() => {
    let cancelled = false;

    const initHistory = async () => {
      try {
        await attackHistoryService.init();
      } catch (error) {
        console.warn('Failed to init attack history:', error);
      }

      if (persistHistory) {
        try {
          await localDB.init();
          const storedAttacks = await localDB.getRecentAttacks(maxHistory);
          if (cancelled) return;
          if (storedAttacks.length > 0) {
            setAttacks(storedAttacks);
            setIsInitialized(true);
            return;
          }
        } catch (error) {
          console.warn('Failed to load from IndexedDB:', error);
        }
      }

      if (cancelled) return;
      setAttacks(generateHistory(initialCount));
      setIsInitialized(true);
    };

    initHistory();

    return () => {
      cancelled = true;
      attackHistoryService.dispose();
    };
  }, [initialCount, maxHistory, persistHistory]);

  // When the user switches to a live source, pull a fresh batch from the
  // server-side stream (falls back to curated local intel, then simulation).
  useEffect(() => {
    if (!isInitialized) return;
    if (dataSource === 'simulation' || !hasRealDataAPIs) return;

    let cancelled = false;

    const loadLiveBatch = async () => {
      setIsLoadingRealData(true);
      try {
        const streamResponse = await apiClient.getThreatStream(initialCount);
        let batch = streamResponse.attacks;
        if (batch.length === 0) {
          batch = (await fetchRealThreatData()).slice(0, initialCount);
        }
        if (cancelled) return;

        if (batch.length > 0) {
          setAttacks((prev) => [...prev, ...batch].slice(-maxHistory));
          if (persistHistory) {
            await localDB.saveAttacks(batch).catch((e) => console.warn('Failed to persist batch:', e));
          }
          await attackHistoryService.saveAttacks(batch).catch((e) => console.warn('Failed to save batch to history:', e));
          setRealDataError(null);
        } else {
          setRealDataError('No real threat data available, using simulation');
        }
      } catch (error) {
        console.error('Failed to fetch real threat data:', error);
        if (!cancelled) setRealDataError('Failed to fetch real data, using simulation');
      } finally {
        if (!cancelled) setIsLoadingRealData(false);
      }
    };

    loadLiveBatch();
    return () => {
      cancelled = true;
    };
  }, [dataSource, hasRealDataAPIs, isInitialized, initialCount, maxHistory, persistHistory]);

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
      // Always stop: previously hybrid mode left the stream's interval and
      // periodic refetches running after switching away.
      threatIntelStream.stop();
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
    // Also clear the replay timeline, otherwise replay keeps showing old data.
    try {
      await attackHistoryService.clear();
    } catch (error) {
      console.warn('Failed to clear attack history:', error);
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
