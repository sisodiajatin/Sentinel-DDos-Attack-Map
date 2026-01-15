import React, { useMemo } from 'react';
import { Shield, AlertTriangle, Skull } from 'lucide-react';

interface ThreatGaugeProps {
  level: number; // 0-100
  size?: 'sm' | 'md' | 'lg';
}

const ThreatGauge: React.FC<ThreatGaugeProps> = ({ level, size = 'md' }) => {
  const clampedLevel = Math.min(100, Math.max(0, level));
  
  const { status, color, bgColor, icon: Icon, glowColor } = useMemo(() => {
    if (clampedLevel >= 75) {
      return {
        status: 'CRITICAL',
        color: '#ef4444',
        bgColor: 'bg-red-500',
        icon: Skull,
        glowColor: 'shadow-red-500/50',
      };
    } else if (clampedLevel >= 50) {
      return {
        status: 'HIGH',
        color: '#f97316',
        bgColor: 'bg-orange-500',
        icon: AlertTriangle,
        glowColor: 'shadow-orange-500/50',
      };
    } else if (clampedLevel >= 25) {
      return {
        status: 'ELEVATED',
        color: '#eab308',
        bgColor: 'bg-yellow-500',
        icon: AlertTriangle,
        glowColor: 'shadow-yellow-500/50',
      };
    } else {
      return {
        status: 'LOW',
        color: '#22c55e',
        bgColor: 'bg-green-500',
        icon: Shield,
        glowColor: 'shadow-green-500/50',
      };
    }
  }, [clampedLevel]);

  const sizeConfig = {
    sm: { width: 120, height: 80, strokeWidth: 8, fontSize: 'text-lg' },
    md: { width: 160, height: 100, strokeWidth: 10, fontSize: 'text-2xl' },
    lg: { width: 200, height: 120, strokeWidth: 12, fontSize: 'text-3xl' },
  };

  const config = sizeConfig[size];
  const radius = (config.width - config.strokeWidth) / 2;
  const circumference = Math.PI * radius;
  const progress = (clampedLevel / 100) * circumference;

  return (
    <div className="flex flex-col items-center">
      <div className="relative" style={{ width: config.width, height: config.height }}>
        <svg
          width={config.width}
          height={config.height}
          viewBox={`0 0 ${config.width} ${config.height + 10}`}
          className="transform -rotate-0"
        >
          {/* Background arc */}
          <path
            d={`M ${config.strokeWidth / 2} ${config.height} 
                A ${radius} ${radius} 0 0 1 ${config.width - config.strokeWidth / 2} ${config.height}`}
            fill="none"
            stroke="currentColor"
            strokeWidth={config.strokeWidth}
            className="text-slate-200 dark:text-slate-700"
            strokeLinecap="round"
          />
          
          {/* Progress arc */}
          <path
            d={`M ${config.strokeWidth / 2} ${config.height} 
                A ${radius} ${radius} 0 0 1 ${config.width - config.strokeWidth / 2} ${config.height}`}
            fill="none"
            stroke={color}
            strokeWidth={config.strokeWidth}
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={circumference - progress}
            className="transition-all duration-500 ease-out"
            style={{
              filter: `drop-shadow(0 0 6px ${color})`,
            }}
          />

          {/* Tick marks */}
          {[0, 25, 50, 75, 100].map((tick) => {
            const angle = (tick / 100) * Math.PI;
            const x1 = config.width / 2 - (radius - 15) * Math.cos(angle);
            const y1 = config.height - (radius - 15) * Math.sin(angle);
            const x2 = config.width / 2 - (radius - 5) * Math.cos(angle);
            const y2 = config.height - (radius - 5) * Math.sin(angle);
            
            return (
              <line
                key={tick}
                x1={x1}
                y1={y1}
                x2={x2}
                y2={y2}
                stroke="currentColor"
                strokeWidth={2}
                className="text-slate-400 dark:text-slate-500"
              />
            );
          })}
        </svg>

        {/* Center content */}
        <div className="absolute inset-0 flex flex-col items-center justify-end pb-1">
          <div 
            className={`p-1.5 rounded-full ${bgColor} shadow-lg ${glowColor} mb-1`}
            style={{ 
              animation: clampedLevel >= 75 ? 'pulse 1s infinite' : 'none',
            }}
          >
            <Icon className="w-4 h-4 text-white" />
          </div>
          <span className={`${config.fontSize} font-bold font-mono`} style={{ color }}>
            {Math.round(clampedLevel)}
          </span>
        </div>
      </div>
      
      {/* Status label */}
      <div 
        className="mt-1 px-3 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider"
        style={{ 
          backgroundColor: `${color}20`,
          color: color,
        }}
      >
        {status}
      </div>
    </div>
  );
};

export default ThreatGauge;
