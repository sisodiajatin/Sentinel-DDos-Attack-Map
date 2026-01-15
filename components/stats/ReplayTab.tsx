/**
 * Replay Tab Component
 * Timeline controls for attack history playback.
 */

import React, { useCallback, useMemo, useRef } from 'react';
import { Play, Pause, SkipBack, SkipForward, Radio } from 'lucide-react';
import { PlaybackSpeed } from '../../hooks/useReplayMode';

interface ReplayTabProps {
  isReplaying: boolean;
  isPlaying: boolean;
  currentTimestamp: number;
  playbackSpeed: PlaybackSpeed;
  timeRange: { earliest: number; latest: number } | null;
  attacksAtTimeCount: number;
  totalInRange: number;
  density: number[];
  onEnterReplay: () => void;
  onExitReplay: () => void;
  onPlay: () => void;
  onPause: () => void;
  onSeek: (timestamp: number) => void;
  onSeekRelative: (deltaMs: number) => void;
  onSetSpeed: (speed: PlaybackSpeed) => void;
}

const SPEEDS: PlaybackSpeed[] = [0.5, 1, 2, 4];
const SKIP_MS = 60 * 1000; // 1 minute

const ReplayTab: React.FC<ReplayTabProps> = ({
  isReplaying,
  isPlaying,
  currentTimestamp,
  playbackSpeed,
  timeRange,
  attacksAtTimeCount,
  totalInRange,
  density,
  onEnterReplay,
  onExitReplay,
  onPlay,
  onPause,
  onSeek,
  onSeekRelative,
  onSetSpeed,
}) => {
  const scrubBarRef = useRef<HTMLDivElement>(null);

  // Calculate progress (0-1)
  const progress = useMemo(() => {
    if (!timeRange) return 0;
    const range = timeRange.latest - timeRange.earliest;
    if (range <= 0) return 0;
    return (currentTimestamp - timeRange.earliest) / range;
  }, [currentTimestamp, timeRange]);

  // Format timestamp for display
  const formatTime = useCallback((timestamp: number) => {
    return new Date(timestamp).toLocaleTimeString([], {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    });
  }, []);

  // Handle scrub bar click/drag
  const handleScrub = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      if (!scrubBarRef.current || !timeRange) return;

      const rect = scrubBarRef.current.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const percentage = Math.max(0, Math.min(1, x / rect.width));
      const timestamp =
        timeRange.earliest + percentage * (timeRange.latest - timeRange.earliest);

      onSeek(timestamp);
    },
    [timeRange, onSeek]
  );

  // Handle mouse drag on scrub bar
  const handleMouseDown = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      handleScrub(e);

      const handleMouseMove = (moveEvent: MouseEvent) => {
        if (!scrubBarRef.current || !timeRange) return;

        const rect = scrubBarRef.current.getBoundingClientRect();
        const x = moveEvent.clientX - rect.left;
        const percentage = Math.max(0, Math.min(1, x / rect.width));
        const timestamp =
          timeRange.earliest + percentage * (timeRange.latest - timeRange.earliest);

        onSeek(timestamp);
      };

      const handleMouseUp = () => {
        document.removeEventListener('mousemove', handleMouseMove);
        document.removeEventListener('mouseup', handleMouseUp);
      };

      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
    },
    [handleScrub, timeRange, onSeek]
  );

  // Calculate max density for visualization
  const maxDensity = useMemo(() => Math.max(...density, 1), [density]);

  // Not replaying - show "Enter Replay" state
  if (!isReplaying) {
    return (
      <div className="flex flex-col items-center justify-center h-full py-4 space-y-3">
        <div className="text-slate-500 dark:text-slate-400 text-sm text-center">
          {timeRange ? (
            <>
              <span className="font-mono">{totalInRange}</span> attacks available
              <br />
              <span className="text-xs text-slate-400">
                {formatTime(timeRange.earliest)} - {formatTime(timeRange.latest)}
              </span>
            </>
          ) : (
            'No attack history available yet'
          )}
        </div>
        <button
          onClick={onEnterReplay}
          disabled={!timeRange || totalInRange === 0}
          className="flex items-center gap-2 px-4 py-2 bg-orange-500 hover:bg-orange-600 disabled:bg-slate-300 dark:disabled:bg-slate-700 text-white rounded-lg font-medium text-sm transition-colors disabled:cursor-not-allowed"
        >
          <Play className="w-4 h-4" />
          Enter Replay Mode
        </button>
      </div>
    );
  }

  // Replaying - show full controls
  return (
    <div className="flex flex-col h-full p-3 space-y-3">
      {/* Scrub Bar */}
      <div className="relative">
        {/* Density Visualization */}
        <div className="absolute inset-0 flex items-end gap-px pointer-events-none">
          {density.map((count, i) => (
            <div
              key={i}
              className="flex-1 bg-orange-300 dark:bg-orange-700 rounded-t-sm opacity-50"
              style={{ height: `${(count / maxDensity) * 100}%` }}
            />
          ))}
        </div>

        {/* Scrub Track */}
        <div
          ref={scrubBarRef}
          onClick={handleScrub}
          onMouseDown={handleMouseDown}
          className="relative h-8 bg-slate-200 dark:bg-slate-700 rounded-lg cursor-pointer overflow-hidden"
        >
          {/* Progress Fill */}
          <div
            className="absolute left-0 top-0 h-full bg-orange-500/30 dark:bg-orange-500/40"
            style={{ width: `${progress * 100}%` }}
          />

          {/* Playhead */}
          <div
            className="absolute top-0 h-full w-1 bg-orange-500 shadow-lg"
            style={{ left: `calc(${progress * 100}% - 2px)` }}
          >
            <div className="absolute -top-1 -left-1.5 w-4 h-4 bg-orange-500 rounded-full border-2 border-white dark:border-slate-900 shadow-lg" />
          </div>
        </div>

        {/* Time Labels */}
        <div className="flex justify-between mt-1 text-[10px] font-mono text-slate-500">
          <span>{timeRange ? formatTime(timeRange.earliest) : '--:--'}</span>
          <span className="text-orange-600 dark:text-orange-400 font-bold">
            {formatTime(currentTimestamp)}
          </span>
          <span>{timeRange ? formatTime(timeRange.latest) : '--:--'}</span>
        </div>
      </div>

      {/* Controls Row */}
      <div className="flex items-center justify-between gap-2">
        {/* Playback Controls */}
        <div className="flex items-center gap-1">
          {/* Skip Back */}
          <button
            onClick={() => onSeekRelative(-SKIP_MS)}
            className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-400 transition-colors"
            title="Skip back 1 minute"
          >
            <SkipBack className="w-4 h-4" />
          </button>

          {/* Play/Pause */}
          <button
            onClick={isPlaying ? onPause : onPlay}
            className="p-2 rounded-lg bg-orange-500 hover:bg-orange-600 text-white transition-colors"
            title={isPlaying ? 'Pause' : 'Play'}
          >
            {isPlaying ? (
              <Pause className="w-5 h-5" />
            ) : (
              <Play className="w-5 h-5" />
            )}
          </button>

          {/* Skip Forward */}
          <button
            onClick={() => onSeekRelative(SKIP_MS)}
            className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-400 transition-colors"
            title="Skip forward 1 minute"
          >
            <SkipForward className="w-4 h-4" />
          </button>
        </div>

        {/* Speed Selector */}
        <div className="flex items-center gap-1">
          <span className="text-[10px] text-slate-500 mr-1">Speed</span>
          <select
            value={playbackSpeed}
            onChange={(e) => onSetSpeed(parseFloat(e.target.value) as PlaybackSpeed)}
            className="bg-slate-100 dark:bg-slate-800 border border-slate-300 dark:border-slate-600 rounded text-xs text-slate-700 dark:text-slate-300 px-2 py-1 focus:outline-none focus:border-orange-500"
          >
            {SPEEDS.map((speed) => (
              <option key={speed} value={speed}>
                {speed}x
              </option>
            ))}
          </select>
        </div>

        {/* LIVE Button */}
        <button
          onClick={onExitReplay}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-green-500 hover:bg-green-600 text-white rounded-lg text-xs font-bold transition-colors"
          title="Return to live view"
        >
          <Radio className="w-3 h-3 animate-pulse" />
          LIVE
        </button>
      </div>

      {/* Stats Row */}
      <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400 border-t border-slate-200 dark:border-slate-700 pt-2">
        <span>
          Attacks at this time:{' '}
          <span className="font-mono text-orange-600 dark:text-orange-400">
            {attacksAtTimeCount}
          </span>
        </span>
        <span>
          Total in range:{' '}
          <span className="font-mono text-slate-700 dark:text-slate-300">
            {totalInRange.toLocaleString()}
          </span>
        </span>
      </div>
    </div>
  );
};

export default ReplayTab;
