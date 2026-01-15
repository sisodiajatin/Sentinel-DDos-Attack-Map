import React, { useEffect, useState, useRef } from 'react';
import { Activity, Zap, Globe, Target } from 'lucide-react';

interface LiveStatsCounterProps {
  totalAttacks: number;
  attacksPerMinute: number;
  activeCountries: number;
  avgMagnitude: number;
}

// Animated number component
const AnimatedNumber: React.FC<{ value: number; decimals?: number; duration?: number }> = ({ 
  value, 
  decimals = 0,
  duration = 500 
}) => {
  const [displayValue, setDisplayValue] = useState(0);
  const previousValue = useRef(0);
  const animationRef = useRef<number | null>(null);

  useEffect(() => {
    const startValue = previousValue.current;
    const endValue = value;
    const startTime = performance.now();

    const animate = (currentTime: number) => {
      const elapsed = currentTime - startTime;
      const progress = Math.min(elapsed / duration, 1);
      
      // Easing function (ease-out)
      const easeOut = 1 - Math.pow(1 - progress, 3);
      
      const currentValue = startValue + (endValue - startValue) * easeOut;
      setDisplayValue(currentValue);

      if (progress < 1) {
        animationRef.current = requestAnimationFrame(animate);
      } else {
        previousValue.current = endValue;
      }
    };

    animationRef.current = requestAnimationFrame((time) => animate(time));

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [value, duration]);

  return (
    <span className="tabular-nums">
      {decimals > 0 ? displayValue.toFixed(decimals) : Math.round(displayValue).toLocaleString()}
    </span>
  );
};

const LiveStatsCounter: React.FC<LiveStatsCounterProps> = ({
  totalAttacks,
  attacksPerMinute,
  activeCountries,
  avgMagnitude,
}) => {
  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
      {/* Total Attacks */}
      <div className="bg-white/80 dark:bg-slate-900/80 border border-slate-200 dark:border-slate-700 rounded-lg p-3 backdrop-blur-sm transition-colors">
        <div className="flex items-center gap-2 mb-1">
          <div className="p-1.5 bg-red-100 dark:bg-red-900/30 rounded">
            <Activity className="w-3.5 h-3.5 text-red-500" />
          </div>
          <span className="text-[10px] text-slate-500 dark:text-slate-400 uppercase font-bold">Total Attacks</span>
        </div>
        <div className="text-2xl font-bold font-mono text-slate-900 dark:text-white">
          <AnimatedNumber value={totalAttacks} />
        </div>
      </div>

      {/* Attacks per Minute */}
      <div className="bg-white/80 dark:bg-slate-900/80 border border-slate-200 dark:border-slate-700 rounded-lg p-3 backdrop-blur-sm transition-colors">
        <div className="flex items-center gap-2 mb-1">
          <div className="p-1.5 bg-orange-100 dark:bg-orange-900/30 rounded">
            <Zap className="w-3.5 h-3.5 text-orange-500" />
          </div>
          <span className="text-[10px] text-slate-500 dark:text-slate-400 uppercase font-bold">Per Minute</span>
        </div>
        <div className="text-2xl font-bold font-mono text-slate-900 dark:text-white">
          <AnimatedNumber value={attacksPerMinute} decimals={1} />
          <span className="text-sm text-slate-500 ml-1">/min</span>
        </div>
      </div>

      {/* Active Countries */}
      <div className="bg-white/80 dark:bg-slate-900/80 border border-slate-200 dark:border-slate-700 rounded-lg p-3 backdrop-blur-sm transition-colors">
        <div className="flex items-center gap-2 mb-1">
          <div className="p-1.5 bg-blue-100 dark:bg-blue-900/30 rounded">
            <Globe className="w-3.5 h-3.5 text-blue-500" />
          </div>
          <span className="text-[10px] text-slate-500 dark:text-slate-400 uppercase font-bold">Countries</span>
        </div>
        <div className="text-2xl font-bold font-mono text-slate-900 dark:text-white">
          <AnimatedNumber value={activeCountries} />
          <span className="text-sm text-slate-500 ml-1">active</span>
        </div>
      </div>

      {/* Average Magnitude */}
      <div className="bg-white/80 dark:bg-slate-900/80 border border-slate-200 dark:border-slate-700 rounded-lg p-3 backdrop-blur-sm transition-colors">
        <div className="flex items-center gap-2 mb-1">
          <div className="p-1.5 bg-purple-100 dark:bg-purple-900/30 rounded">
            <Target className="w-3.5 h-3.5 text-purple-500" />
          </div>
          <span className="text-[10px] text-slate-500 dark:text-slate-400 uppercase font-bold">Avg Severity</span>
        </div>
        <div className="text-2xl font-bold font-mono text-slate-900 dark:text-white">
          <AnimatedNumber value={avgMagnitude} decimals={1} />
          <span className="text-sm text-slate-500 ml-1">/10</span>
        </div>
      </div>
    </div>
  );
};

export default LiveStatsCounter;
