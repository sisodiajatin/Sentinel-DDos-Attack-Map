import React, { useState, useMemo } from 'react';
import { ChevronDown, ChevronRight, Bot } from 'lucide-react';
import { AttackEvent, AttackType } from '../../types';
import { ATTACK_COLORS } from '../../constants';
import CountryFlag from '../CountryFlag';

interface GroupedAttackListProps {
  attacks: AttackEvent[];
  groupBy: 'source' | 'type' | 'none';
  onAnalyze: (attack: AttackEvent) => void;
}

interface AttackGroup {
  key: string;
  label: string;
  attacks: AttackEvent[];
  color?: string;
}

const GroupedAttackList: React.FC<GroupedAttackListProps> = ({
  attacks,
  groupBy,
  onAnalyze,
}) => {
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set());

  const groups = useMemo((): AttackGroup[] => {
    if (groupBy === 'none') {
      return [{ key: 'all', label: 'All Attacks', attacks }];
    }

    const grouped: Record<string, AttackEvent[]> = {};

    attacks.forEach((attack) => {
      const key = groupBy === 'source' ? attack.source.country : attack.type;
      if (!grouped[key]) grouped[key] = [];
      grouped[key].push(attack);
    });

    return Object.entries(grouped)
      .map(([key, attacks]) => ({
        key,
        label: key,
        attacks,
        color: groupBy === 'type' ? ATTACK_COLORS[key as AttackType] : undefined,
      }))
      .sort((a, b) => b.attacks.length - a.attacks.length);
  }, [attacks, groupBy]);

  const toggleGroup = (key: string) => {
    setExpandedGroups((prev) => {
      const next = new Set(prev);
      if (next.has(key)) {
        next.delete(key);
      } else {
        next.add(key);
      }
      return next;
    });
  };

  // Auto-expand first 3 groups
  React.useEffect(() => {
    if (groupBy !== 'none') {
      setExpandedGroups(new Set(groups.slice(0, 3).map((g) => g.key)));
    }
  }, [groupBy, groups]);

  return (
    <div className="space-y-1">
      {groups.map((group) => {
        const isExpanded = groupBy === 'none' || expandedGroups.has(group.key);

        return (
          <div key={group.key}>
            {/* Group Header */}
            {groupBy !== 'none' && (
              <button
                onClick={() => toggleGroup(group.key)}
                className="w-full flex items-center gap-2 px-2 py-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded transition-colors"
              >
                {isExpanded ? (
                  <ChevronDown className="w-4 h-4 text-slate-400" />
                ) : (
                  <ChevronRight className="w-4 h-4 text-slate-400" />
                )}
                {groupBy === 'source' && <CountryFlag country={group.label} size="sm" />}
                <span
                  className="font-bold text-sm"
                  style={{ color: group.color || 'inherit' }}
                >
                  {group.label}
                </span>
                <span className="ml-auto text-xs text-slate-500 bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded">
                  {group.attacks.length}
                </span>
              </button>
            )}

            {/* Attack Items */}
            {isExpanded && (
              <div className={groupBy !== 'none' ? 'pl-6 space-y-1' : 'space-y-1'}>
                {group.attacks.map((attack) => (
                  <button
                    key={attack.id}
                    onClick={() => onAnalyze(attack)}
                    className="w-full p-2 bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded hover:bg-slate-100 dark:hover:bg-slate-800 hover:border-cyan-500/50 transition-colors text-left group"
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span
                        className="text-[10px] font-bold uppercase px-1.5 py-0.5 rounded"
                        style={{
                          backgroundColor: `${ATTACK_COLORS[attack.type]}20`,
                          color: ATTACK_COLORS[attack.type],
                        }}
                      >
                        {attack.type}
                      </span>
                      <span className="text-[10px] text-slate-500 font-mono">
                        {new Date(attack.timestamp).toLocaleTimeString()}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 text-xs">
                      <span className="text-slate-600 dark:text-slate-400">
                        {attack.source.city}
                      </span>
                      <span className="text-slate-400">→</span>
                      <span className="text-red-600 dark:text-red-400">
                        {attack.target.city}
                      </span>
                      <span className="ml-auto font-bold text-slate-700 dark:text-slate-300">
                        {attack.magnitude.toFixed(1)}
                      </span>
                    </div>
                    <div className="mt-1 flex justify-end opacity-0 group-hover:opacity-100 transition-opacity">
                      <span className="text-[10px] text-cyan-600 dark:text-cyan-400 flex items-center gap-1">
                        <Bot className="w-3 h-3" />
                        Analyze
                      </span>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
};

export default GroupedAttackList;
