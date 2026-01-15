import React from 'react';
import { Activity, Zap, Globe, Target, Wifi, Shield } from 'lucide-react';

interface SummaryTabProps {
  totalAttacks: number;
  attacksPerMinute: number;
  activeCountries: number;
  avgMagnitude: number;
  netLoad: number;
  defconLevel: number;
}

const SummaryTab: React.FC<SummaryTabProps> = ({
  totalAttacks,
  attacksPerMinute,
  activeCountries,
  avgMagnitude,
  netLoad,
  defconLevel,
}) => {
  return (
    <div className="h-full flex flex-col gap-4">
      {/* Main Stats Grid */}
      <div className="grid grid-cols-4 gap-3">
        <div className="bg-slate-50 dark:bg-slate-800/50 rounded-lg p-3">
          <div className="flex items-center gap-2 mb-1">
            <Activity className="w-4 h-4 text-red-500" />
            <span className="text-[10px] text-slate-500 uppercase font-bold">Total</span>
          </div>
          <div className="text-xl font-bold font-mono text-slate-900 dark:text-white">
            {totalAttacks.toLocaleString()}
          </div>
        </div>

        <div className="bg-slate-50 dark:bg-slate-800/50 rounded-lg p-3">
          <div className="flex items-center gap-2 mb-1">
            <Zap className="w-4 h-4 text-orange-500" />
            <span className="text-[10px] text-slate-500 uppercase font-bold">Per Min</span>
          </div>
          <div className="text-xl font-bold font-mono text-slate-900 dark:text-white">
            {attacksPerMinute.toFixed(1)}
          </div>
        </div>

        <div className="bg-slate-50 dark:bg-slate-800/50 rounded-lg p-3">
          <div className="flex items-center gap-2 mb-1">
            <Globe className="w-4 h-4 text-blue-500" />
            <span className="text-[10px] text-slate-500 uppercase font-bold">Countries</span>
          </div>
          <div className="text-xl font-bold font-mono text-slate-900 dark:text-white">
            {activeCountries}
          </div>
        </div>

        <div className="bg-slate-50 dark:bg-slate-800/50 rounded-lg p-3">
          <div className="flex items-center gap-2 mb-1">
            <Target className="w-4 h-4 text-purple-500" />
            <span className="text-[10px] text-slate-500 uppercase font-bold">Avg Mag</span>
          </div>
          <div className="text-xl font-bold font-mono text-slate-900 dark:text-white">
            {avgMagnitude.toFixed(1)}
          </div>
        </div>
      </div>

      {/* Secondary Stats */}
      <div className="flex items-center justify-center gap-8 text-sm">
        <div className="flex items-center gap-2">
          <Wifi className="w-4 h-4 text-cyan-500" />
          <span className="text-slate-500">Net Load:</span>
          <span className="font-mono font-bold text-slate-900 dark:text-white">
            {netLoad.toFixed(1)} TB/s
          </span>
        </div>
        <div className="flex items-center gap-2">
          <Shield className="w-4 h-4 text-yellow-500" />
          <span className="text-slate-500">DEFCON:</span>
          <span className={`font-mono font-bold ${
            defconLevel === 1 ? 'text-red-500' : defconLevel <= 3 ? 'text-orange-500' : 'text-green-500'
          }`}>
            {defconLevel}
          </span>
        </div>
      </div>
    </div>
  );
};

export default SummaryTab;
