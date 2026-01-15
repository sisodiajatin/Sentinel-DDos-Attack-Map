import React, { useEffect, useState, useCallback } from 'react';
import { AttackEvent } from '../types';
import { analyzeThreat } from '../services/geminiService';
import { X, Bot, ShieldCheck, AlertTriangle, Loader2 } from 'lucide-react';

interface AnalysisModalProps {
  attack: AttackEvent | null;
  onClose: () => void;
}

const AnalysisModal: React.FC<AnalysisModalProps> = ({ attack, onClose }) => {
  const [analysis, setAnalysis] = useState<string>('');
  const [loading, setLoading] = useState(false);

  const fetchAnalysis = useCallback(async (attackData: AttackEvent) => {
    setLoading(true);
    setAnalysis('');
    try {
      const result = await analyzeThreat(attackData);
      setAnalysis(result);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (attack) {
      fetchAnalysis(attack);
    }
  }, [attack, fetchAnalysis]);

  // Handle escape key to close modal
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && attack) {
        onClose();
      }
    };
    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [attack, onClose]);

  if (!attack) return null;

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-labelledby="modal-title"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl w-full max-w-lg shadow-2xl overflow-hidden relative transition-colors duration-300">
        {/* Header */}
        <div className="bg-slate-100 dark:bg-slate-800 p-4 flex justify-between items-center border-b border-slate-200 dark:border-slate-700">
          <div className="flex items-center gap-2 text-cyan-600 dark:text-cyan-400">
            <Bot className="w-5 h-5" aria-hidden="true" />
            <h3 id="modal-title" className="font-bold text-lg">AI Threat Intelligence</h3>
          </div>
          <button 
            onClick={onClose} 
            className="text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-white transition-colors"
            aria-label="Close analysis modal"
          >
            <X className="w-5 h-5" aria-hidden="true" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6">
          <div className="mb-6 grid grid-cols-2 gap-4 text-sm font-mono bg-slate-50 dark:bg-slate-950 p-4 rounded-lg border border-slate-200 dark:border-slate-800">
             <div>
               <div className="text-slate-500 text-xs uppercase">Target</div>
               <div className="text-slate-900 dark:text-white">{attack.target.city}, {attack.target.country}</div>
             </div>
             <div>
               <div className="text-slate-500 text-xs uppercase">Source</div>
               <div className="text-slate-900 dark:text-white">{attack.source.city}, {attack.source.country}</div>
             </div>
             <div>
               <div className="text-slate-500 text-xs uppercase">Vector</div>
               <div className="text-red-500 dark:text-red-400">{attack.type}</div>
             </div>
             <div>
               <div className="text-slate-500 text-xs uppercase">Confidence</div>
               <div className="text-yellow-600 dark:text-yellow-400">High ({(attack.magnitude * 9.8).toFixed(1)}%)</div>
             </div>
          </div>

          <div className="space-y-2">
            <h4 className="text-slate-700 dark:text-slate-300 text-sm font-bold flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-green-600 dark:text-green-500" />
              Analysis Report
            </h4>
            
            <div className="bg-slate-50 dark:bg-slate-800/50 p-4 rounded-lg min-h-[100px] text-sm text-slate-700 dark:text-slate-300 leading-relaxed border border-slate-200 dark:border-slate-700/50">
              {loading ? (
                <div className="flex items-center justify-center h-full gap-2 text-slate-500">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Analyzing signature...
                </div>
              ) : (
                <p>{analysis}</p>
              )}
            </div>
            
            {!loading && (
              <div className="flex items-center gap-2 text-xs text-yellow-700 dark:text-yellow-500 mt-2 bg-yellow-100 dark:bg-yellow-500/10 p-2 rounded">
                <AlertTriangle className="w-3 h-3" />
                <span>Recommendation: Automated mitigation protocols advised.</span>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default AnalysisModal;