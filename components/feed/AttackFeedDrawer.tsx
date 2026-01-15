import React, { useState, useMemo } from 'react';
import { ShieldAlert, Search, X, Trash2 } from 'lucide-react';
import { AttackEvent, AttackType } from '../../types';
import RightDrawer from '../layout/RightDrawer';
import GroupedAttackList from './GroupedAttackList';

interface AttackFeedDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  onToggle: () => void;
  attacks: AttackEvent[];
  selectedType: AttackType | 'ALL';
  onAnalyze: (attack: AttackEvent) => void;
  onClear: () => void;
}

type ViewMode = 'all' | 'bySource' | 'byType';

const AttackFeedDrawer: React.FC<AttackFeedDrawerProps> = ({
  isOpen,
  onClose,
  onToggle,
  attacks,
  selectedType,
  onAnalyze,
  onClear,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [viewMode, setViewMode] = useState<ViewMode>('all');

  // Filter attacks
  const filteredAttacks = useMemo(() => {
    return attacks.filter((attack) => {
      const matchesSearch =
        !searchQuery ||
        attack.source.city.toLowerCase().includes(searchQuery.toLowerCase()) ||
        attack.source.country.toLowerCase().includes(searchQuery.toLowerCase()) ||
        attack.target.city.toLowerCase().includes(searchQuery.toLowerCase()) ||
        attack.target.country.toLowerCase().includes(searchQuery.toLowerCase()) ||
        attack.ip.includes(searchQuery);

      const matchesType = selectedType === 'ALL' || attack.type === selectedType;

      return matchesSearch && matchesType;
    });
  }, [attacks, searchQuery, selectedType]);

  // Count by grouping
  const sourceCount = useMemo(() => {
    const countries = new Set(filteredAttacks.map((a) => a.source.country));
    return countries.size;
  }, [filteredAttacks]);

  const typeCount = useMemo(() => {
    const types = new Set(filteredAttacks.map((a) => a.type));
    return types.size;
  }, [filteredAttacks]);

  const groupBy = viewMode === 'bySource' ? 'source' : viewMode === 'byType' ? 'type' : 'none';

  return (
    <RightDrawer
      isOpen={isOpen}
      onClose={onClose}
      onToggle={onToggle}
      title="THREAT FEED"
      badge={attacks.length}
      icon={<ShieldAlert className="w-5 h-5 text-red-500" />}
    >
      {/* View Mode Tabs */}
      <div className="flex border-b border-slate-200 dark:border-slate-700">
        {[
          { mode: 'all' as ViewMode, label: 'All', count: filteredAttacks.length },
          { mode: 'bySource' as ViewMode, label: 'By Source', count: sourceCount },
          { mode: 'byType' as ViewMode, label: 'By Type', count: typeCount },
        ].map(({ mode, label, count }) => (
          <button
            key={mode}
            onClick={() => setViewMode(mode)}
            className={`flex-1 py-2 text-xs font-bold transition-colors relative ${
              viewMode === mode
                ? 'text-cyan-600 dark:text-cyan-400'
                : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
            }`}
          >
            <span>{label}</span>
            <span className="ml-1 text-[10px] opacity-60">{count}</span>
            {viewMode === mode && (
              <div className="absolute bottom-0 left-2 right-2 h-0.5 bg-cyan-500 rounded-full" />
            )}
          </button>
        ))}
      </div>

      {/* Search */}
      <div className="p-3 border-b border-slate-200 dark:border-slate-700">
        <div className="relative">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="search"
            placeholder="Filter attacks..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg py-2 pl-9 pr-8 text-sm placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:border-transparent"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-white"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {/* Attack List */}
      <div className="flex-1 overflow-y-auto p-2">
        {filteredAttacks.length === 0 ? (
          <div className="text-center py-8 text-slate-500">
            No threats matching criteria
          </div>
        ) : (
          <GroupedAttackList
            attacks={filteredAttacks}
            groupBy={groupBy}
            onAnalyze={onAnalyze}
          />
        )}
      </div>

      {/* Footer */}
      <div className="p-3 border-t border-slate-200 dark:border-slate-700">
        <button
          onClick={onClear}
          className="w-full flex items-center justify-center gap-2 py-2 text-sm text-slate-500 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded transition-colors"
        >
          <Trash2 className="w-4 h-4" />
          Clear History
        </button>
      </div>
    </RightDrawer>
  );
};

export default AttackFeedDrawer;
