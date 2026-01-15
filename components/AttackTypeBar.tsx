import React, { useMemo } from 'react';
import { AttackEvent, AttackType, AttackTypeStat } from '../types';
import { ATTACK_COLORS } from '../constants';

interface AttackTypeBarProps {
  attacks: AttackEvent[];
  selectedType: AttackType | 'ALL';
  onSelect: (type: AttackType) => void;
}

const ACRONYMS: Record<AttackType, string> = {
  [AttackType.SYN_FLOOD]: 'SYN',
  [AttackType.UDP_FLOOD]: 'UDP',
  [AttackType.HTTP_FLOOD]: 'HTTP',
  [AttackType.DNS_AMP]: 'DNS',
  [AttackType.SQL_INJECTION]: 'SQL',
};

const AttackTypeBar: React.FC<AttackTypeBarProps> = ({ attacks, selectedType, onSelect }) => {
  const stats = useMemo((): AttackTypeStat[] => {
    const counts = attacks.reduce((acc, curr) => {
      acc[curr.type] = (acc[curr.type] || 0) + 1;
      return acc;
    }, {} as Record<AttackType, number>);
    
    // Ensure all types are represented
    return Object.values(AttackType).map(type => ({
      type,
      acronym: ACRONYMS[type],
      count: counts[type] || 0,
      color: ATTACK_COLORS[type]
    }));
  }, [attacks]);

  return (
    <div className="w-full flex items-center justify-between gap-px overflow-x-auto select-none">
      <div className="flex w-full border border-slate-200 dark:border-slate-700 bg-white/80 dark:bg-slate-950/80 backdrop-blur-sm rounded-sm transition-colors duration-300">
        {stats.map((stat) => {
          const isSelected = selectedType === stat.type;
          const isDimmed = selectedType !== 'ALL' && !isSelected;
          
          return (
            <div 
              key={stat.type} 
              onClick={() => onSelect(stat.type)}
              className={`
                flex-1 flex flex-col items-center justify-center py-2 border-r border-slate-200 dark:border-slate-800 last:border-r-0 min-w-[60px] 
                cursor-pointer transition-all duration-300 relative overflow-hidden group
                ${isSelected ? 'bg-slate-100 dark:bg-slate-900' : 'hover:bg-slate-50 dark:hover:bg-slate-900'}
              `}
              style={{
                opacity: isDimmed ? 0.4 : 1,
              }}
            >
              {/* Active Highlight Border/Glow */}
              {isSelected && (
                <div 
                  className="absolute inset-0 opacity-10 pointer-events-none" 
                  style={{ backgroundColor: stat.color }}
                />
              )}
              {isSelected && (
                <div 
                  className="absolute bottom-0 left-0 right-0 h-0.5" 
                  style={{ backgroundColor: stat.color, boxShadow: `0 -2px 8px ${stat.color}` }}
                />
              )}

              <span className={`text-[10px] font-mono mb-0.5 transition-colors ${isSelected ? 'text-slate-900 dark:text-white' : 'text-slate-500 group-hover:text-slate-700 dark:group-hover:text-slate-300'}`}>
                {stat.count}
              </span>
              <span 
                  className="text-xs font-bold font-mono tracking-wider"
                  style={{ 
                      color: isSelected ? stat.color : stat.color, 
                      textShadow: isSelected ? `0 0 10px ${stat.color}60` : `0 0 5px ${stat.color}20` 
                  }}
              >
                  {stat.acronym}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default AttackTypeBar;