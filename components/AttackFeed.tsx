import React, { useEffect, useRef, useState } from 'react';
import { AttackEvent, AttackType } from '../types';
import { ATTACK_COLORS } from '../constants';
import { ShieldAlert, Crosshair, Zap, Search, Trash2, Filter, X } from 'lucide-react';
import CountryFlag from './CountryFlag';

interface AttackFeedProps {
  attacks: AttackEvent[];
  selectedType: AttackType | 'ALL';
  onTypeChange: (type: AttackType | 'ALL') => void;
  onAnalyze: (attack: AttackEvent) => void;
  onClear: () => void;
}

const AttackFeed: React.FC<AttackFeedProps> = ({ attacks, selectedType, onTypeChange, onAnalyze, onClear }) => {
  const bottomRef = useRef<HTMLLIElement>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [showFilters, setShowFilters] = useState(false);

  // Auto-scroll only if not searching/filtering history
  useEffect(() => {
    if (bottomRef.current && searchQuery === '' && selectedType === 'ALL') {
      bottomRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [attacks, searchQuery, selectedType]);

  const filteredAttacks = attacks.filter(attack => {
    const matchesSearch = 
      attack.source.city.toLowerCase().includes(searchQuery.toLowerCase()) ||
      attack.source.country.toLowerCase().includes(searchQuery.toLowerCase()) ||
      attack.target.city.toLowerCase().includes(searchQuery.toLowerCase()) ||
      attack.target.country.toLowerCase().includes(searchQuery.toLowerCase()) ||
      attack.ip.includes(searchQuery);
    
    const matchesType = selectedType === 'ALL' || attack.type === selectedType;

    return matchesSearch && matchesType;
  });

  return (
    <div className="flex flex-col h-full bg-white dark:bg-slate-900 border-l border-slate-200 dark:border-slate-800 w-full md:w-96 shadow-2xl z-20 transition-colors duration-300" role="log" aria-live="polite" aria-label="Threat activity log">
      <div className="p-4 border-b border-slate-200 dark:border-slate-800 bg-white/90 dark:bg-slate-900/90 backdrop-blur space-y-3 transition-colors duration-300">
        <div className="flex items-center justify-between">
            <h2 className="text-red-600 dark:text-red-500 font-mono font-bold flex items-center gap-2">
            <ShieldAlert className="w-5 h-5" aria-hidden="true" />
            THREAT LOG
            </h2>
            <button 
                onClick={onClear}
                className="text-slate-500 hover:text-red-600 dark:hover:text-red-400 transition-colors p-1"
                title="Clear Logs"
                aria-label="Clear all threat logs"
            >
                <Trash2 className="w-4 h-4" aria-hidden="true" />
            </button>
        </div>
        
        {/* Search Bar */}
        <div className="relative">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" aria-hidden="true" />
            <input 
                type="search" 
                placeholder="Search IP, City..." 
                className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-md py-1.5 pl-9 pr-8 text-xs text-slate-800 dark:text-slate-200 placeholder-slate-400 focus:outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 transition-colors"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                aria-label="Search threats by IP address or city"
            />
            {searchQuery && (
                <button 
                    onClick={() => setSearchQuery('')}
                    className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-white"
                >
                    <X className="w-3 h-3" />
                </button>
            )}
        </div>

        {/* Filters Toggle */}
        <div className="flex gap-2">
            <button 
                onClick={() => setShowFilters(!showFilters)}
                className={`flex-1 text-xs flex items-center justify-center gap-1 py-1.5 rounded border transition-colors ${showFilters ? 'bg-cyan-50 dark:bg-cyan-950/30 border-cyan-200 dark:border-cyan-500/50 text-cyan-600 dark:text-cyan-400' : 'bg-slate-50 dark:bg-slate-800 border-slate-300 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:border-slate-400 dark:hover:border-slate-600'}`}
            >
                <Filter className="w-3 h-3" />
                {selectedType === 'ALL' ? 'All Types' : selectedType}
            </button>
        </div>

        {/* Filter Options */}
        {showFilters && (
            <div className="grid grid-cols-2 gap-2 pt-2 animate-in fade-in slide-in-from-top-2">
                <button 
                    onClick={() => onTypeChange('ALL')}
                    className={`text-[10px] px-2 py-1 rounded border ${selectedType === 'ALL' ? 'bg-slate-200 dark:bg-slate-700 border-slate-400 dark:border-slate-500 text-slate-900 dark:text-white' : 'border-slate-200 dark:border-slate-800 text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800'}`}
                >
                    ALL
                </button>
                {Object.values(AttackType).map(type => (
                    <button 
                        key={type}
                        onClick={() => onTypeChange(type)}
                        className={`text-[10px] px-2 py-1 rounded border transition-colors truncate ${selectedType === type ? 'bg-slate-200 dark:bg-slate-700 border-slate-400 dark:border-slate-500 text-slate-900 dark:text-white' : 'border-slate-200 dark:border-slate-800 text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800'}`}
                        style={selectedType === type ? { borderColor: ATTACK_COLORS[type], color: ATTACK_COLORS[type] } : {}}
                    >
                        {type}
                    </button>
                ))}
            </div>
        )}
      </div>
      
      <ul className="flex-1 overflow-y-auto p-2 space-y-2 font-mono text-xs scrollbar-thin" aria-label="List of threat events">
        {filteredAttacks.length === 0 && (
            <li className="text-center text-slate-500 dark:text-slate-600 py-8 italic">
                No threats matching criteria
            </li>
        )}
        {filteredAttacks.map((attack) => (
          <li 
            key={attack.id} 
            className="p-3 bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded hover:bg-slate-100 dark:hover:bg-slate-800 hover:border-cyan-500/50 transition-colors group cursor-pointer"
            onClick={() => onAnalyze(attack)}
            onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onAnalyze(attack); }}}
            tabIndex={0}
            role="button"
            aria-label={`${attack.type} attack from ${attack.source.city}, ${attack.source.country} to ${attack.target.city}, ${attack.target.country}. Click to analyze.`}
          >
            <div className="flex justify-between items-start mb-1">
              <span className="text-slate-500 dark:text-slate-400">{new Date(attack.timestamp).toLocaleTimeString()}</span>
              <span 
                className="px-1.5 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider"
                style={{ backgroundColor: `${ATTACK_COLORS[attack.type]}20`, color: ATTACK_COLORS[attack.type] }}
              >
                {attack.type}
              </span>
            </div>
            
            <div className="grid grid-cols-[auto_1fr] gap-x-2 gap-y-1 items-center">
              <Crosshair className="w-3 h-3 text-slate-400 dark:text-slate-500" />
              <div className="truncate text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                <CountryFlag country={attack.source.country} size="sm" />
                <span className="text-slate-500">SRC:</span> {attack.source.city}, {attack.source.country}
              </div>
              
              <Zap className="w-3 h-3 text-slate-400 dark:text-slate-500" />
              <div className="truncate text-red-700 dark:text-red-200 flex items-center gap-1.5">
                <CountryFlag country={attack.target.country} size="sm" />
                <span className="text-slate-500">TGT:</span> {attack.target.city}, {attack.target.country}
              </div>
            </div>

            <div className="mt-2 flex justify-between items-center opacity-0 group-hover:opacity-100 group-focus:opacity-100 transition-opacity">
              <span className="text-slate-500 text-[10px]">ID: {attack.id.split('-').pop()}</span>
              <span className="text-cyan-600 dark:text-cyan-400 underline text-[10px]">
                ANALYZE
              </span>
            </div>
          </li>
        ))}
        <li ref={bottomRef} aria-hidden="true" />
      </ul>
    </div>
  );
};

export default AttackFeed;