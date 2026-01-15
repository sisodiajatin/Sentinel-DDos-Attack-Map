import React, { useMemo } from 'react';
import { AttackEvent, AttackType } from '../../types';
import BottomPanel from '../layout/BottomPanel';
import SummaryTab from './SummaryTab';
import TrafficStats from '../TrafficStats';
import AttackTypeBar from '../AttackTypeBar';
import ThreatTicker from '../ThreatTicker';
import ReplayTab from './ReplayTab';
import { PlaybackSpeed } from '../../hooks/useReplayMode';

interface ReplayProps {
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

interface StatsPanelProps {
  isOpen: boolean;
  onToggle: () => void;
  attacks: AttackEvent[];
  isDark: boolean;
  selectedType: AttackType | 'ALL';
  onTypeSelect: (type: AttackType) => void;
  replay?: ReplayProps;
}

const StatsPanel: React.FC<StatsPanelProps> = ({
  isOpen,
  onToggle,
  attacks,
  isDark,
  selectedType,
  onTypeSelect,
  replay,
}) => {
  // Calculate stats - use latest attack timestamp as reference for "recent" calculation
  const stats = useMemo(() => {
    const uniqueCountries = new Set(attacks.map((a) => a.source.country));
    const avgMagnitude =
      attacks.length > 0
        ? attacks.reduce((acc, curr) => acc + curr.magnitude, 0) / attacks.length
        : 0;

    // Use the latest attack timestamp as reference point (avoids impure Date.now())
    const latestTimestamp = attacks.length > 0
      ? Math.max(...attacks.map(a => a.timestamp))
      : 0;
    const recentAttacks = attacks.filter((a) => latestTimestamp - a.timestamp < 60000);

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
    ...(replay
      ? [
          {
            id: 'replay',
            label: replay.isReplaying ? 'Replay' : 'Replay',
            badge: replay.isReplaying ? 'ACTIVE' : undefined,
            content: (
              <ReplayTab
                isReplaying={replay.isReplaying}
                isPlaying={replay.isPlaying}
                currentTimestamp={replay.currentTimestamp}
                playbackSpeed={replay.playbackSpeed}
                timeRange={replay.timeRange}
                attacksAtTimeCount={replay.attacksAtTimeCount}
                totalInRange={replay.totalInRange}
                density={replay.density}
                onEnterReplay={replay.onEnterReplay}
                onExitReplay={replay.onExitReplay}
                onPlay={replay.onPlay}
                onPause={replay.onPause}
                onSeek={replay.onSeek}
                onSeekRelative={replay.onSeekRelative}
                onSetSpeed={replay.onSetSpeed}
              />
            ),
          },
        ]
      : []),
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
