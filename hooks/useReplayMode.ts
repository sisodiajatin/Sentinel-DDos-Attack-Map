/**
 * Replay Mode Hook
 * State machine for controlling attack history playback.
 */

import { useState, useCallback, useEffect, useRef } from 'react';
import { AttackEvent } from '../types';
import { attackHistoryService } from '../services/attackHistoryService';

export type PlaybackSpeed = 0.5 | 1 | 2 | 4;

export interface ReplayState {
  isReplaying: boolean;
  currentTimestamp: number;
  playbackSpeed: PlaybackSpeed;
  isPlaying: boolean;
  timeRange: { earliest: number; latest: number } | null;
  attacksAtTime: AttackEvent[];
  totalInRange: number;
  density: number[];
}

export interface ReplayActions {
  enterReplay: (timestamp?: number) => Promise<void>;
  exitReplay: () => void;
  play: () => void;
  pause: () => void;
  togglePlayPause: () => void;
  seek: (timestamp: number) => void;
  seekRelative: (deltaMs: number) => void;
  setSpeed: (speed: PlaybackSpeed) => void;
  refreshTimeRange: () => Promise<void>;
}

const ATTACK_WINDOW_MS = 5000; // Show attacks from last 5 seconds
const DENSITY_BUCKETS = 100;

export function useReplayMode(): ReplayState & ReplayActions {
  const [isReplaying, setIsReplaying] = useState(false);
  const [currentTimestamp, setCurrentTimestamp] = useState(() => Date.now());
  const [playbackSpeed, setPlaybackSpeed] = useState<PlaybackSpeed>(1);
  const [isPlaying, setIsPlaying] = useState(false);
  const [timeRange, setTimeRange] = useState<{ earliest: number; latest: number } | null>(null);
  const [attacksAtTime, setAttacksAtTime] = useState<AttackEvent[]>([]);
  const [totalInRange, setTotalInRange] = useState(0);
  const [density, setDensity] = useState<number[]>([]);

  const animationFrameRef = useRef<number | null>(null);
  const lastFrameTimeRef = useRef<number>(0);

  // Fetch attacks at current timestamp
  const fetchAttacksAtTime = useCallback(async (timestamp: number) => {
    try {
      const attacks = await attackHistoryService.getAttacksAtTime(timestamp, ATTACK_WINDOW_MS);
      setAttacksAtTime(attacks);
    } catch (error) {
      console.warn('Failed to fetch attacks at time:', error);
    }
  }, []);

  // Refresh time range and density
  const refreshTimeRange = useCallback(async () => {
    try {
      const range = await attackHistoryService.getTimeRange();
      setTimeRange(range);

      if (range) {
        const count = await attackHistoryService.getCount();
        setTotalInRange(count);

        const densityData = await attackHistoryService.getAttackDensity(
          range.earliest,
          range.latest,
          DENSITY_BUCKETS
        );
        setDensity(densityData);
      }
    } catch (error) {
      console.warn('Failed to refresh time range:', error);
    }
  }, []);

  // Enter replay mode
  const enterReplay = useCallback(async (timestamp?: number) => {
    await refreshTimeRange();

    const range = await attackHistoryService.getTimeRange();
    if (!range) {
      console.warn('No attack history available for replay');
      return;
    }

    const startTime = timestamp ?? range.latest;
    setCurrentTimestamp(startTime);
    setIsReplaying(true);
    setIsPlaying(false);

    await fetchAttacksAtTime(startTime);
  }, [refreshTimeRange, fetchAttacksAtTime]);

  // Exit replay mode
  const exitReplay = useCallback(() => {
    setIsReplaying(false);
    setIsPlaying(false);
    setCurrentTimestamp(Date.now());
    setAttacksAtTime([]);

    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = null;
    }
  }, []);

  // Play
  const play = useCallback(() => {
    if (!isReplaying) return;
    setIsPlaying(true);
    lastFrameTimeRef.current = performance.now();
  }, [isReplaying]);

  // Pause
  const pause = useCallback(() => {
    setIsPlaying(false);
  }, []);

  // Toggle play/pause
  const togglePlayPause = useCallback(() => {
    if (isPlaying) {
      pause();
    } else {
      play();
    }
  }, [isPlaying, play, pause]);

  // Seek to specific timestamp
  const seek = useCallback((timestamp: number) => {
    if (!timeRange) return;

    const clampedTime = Math.max(
      timeRange.earliest,
      Math.min(timeRange.latest, timestamp)
    );

    setCurrentTimestamp(clampedTime);
    fetchAttacksAtTime(clampedTime);
  }, [timeRange, fetchAttacksAtTime]);

  // Seek relative to current position
  const seekRelative = useCallback((deltaMs: number) => {
    setCurrentTimestamp(prev => {
      if (!timeRange) return prev;

      const newTime = Math.max(
        timeRange.earliest,
        Math.min(timeRange.latest, prev + deltaMs)
      );

      fetchAttacksAtTime(newTime);
      return newTime;
    });
  }, [timeRange, fetchAttacksAtTime]);

  // Set playback speed
  const setSpeed = useCallback((speed: PlaybackSpeed) => {
    setPlaybackSpeed(speed);
  }, []);

  // Playback animation loop
  useEffect(() => {
    if (!isReplaying || !isPlaying || !timeRange) {
      return;
    }

    const animate = (frameTime: number) => {
      const deltaTime = frameTime - lastFrameTimeRef.current;
      lastFrameTimeRef.current = frameTime;

      // Advance timestamp based on playback speed
      const advanceMs = deltaTime * playbackSpeed;

      setCurrentTimestamp(prev => {
        const newTime = prev + advanceMs;

        // Stop at end of range
        if (newTime >= timeRange.latest) {
          setIsPlaying(false);
          return timeRange.latest;
        }

        return newTime;
      });

      animationFrameRef.current = requestAnimationFrame(animate);
    };

    lastFrameTimeRef.current = performance.now();
    animationFrameRef.current = requestAnimationFrame(animate);

    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
        animationFrameRef.current = null;
      }
    };
  }, [isReplaying, isPlaying, playbackSpeed, timeRange]);

  // Fetch attacks when timestamp changes during playback
  useEffect(() => {
    if (isReplaying && isPlaying) {
      // Throttle fetches during playback
      const throttleMs = 100;
      const handler = setTimeout(() => {
        fetchAttacksAtTime(currentTimestamp);
      }, throttleMs);

      return () => clearTimeout(handler);
    }
  }, [isReplaying, isPlaying, currentTimestamp, fetchAttacksAtTime]);

  return {
    // State
    isReplaying,
    currentTimestamp,
    playbackSpeed,
    isPlaying,
    timeRange,
    attacksAtTime,
    totalInRange,
    density,
    // Actions
    enterReplay,
    exitReplay,
    play,
    pause,
    togglePlayPause,
    seek,
    seekRelative,
    setSpeed,
    refreshTimeRange,
  };
}

export default useReplayMode;
