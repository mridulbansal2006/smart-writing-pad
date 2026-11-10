/**
 * Local-first persistence. Settings and attempt records are small and are kept
 * in localStorage; writing samples are PNGs and live in IndexedDB (see
 * `samples.ts`). Nothing leaves the browser and no personal details are asked
 * for — a profile is just a nickname typed on the device.
 *
 * Every read is defensive: localStorage throws in some privacy modes, and a
 * half-written or hand-edited value must not break the app.
 */

import { DEFAULT_SETTINGS, type Attempt, type Settings } from './types';

const KEY = {
  settings: 'swp.v1.settings',
  attempts: 'swp.v1.attempts',
  profile: 'swp.v1.profile',
} as const;

/** Attempts kept per device. Older records are dropped beyond this. */
export const MAX_ATTEMPTS = 500;

function readRaw(key: string): string | null {
  try {
    return window.localStorage.getItem(key);
  } catch {
    return null;
  }
}

function writeRaw(key: string, value: string): boolean {
  try {
    window.localStorage.setItem(key, value);
    return true;
  } catch {
    return false;
  }
}

export function loadSettings(): Settings {
  const raw = readRaw(KEY.settings);
  if (!raw) return { ...DEFAULT_SETTINGS };
  try {
    const parsed = JSON.parse(raw) as Partial<Settings>;
    return sanitizeSettings(parsed);
  } catch {
    return { ...DEFAULT_SETTINGS };
  }
}

/** Keep only known keys with values of the right shape and range. */
export function sanitizeSettings(input: Partial<Settings>): Settings {
  const out: Settings = { ...DEFAULT_SETTINGS };
  if (typeof input.letterScale === 'number' && Number.isFinite(input.letterScale)) {
    out.letterScale = clamp(input.letterScale, 0.6, 1.8);
  }
  if (typeof input.penWidth === 'number' && Number.isFinite(input.penWidth)) {
    out.penWidth = clamp(input.penWidth, 2, 24);
  }
  if (typeof input.penColor === 'string' && /^#[0-9a-f]{6}$/i.test(input.penColor)) {
    out.penColor = input.penColor;
  }
  for (const flag of [
    'highContrast',
    'reducedDistractions',
    'showStartMarkers',
    'showRuledLines',
    'largeControls',
    'speechEnabled',
  ] as const) {
    if (typeof input[flag] === 'boolean') out[flag] = input[flag];
  }
  if (input.guideVisibility === 'full' || input.guideVisibility === 'faint' || input.guideVisibility === 'off') {
    out.guideVisibility = input.guideVisibility;
  }
  if (input.difficulty === 'easy' || input.difficulty === 'medium' || input.difficulty === 'precise') {
    out.difficulty = input.difficulty;
  }
  return out;
}

export function saveSettings(settings: Settings): boolean {
  return writeRaw(KEY.settings, JSON.stringify(settings));
}

export function loadAttempts(): Attempt[] {
  const raw = readRaw(KEY.attempts);
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(isAttempt).sort((a, b) => b.createdAt - a.createdAt);
  } catch {
    return [];
  }
}

function isAttempt(value: unknown): value is Attempt {
  if (!value || typeof value !== 'object') return false;
  const a = value as Partial<Attempt>;
  return typeof a.id === 'string' && typeof a.createdAt === 'number' && typeof a.target === 'string';
}

export function saveAttempts(attempts: Attempt[]): boolean {
  const trimmed = [...attempts].sort((a, b) => b.createdAt - a.createdAt).slice(0, MAX_ATTEMPTS);
  return writeRaw(KEY.attempts, JSON.stringify(trimmed));
}

export function loadProfileName(): string {
  return readRaw(KEY.profile) ?? '';
}

export function saveProfileName(name: string): boolean {
  return writeRaw(KEY.profile, name.slice(0, 40));
}

/** Remove every record this app wrote on the device. */
export function clearAllLocalData(): void {
  for (const key of Object.values(KEY)) {
    try {
      window.localStorage.removeItem(key);
    } catch {
      /* nothing we can do, and nothing to recover */
    }
  }
}

export function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

/** Short unique id; `crypto.randomUUID` is not available on every browser. */
export function createId(): string {
  const cryptoObj = globalThis.crypto as Crypto | undefined;
  if (cryptoObj && typeof cryptoObj.randomUUID === 'function') return cryptoObj.randomUUID();
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}
