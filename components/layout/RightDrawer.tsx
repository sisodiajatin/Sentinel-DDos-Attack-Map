import React from 'react';
import { X, ChevronLeft } from 'lucide-react';

interface RightDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  onToggle: () => void;
  title: string;
  badge?: number;
  icon: React.ReactNode;
  children: React.ReactNode;
}

const RightDrawer: React.FC<RightDrawerProps> = ({
  isOpen,
  onClose,
  onToggle,
  title,
  badge,
  icon,
  children,
}) => {
  return (
    <>
      {/* Collapsed Tab */}
      {!isOpen && (
        <button
          onClick={onToggle}
          className="fixed right-0 top-1/2 -translate-y-1/2 z-40 flex flex-col items-center gap-2 py-4 px-2 bg-white/90 dark:bg-slate-900/90 backdrop-blur-md border border-r-0 border-slate-200 dark:border-slate-700 rounded-l-lg shadow-lg hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
          aria-label={`Open ${title}`}
        >
          {icon}
          {badge !== undefined && badge > 0 && (
            <span className="text-xs font-bold font-mono text-red-500 bg-red-100 dark:bg-red-900/30 px-1.5 py-0.5 rounded">
              {badge > 99 ? '99+' : badge}
            </span>
          )}
          <ChevronLeft className="w-3 h-3 text-slate-400" />
        </button>
      )}

      {/* Expanded Drawer */}
      <div
        className={`fixed right-0 top-0 h-full z-40 flex flex-col bg-white dark:bg-slate-900 border-l border-slate-200 dark:border-slate-700 shadow-2xl transition-transform duration-300 ease-out ${
          isOpen ? 'translate-x-0' : 'translate-x-full'
        }`}
        style={{ width: '360px' }}
        role="dialog"
        aria-label={title}
        aria-hidden={!isOpen}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-slate-200 dark:border-slate-700">
          <h2 className="font-bold text-slate-900 dark:text-white flex items-center gap-2">
            {icon}
            {title}
          </h2>
          <div className="flex items-center gap-1">
            <button
              onClick={onToggle}
              className="p-1.5 rounded hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 transition-colors"
              aria-label="Collapse drawer"
            >
              <ChevronLeft className="w-4 h-4 rotate-180" />
            </button>
            <button
              onClick={onClose}
              className="p-1.5 rounded hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 transition-colors"
              aria-label="Close drawer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-hidden flex flex-col">
          {children}
        </div>
      </div>

      {/* Backdrop */}
      {isOpen && (
        <div
          className="fixed inset-0 z-30 bg-black/20 dark:bg-black/40 md:hidden"
          onClick={onClose}
          aria-hidden="true"
        />
      )}
    </>
  );
};

export default RightDrawer;
