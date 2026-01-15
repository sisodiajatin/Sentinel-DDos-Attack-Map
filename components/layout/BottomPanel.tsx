import React, { useState } from 'react';
import { ChevronUp, ChevronDown, Pin, PinOff } from 'lucide-react';

interface Tab {
  id: string;
  label: string;
  content: React.ReactNode;
}

interface BottomPanelProps {
  isOpen: boolean;
  onToggle: () => void;
  tabs: Tab[];
  previewContent: React.ReactNode;
  defaultTab?: string;
}

const BottomPanel: React.FC<BottomPanelProps> = ({
  isOpen,
  onToggle,
  tabs,
  previewContent,
  defaultTab,
}) => {
  const [activeTab, setActiveTab] = useState(defaultTab || tabs[0]?.id);
  const [isPinned, setIsPinned] = useState(false);

  const activeContent = tabs.find(t => t.id === activeTab)?.content;

  return (
    <div
      className={`fixed bottom-0 left-0 right-0 z-30 bg-white/95 dark:bg-slate-900/95 backdrop-blur-xl border-t border-slate-200 dark:border-slate-700 shadow-[0_-4px_20px_rgba(0,0,0,0.1)] transition-all duration-300 ease-out ${
        isOpen ? 'h-[280px]' : 'h-[44px]'
      }`}
    >
      {/* Collapsed Bar */}
      <button
        onClick={onToggle}
        className="w-full h-[44px] px-4 flex items-center justify-between hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors"
        aria-expanded={isOpen}
        aria-label={isOpen ? 'Collapse stats panel' : 'Expand stats panel'}
      >
        <div className="flex items-center gap-3">
          {isOpen ? (
            <ChevronDown className="w-4 h-4 text-slate-400" />
          ) : (
            <ChevronUp className="w-4 h-4 text-slate-400" />
          )}
          <span className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase">
            Stats
          </span>
        </div>

        {/* Preview metrics (only when collapsed) */}
        {!isOpen && (
          <div className="flex items-center gap-4 text-xs text-slate-600 dark:text-slate-400">
            {previewContent}
          </div>
        )}

        {isOpen && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              setIsPinned(!isPinned);
            }}
            className={`p-1.5 rounded transition-colors ${
              isPinned
                ? 'bg-cyan-100 dark:bg-cyan-900/30 text-cyan-600 dark:text-cyan-400'
                : 'text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
            }`}
            aria-label={isPinned ? 'Unpin panel' : 'Pin panel open'}
          >
            {isPinned ? <PinOff className="w-4 h-4" /> : <Pin className="w-4 h-4" />}
          </button>
        )}
      </button>

      {/* Expanded Content */}
      {isOpen && (
        <div className="h-[calc(100%-44px)] flex flex-col">
          {/* Tabs */}
          <div className="flex border-b border-slate-200 dark:border-slate-700 px-4">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`px-4 py-2 text-xs font-bold uppercase transition-colors relative ${
                  activeTab === tab.id
                    ? 'text-cyan-600 dark:text-cyan-400'
                    : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
                }`}
              >
                {tab.label}
                {activeTab === tab.id && (
                  <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-cyan-500" />
                )}
              </button>
            ))}
          </div>

          {/* Tab Content */}
          <div className="flex-1 overflow-auto p-4">
            {activeContent}
          </div>
        </div>
      )}
    </div>
  );
};

export default BottomPanel;
