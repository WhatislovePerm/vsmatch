import { createContext, useContext, useState, type ReactNode } from 'react';
import { DEFAULT_SPORT, type SportKind } from '../types';

interface SportContextValue {
  sport: SportKind;
  setSport: (s: SportKind) => void;
}

const STORAGE_KEY = 'vsmatch.sport';

const SportContext = createContext<SportContextValue | undefined>(undefined);

function loadInitial(): SportKind {
  const stored = localStorage.getItem(STORAGE_KEY) as SportKind | null;
  if (stored === 'Football' || stored === 'Basketball' || stored === 'TableTennis') return stored;
  return DEFAULT_SPORT;
}

export function SportProvider({ children }: { children: ReactNode }) {
  const [sport, setSportState] = useState<SportKind>(loadInitial);

  const setSport = (s: SportKind) => {
    localStorage.setItem(STORAGE_KEY, s);
    setSportState(s);
  };

  return (
    <SportContext.Provider value={{ sport, setSport }}>{children}</SportContext.Provider>
  );
}

export function useSport(): SportContextValue {
  const ctx = useContext(SportContext);
  if (!ctx) throw new Error('useSport must be used within SportProvider');
  return ctx;
}
