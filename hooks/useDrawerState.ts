import { useState, useCallback, useEffect } from 'react';

export interface DrawerState {
  isOpen: boolean;
  open: () => void;
  close: () => void;
  toggle: () => void;
}

export function useDrawerState(
  key: string,
  defaultOpen: boolean = false,
  persist: boolean = false
): DrawerState {
  const [isOpen, setIsOpen] = useState(() => {
    if (persist && typeof window !== 'undefined') {
      const stored = localStorage.getItem(`drawer-${key}`);
      if (stored !== null) {
        return stored === 'true';
      }
    }
    return defaultOpen;
  });

  useEffect(() => {
    if (persist) {
      localStorage.setItem(`drawer-${key}`, String(isOpen));
    }
  }, [isOpen, key, persist]);

  const open = useCallback(() => setIsOpen(true), []);
  const close = useCallback(() => setIsOpen(false), []);
  const toggle = useCallback(() => setIsOpen(prev => !prev), []);

  return { isOpen, open, close, toggle };
}
