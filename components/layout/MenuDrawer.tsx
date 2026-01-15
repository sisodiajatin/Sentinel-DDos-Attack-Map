import React, { useEffect, useRef, useState } from 'react';
import { X, Activity, CheckCircle2, XCircle, Info, ExternalLink, Keyboard, ChevronDown, ChevronUp } from 'lucide-react';

interface MenuDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  activeThreats: number;
  apiStatus: {
    abuseipdb: boolean;
    otx: boolean;
  };
}

// Helper component for displaying keyboard shortcuts
const ShortcutRow: React.FC<{ keys: string[]; description: string }> = ({ keys, description }) => (
  <div className="flex items-center justify-between text-xs">
    <span className="text-slate-600 dark:text-slate-400">{description}</span>
    <div className="flex items-center gap-1">
      {keys.map((key, i) => (
        <React.Fragment key={i}>
          {i > 0 && <span className="text-slate-400">+</span>}
          <kbd className="px-1.5 py-0.5 bg-white dark:bg-slate-700 border border-slate-300 dark:border-slate-600 rounded text-[10px] font-mono text-slate-700 dark:text-slate-300 shadow-sm">
            {key}
          </kbd>
        </React.Fragment>
      ))}
    </div>
  </div>
);

const MenuDrawer: React.FC<MenuDrawerProps> = ({
  isOpen,
  onClose,
  activeThreats,
  apiStatus,
}) => {
  const drawerRef = useRef<HTMLDivElement>(null);
  const [showShortcuts, setShowShortcuts] = useState(false);

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

          {/* Keyboard Shortcuts */}
          <div className="pt-4 border-t border-slate-200 dark:border-slate-700">
            <button
              onClick={() => setShowShortcuts(!showShortcuts)}
              className="w-full flex items-center justify-between p-2 rounded hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 text-sm transition-colors"
            >
              <span className="flex items-center gap-2">
                <Keyboard className="w-4 h-4" />
                Keyboard Shortcuts
              </span>
              {showShortcuts ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
            </button>

            {showShortcuts && (
              <div className="mt-2 p-3 bg-slate-50 dark:bg-slate-800 rounded-lg space-y-3">
                {/* General */}
                <div>
                  <h4 className="text-[10px] font-bold text-slate-500 uppercase mb-1.5">General</h4>
                  <div className="space-y-1">
                    <ShortcutRow keys={['F']} description="Toggle focus mode" />
                    <ShortcutRow keys={[']']} description="Toggle attack feed" />
                    <ShortcutRow keys={['S']} description="Toggle stats panel" />
                    <ShortcutRow keys={['Ctrl', ',']} description="Open settings" />
                    <ShortcutRow keys={['Esc']} description="Close panels" />
                  </div>
                </div>

                {/* Replay Mode */}
                <div>
                  <h4 className="text-[10px] font-bold text-orange-500 uppercase mb-1.5">Replay Mode</h4>
                  <div className="space-y-1">
                    <ShortcutRow keys={['R']} description="Enter replay mode" />
                    <ShortcutRow keys={['Space']} description="Play / Pause" />
                    <ShortcutRow keys={['←']} description="Scrub back 10s" />
                    <ShortcutRow keys={['→']} description="Scrub forward 10s" />
                    <ShortcutRow keys={['Shift', '←']} description="Skip back 1 min" />
                    <ShortcutRow keys={['Shift', '→']} description="Skip forward 1 min" />
                    <ShortcutRow keys={['L']} description="Return to live" />
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Links */}
          <div className="pt-4 border-t border-slate-200 dark:border-slate-700 space-y-1">
            <button className="w-full flex items-center gap-2 p-2 rounded hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 text-sm transition-colors">
              <Info className="w-4 h-4" />
              About SentinelVis
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
