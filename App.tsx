import React, { useState, useMemo, useEffect, useCallback } from 'react';
import ThreatMap from './components/ThreatMap';
import AnalysisModal from './components/AnalysisModal';
import MiniHeader from './components/layout/MiniHeader';
import SettingsPopover from './components/layout/SettingsPopover';
import MenuDrawer from './components/layout/MenuDrawer';
import AttackFeedDrawer from './components/feed/AttackFeedDrawer';
import StatsPanel from './components/stats/StatsPanel';
import { useThreatSimulation } from './hooks/useThreatSimulation';
import { useDrawerState } from './hooks/useDrawerState';
import { useSettings } from './hooks/useSettings';
import { useKeyboardShortcuts } from './hooks/useKeyboardShortcuts';
import { useReplayMode } from './hooks/useReplayMode';
import { AttackEvent, ThreatLevel, MapViewMode } from './types';

const App: React.FC = () => {
  // Settings
  const { settings, updateSetting } = useSettings();

  // Simulation hook
  const {
    attacks,
    clearHistory,
    isPaused,
    togglePause,
    apiStatus,
    hasRealDataAPIs,
  } = useThreatSimulation(10, 50);

  // Replay mode hook
  const replay = useReplayMode();

  // Periodically refresh replay time range to keep counts current
  useEffect(() => {
    // Refresh on mount and every 30 seconds
    replay.refreshTimeRange();
    const interval = setInterval(() => {
      if (!replay.isReplaying) {
        replay.refreshTimeRange();
      }
    }, 30000);
    return () => clearInterval(interval);
  }, [replay.isReplaying, replay.refreshTimeRange]);

  // UI State
  const [selectedAttack, setSelectedAttack] = useState<AttackEvent | null>(null);
  const [isDark, setIsDark] = useState(true);
  const [viewMode, setViewMode] = useState<MapViewMode>('GLOBE');

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
    // Replay mode shortcuts
    { key: 'r', action: () => {
      if (!replay.isReplaying) {
        replay.enterReplay();
        statsPanel.open();
      }
    }, description: 'Open replay tab' },
    { key: ' ', action: () => {
      if (replay.isReplaying) {
        replay.togglePlayPause();
      }
    }, description: 'Play/pause replay' },
    { key: 'ArrowLeft', action: () => {
      if (replay.isReplaying) {
        replay.seekRelative(-10000); // 10 seconds
      }
    }, description: 'Scrub back 10 seconds' },
    { key: 'ArrowRight', action: () => {
      if (replay.isReplaying) {
        replay.seekRelative(10000); // 10 seconds
      }
    }, description: 'Scrub forward 10 seconds' },
    { key: 'ArrowLeft', shift: true, action: () => {
      if (replay.isReplaying) {
        replay.seekRelative(-60000); // 1 minute
      }
    }, description: 'Skip back 1 minute' },
    { key: 'ArrowRight', shift: true, action: () => {
      if (replay.isReplaying) {
        replay.seekRelative(60000); // 1 minute
      }
    }, description: 'Skip forward 1 minute' },
    { key: 'l', action: () => {
      if (replay.isReplaying) {
        replay.exitReplay();
      }
    }, description: 'Return to live' },
  ]);

  // Calculate Threat Level
  const threatLevel = useMemo((): ThreatLevel => {
    if (attacks.length === 0) return { level: 'LOW', color: 'text-green-500', bg: 'bg-green-500', border: 'border-green-500' };
    const recentMagnitude = attacks.slice(-10).reduce((acc, curr) => acc + curr.magnitude, 0);
    const avg = recentMagnitude / 10 || 0;
    if (avg > 7) return { level: 'CRITICAL', color: 'text-red-500', bg: 'bg-red-500', border: 'border-red-500' };
    if (avg > 4) return { level: 'ELEVATED', color: 'text-orange-500', bg: 'bg-orange-500', border: 'border-orange-500' };
    return { level: 'LOW', color: 'text-green-500', bg: 'bg-green-500', border: 'border-green-500' };
  }, [attacks]);


  // Reset map view handler
  const handleLogoClick = useCallback(() => {
    // This will be passed to ThreatMap to reset view
  }, []);

  return (
    <div className={`${isDark ? 'dark' : ''} h-screen w-screen overflow-hidden`}>
      <div className="h-full w-full bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-white font-sans transition-colors duration-300">

        {/* Mini Header (hidden in focus mode) */}
        {!focusMode && (
          <MiniHeader
            threatLevel={threatLevel}
            isPaused={isPaused}
            isDark={isDark}
            viewMode={viewMode}
            onViewModeChange={setViewMode}
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
        <main className={`h-full w-full ${!focusMode ? 'pt-12' : ''} ${!focusMode && statsPanel.isOpen ? 'pb-[280px]' : !focusMode ? 'pb-[44px]' : ''} transition-all duration-300`}>
          <ThreatMap
            attacks={replay.isReplaying ? replay.attacksAtTime : attacks}
            selectedType={settings.selectedType}
            onTypeChange={(type) => updateSetting('selectedType', type)}
            onAnalyze={setSelectedAttack}
            isDark={isDark}
            viewMode={viewMode}
            mode={replay.isReplaying ? 'replay' : 'live'}
            replayTimestamp={replay.isReplaying ? replay.currentTimestamp : undefined}
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
            replay={{
              isReplaying: replay.isReplaying,
              isPlaying: replay.isPlaying,
              currentTimestamp: replay.currentTimestamp,
              playbackSpeed: replay.playbackSpeed,
              timeRange: replay.timeRange,
              attacksAtTimeCount: replay.attacksAtTime.length,
              totalInRange: replay.totalInRange,
              density: replay.density,
              onEnterReplay: replay.enterReplay,
              onExitReplay: replay.exitReplay,
              onPlay: replay.play,
              onPause: replay.pause,
              onSeek: replay.seek,
              onSeekRelative: replay.seekRelative,
              onSetSpeed: replay.setSpeed,
            }}
          />
        )}

        {/* Modals */}
        <AnalysisModal attack={selectedAttack} onClose={() => setSelectedAttack(null)} />


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
