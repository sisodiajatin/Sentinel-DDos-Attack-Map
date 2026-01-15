import React, { useMemo } from 'react';
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, BarChart, Bar } from 'recharts';
import { AttackEvent, ChartDataPoint, TimelineDataPoint } from '../types';
import { Activity, Globe2, Target } from 'lucide-react';

interface TrafficStatsProps {
  attacks: AttackEvent[];
  isDark: boolean;
}

// Custom tooltip component - defined outside to prevent recreation on each render
const CustomBarTooltip = ({ active, payload, label }: { active?: boolean; payload?: Array<{ value: number }>; label?: string }) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 p-2 rounded shadow-xl text-xs">
        <p className="text-slate-800 dark:text-slate-300 font-bold">{label}</p>
        <p className="text-cyan-600 dark:text-cyan-400">Attacks: {payload[0].value}</p>
      </div>
    );
  }
  return null;
};

const TrafficStats: React.FC<TrafficStatsProps> = ({ attacks, isDark }) => {
  // Aggregate data for Source Countries
  const sourceStats = useMemo((): ChartDataPoint[] => {
    const counts: Record<string, number> = {};
    attacks.forEach(a => {
        counts[a.source.country] = (counts[a.source.country] || 0) + 1;
    });
    return Object.entries(counts)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5)
        .map(([name, value]) => ({ name, value }));
  }, [attacks]);

  // Aggregate data for Target Countries
  const targetStats = useMemo((): ChartDataPoint[] => {
    const counts: Record<string, number> = {};
    attacks.forEach(a => {
        counts[a.target.country] = (counts[a.target.country] || 0) + 1;
    });
    return Object.entries(counts)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5)
        .map(([name, value]) => ({ name, value }));
  }, [attacks]);

  // Create simulated timeline data (last 20 points)
  const timelineData: TimelineDataPoint[] = attacks.slice(-20).map((a, i) => ({
    time: i,
    magnitude: a.magnitude * 10, // Simulated bandwidth
  }));

  const axisColor = isDark ? '#94a3b8' : '#64748b';
  const tooltipBg = isDark ? '#0f172a' : '#ffffff';
  const tooltipBorder = isDark ? '#334155' : '#e2e8f0';
  const tooltipText = isDark ? '#e2e8f0' : '#1e293b';

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 h-full">
      {/* Top Source Countries */}
      <div className="bg-white/80 dark:bg-slate-900/80 border border-slate-200 dark:border-slate-800 rounded-lg p-3 flex flex-col min-h-[160px] min-w-0 transition-colors duration-300">
        <h3 className="text-slate-600 dark:text-slate-300 text-[10px] font-bold uppercase mb-2 flex items-center gap-2">
          <Globe2 className="w-3 h-3 text-orange-500" />
          Top Attack Origins
        </h3>
        <div className="w-full flex-1 min-h-[120px]">
          <ResponsiveContainer width="100%" height="100%" minHeight={100}>
            <BarChart data={sourceStats} layout="vertical" margin={{ left: 0, right: 10 }}>
              <XAxis type="number" hide />
              <YAxis dataKey="name" type="category" width={70} tick={{fill: axisColor, fontSize: 9}} interval={0} />
              <Tooltip content={<CustomBarTooltip />} cursor={{fill: isDark ? '#1e293b' : '#f1f5f9'}} />
              <Bar dataKey="value" radius={[0, 2, 2, 0]} barSize={12} fill="#f97316" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Top Targets */}
      <div className="bg-white/80 dark:bg-slate-900/80 border border-slate-200 dark:border-slate-800 rounded-lg p-3 flex flex-col min-h-[160px] min-w-0 transition-colors duration-300">
        <h3 className="text-slate-600 dark:text-slate-300 text-[10px] font-bold uppercase mb-2 flex items-center gap-2">
          <Target className="w-3 h-3 text-red-500" />
          Top Targets
        </h3>
        <div className="w-full flex-1 min-h-[120px]">
          <ResponsiveContainer width="100%" height="100%" minHeight={100}>
            <BarChart data={targetStats} layout="vertical" margin={{ left: 0, right: 10 }}>
              <XAxis type="number" hide />
              <YAxis dataKey="name" type="category" width={70} tick={{fill: axisColor, fontSize: 9}} interval={0} />
              <Tooltip content={<CustomBarTooltip />} cursor={{fill: isDark ? '#1e293b' : '#f1f5f9'}} />
              <Bar dataKey="value" radius={[0, 2, 2, 0]} barSize={12} fill="#ef4444" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Traffic Intensity Timeline */}
      <div className="bg-white/80 dark:bg-slate-900/80 border border-slate-200 dark:border-slate-800 rounded-lg p-3 flex flex-col min-h-[160px] min-w-0 transition-colors duration-300">
        <h3 className="text-slate-600 dark:text-slate-300 text-[10px] font-bold uppercase mb-2 flex items-center gap-2">
          <Activity className="w-3 h-3 text-cyan-600 dark:text-cyan-500" />
          Traffic Intensity
        </h3>
        <div className="w-full flex-1 min-h-[120px]">
          <ResponsiveContainer width="100%" height="100%" minHeight={100}>
            <AreaChart data={timelineData}>
              <defs>
                <linearGradient id="colorMag" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#06b6d4" stopOpacity={0.8}/>
                  <stop offset="95%" stopColor="#06b6d4" stopOpacity={0}/>
                </linearGradient>
              </defs>
              <XAxis hide />
              <YAxis hide domain={[0, 'auto']} />
              <Tooltip 
                 contentStyle={{ backgroundColor: tooltipBg, borderColor: tooltipBorder, color: tooltipText, fontSize: '10px' }}
              />
              <Area type="monotone" dataKey="magnitude" stroke="#06b6d4" strokeWidth={2} fillOpacity={1} fill="url(#colorMag)" />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
};

export default TrafficStats;