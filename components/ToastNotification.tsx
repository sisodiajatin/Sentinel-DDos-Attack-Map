import React, { useEffect, useState } from 'react';
import { AlertTriangle, X, Shield, Zap } from 'lucide-react';
import { AttackEvent } from '../types';
import { ATTACK_COLORS } from '../constants';
import CountryFlag from './CountryFlag';

export interface Toast {
  id: string;
  attack: AttackEvent;
  timestamp: number;
}

interface ToastNotificationProps {
  toasts: Toast[];
  onDismiss: (id: string) => void;
  onAnalyze: (attack: AttackEvent) => void;
}

const ToastNotification: React.FC<ToastNotificationProps> = ({ toasts, onDismiss, onAnalyze }) => {
  return (
    <div className="fixed bottom-4 right-4 z-50 flex flex-col gap-2 max-w-sm">
      {toasts.map((toast) => (
        <ToastItem 
          key={toast.id} 
          toast={toast} 
          onDismiss={onDismiss}
          onAnalyze={onAnalyze}
        />
      ))}
    </div>
  );
};

interface ToastItemProps {
  toast: Toast;
  onDismiss: (id: string) => void;
  onAnalyze: (attack: AttackEvent) => void;
}

const ToastItem: React.FC<ToastItemProps> = ({ toast, onDismiss, onAnalyze }) => {
  const [isExiting, setIsExiting] = useState(false);
  const { attack } = toast;
  const isCritical = attack.magnitude >= 8;

  useEffect(() => {
    // Auto-dismiss after 5 seconds
    const timer = setTimeout(() => {
      setIsExiting(true);
      setTimeout(() => onDismiss(toast.id), 300);
    }, 5000);

    return () => clearTimeout(timer);
  }, [toast.id, onDismiss]);

  const handleDismiss = () => {
    setIsExiting(true);
    setTimeout(() => onDismiss(toast.id), 300);
  };

  return (
    <div
      className={`
        relative overflow-hidden rounded-lg shadow-2xl border
        transform transition-all duration-300 ease-out
        ${isExiting ? 'translate-x-full opacity-0' : 'translate-x-0 opacity-100'}
        ${isCritical 
          ? 'bg-red-950/95 border-red-500/50 animate-pulse' 
          : 'bg-slate-900/95 border-slate-700/50'
        }
        backdrop-blur-md
      `}
      role="alert"
      aria-live="assertive"
    >
      {/* Top color bar */}
      <div 
        className="h-1 w-full"
        style={{ background: ATTACK_COLORS[attack.type] }}
      />
      
      <div className="p-3">
        {/* Header */}
        <div className="flex items-start justify-between gap-2 mb-2">
          <div className="flex items-center gap-2">
            {isCritical ? (
              <div className="p-1 bg-red-500/20 rounded animate-pulse">
                <AlertTriangle className="w-4 h-4 text-red-400" />
              </div>
            ) : (
              <div className="p-1 bg-orange-500/20 rounded">
                <Shield className="w-4 h-4 text-orange-400" />
              </div>
            )}
            <div>
              <div className="text-xs font-bold text-white flex items-center gap-1">
                {isCritical ? 'CRITICAL THREAT' : 'NEW THREAT'}
              </div>
              <div 
                className="text-[10px] font-mono"
                style={{ color: ATTACK_COLORS[attack.type] }}
              >
                {attack.type}
              </div>
            </div>
          </div>
          <button
            onClick={handleDismiss}
            className="text-slate-500 hover:text-white transition-colors p-0.5"
            aria-label="Dismiss notification"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Content */}
        <div className="space-y-1.5 text-xs">
          <div className="flex items-center gap-2 text-slate-300">
            <CountryFlag country={attack.source.country} size="sm" />
            <span className="text-slate-500">→</span>
            <CountryFlag country={attack.target.country} size="sm" />
            <span className="truncate">
              {attack.source.city} → {attack.target.city}
            </span>
          </div>
          
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-slate-500 font-mono">{attack.ip}</span>
              <div className="flex items-center gap-1">
                <Zap className="w-3 h-3 text-yellow-500" />
                <span className={`font-bold ${attack.magnitude >= 8 ? 'text-red-400' : 'text-yellow-400'}`}>
                  {attack.magnitude}/10
                </span>
              </div>
            </div>
            <button
              onClick={() => onAnalyze(attack)}
              className="text-[10px] text-cyan-400 hover:text-cyan-300 underline"
            >
              ANALYZE
            </button>
          </div>
        </div>
      </div>

      {/* Progress bar for auto-dismiss */}
      <div className="absolute bottom-0 left-0 h-0.5 bg-white/20 w-full">
        <div 
          className="h-full bg-white/50 animate-shrink-width"
          style={{ animationDuration: '5s' }}
        />
      </div>
    </div>
  );
};

export default ToastNotification;
