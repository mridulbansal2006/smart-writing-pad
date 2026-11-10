import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';

import {
  createId,
  loadAttempts,
  loadProfileName,
  loadSettings,
  saveAttempts,
  saveProfileName,
  saveSettings,
} from '../lib/storage';
import type { Attempt, Settings } from '../lib/types';
import { DEFAULT_SETTINGS } from '../lib/types';

type AppState = {
  settings: Settings;
  updateSettings: (patch: Partial<Settings>) => void;
  resetSettings: () => void;
  attempts: Attempt[];
  recordAttempt: (attempt: Omit<Attempt, 'id' | 'createdAt'>) => Attempt;
  updateAttempt: (id: string, patch: Partial<Attempt>) => void;
  deleteAttempt: (id: string) => void;
  clearAttempts: () => void;
  profileName: string;
  setProfileName: (name: string) => void;
  /** True when the browser refused to persist (private mode, full quota). */
  storageBlocked: boolean;
  /** False until the first load from storage has happened. */
  ready: boolean;
};

const AppContext = createContext<AppState | null>(null);

export function AppProvider({ children }: { children: ReactNode }) {
  const [settings, setSettings] = useState<Settings>(DEFAULT_SETTINGS);
  const [attempts, setAttempts] = useState<Attempt[]>([]);
  const [profileName, setProfileNameState] = useState('');
  const [storageBlocked, setStorageBlocked] = useState(false);
  const [ready, setReady] = useState(false);

  // One read on mount; everything after that is written through.
  useEffect(() => {
    setSettings(loadSettings());
    setAttempts(loadAttempts());
    setProfileNameState(loadProfileName());
    setReady(true);
  }, []);

  // Accessibility preferences are applied as data attributes on <html> so plain
  // CSS can react to them without every component knowing about them.
  useEffect(() => {
    const root = document.documentElement;
    root.dataset.contrast = settings.highContrast ? 'high' : 'normal';
    root.dataset.calm = settings.reducedDistractions ? 'true' : 'false';
    root.dataset.largeControls = settings.largeControls ? 'true' : 'false';
  }, [settings.highContrast, settings.reducedDistractions, settings.largeControls]);

  const persistSettings = useCallback((next: Settings) => {
    setSettings(next);
    if (!saveSettings(next)) setStorageBlocked(true);
  }, []);

  const updateSettings = useCallback(
    (patch: Partial<Settings>) => {
      persistSettings({ ...settings, ...patch });
    },
    [persistSettings, settings],
  );

  const resetSettings = useCallback(() => {
    persistSettings({ ...DEFAULT_SETTINGS });
  }, [persistSettings]);

  const persistAttempts = useCallback((next: Attempt[]) => {
    setAttempts(next);
    if (!saveAttempts(next)) setStorageBlocked(true);
  }, []);

  const recordAttempt = useCallback(
    (attempt: Omit<Attempt, 'id' | 'createdAt'>) => {
      const full: Attempt = { ...attempt, id: createId(), createdAt: Date.now() };
      persistAttempts([full, ...attempts]);
      return full;
    },
    [attempts, persistAttempts],
  );

  const updateAttempt = useCallback(
    (id: string, patch: Partial<Attempt>) => {
      persistAttempts(attempts.map((a) => (a.id === id ? { ...a, ...patch } : a)));
    },
    [attempts, persistAttempts],
  );

  const deleteAttempt = useCallback(
    (id: string) => {
      persistAttempts(attempts.filter((a) => a.id !== id));
    },
    [attempts, persistAttempts],
  );

  const clearAttempts = useCallback(() => persistAttempts([]), [persistAttempts]);

  const setProfileName = useCallback((name: string) => {
    setProfileNameState(name);
    if (!saveProfileName(name)) setStorageBlocked(true);
  }, []);

  const value = useMemo<AppState>(
    () => ({
      settings,
      updateSettings,
      resetSettings,
      attempts,
      recordAttempt,
      updateAttempt,
      deleteAttempt,
      clearAttempts,
      profileName,
      setProfileName,
      storageBlocked,
      ready,
    }),
    [
      settings,
      updateSettings,
      resetSettings,
      attempts,
      recordAttempt,
      updateAttempt,
      deleteAttempt,
      clearAttempts,
      profileName,
      setProfileName,
      storageBlocked,
      ready,
    ],
  );

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

export function useApp(): AppState {
  const context = useContext(AppContext);
  if (!context) throw new Error('useApp must be used inside <AppProvider>');
  return context;
}
