import { beforeEach, describe, expect, it } from 'vitest';

import {
  MAX_ATTEMPTS,
  clearAllLocalData,
  createId,
  loadAttempts,
  loadSettings,
  saveAttempts,
  saveSettings,
  sanitizeSettings,
} from './storage';
import { DEFAULT_SETTINGS, type Attempt } from './types';

function attempt(createdAt: number, id = `a${createdAt}`): Attempt {
  return {
    id,
    createdAt,
    mode: 'tracing',
    kind: 'uppercase',
    target: 'A',
    coverage: 0.9,
    onGuide: 0.9,
    tolerance: 20,
    completed: true,
    selfRating: null,
    sampleId: null,
    needsPractice: false,
  };
}

beforeEach(() => {
  window.localStorage.clear();
});

describe('settings persistence', () => {
  it('falls back to the defaults when nothing is stored', () => {
    expect(loadSettings()).toEqual(DEFAULT_SETTINGS);
  });

  it('round-trips a saved value', () => {
    saveSettings({ ...DEFAULT_SETTINGS, highContrast: true, letterScale: 1.4 });
    const loaded = loadSettings();
    expect(loaded.highContrast).toBe(true);
    expect(loaded.letterScale).toBeCloseTo(1.4);
  });

  it('recovers from a corrupted value instead of throwing', () => {
    window.localStorage.setItem('swp.v1.settings', '{not json');
    expect(loadSettings()).toEqual(DEFAULT_SETTINGS);
  });
});

describe('sanitizeSettings', () => {
  it('clamps out-of-range numbers', () => {
    expect(sanitizeSettings({ letterScale: 99 }).letterScale).toBe(1.8);
    expect(sanitizeSettings({ letterScale: -5 }).letterScale).toBe(0.6);
    expect(sanitizeSettings({ penWidth: 1000 }).penWidth).toBe(24);
  });

  it('drops values of the wrong type or shape', () => {
    const result = sanitizeSettings({
      highContrast: 'yes' as unknown as boolean,
      penColor: 'red',
      guideVisibility: 'sideways' as never,
      letterScale: Number.NaN,
    });
    expect(result.highContrast).toBe(DEFAULT_SETTINGS.highContrast);
    expect(result.penColor).toBe(DEFAULT_SETTINGS.penColor);
    expect(result.guideVisibility).toBe(DEFAULT_SETTINGS.guideVisibility);
    expect(result.letterScale).toBe(DEFAULT_SETTINGS.letterScale);
  });

  it('accepts valid hex colours and enum values', () => {
    const result = sanitizeSettings({ penColor: '#1F7A4A', guideVisibility: 'faint', difficulty: 'precise' });
    expect(result.penColor).toBe('#1F7A4A');
    expect(result.guideVisibility).toBe('faint');
    expect(result.difficulty).toBe('precise');
  });

  it('ignores unknown keys', () => {
    const result = sanitizeSettings({ sneaky: true } as never);
    expect(result).toEqual(DEFAULT_SETTINGS);
  });
});

describe('attempt persistence', () => {
  it('returns an empty log on a fresh device', () => {
    expect(loadAttempts()).toEqual([]);
  });

  it('round-trips attempts newest first', () => {
    saveAttempts([attempt(1000), attempt(3000), attempt(2000)]);
    expect(loadAttempts().map((a) => a.createdAt)).toEqual([3000, 2000, 1000]);
  });

  it('caps the log and keeps the newest records', () => {
    const many = Array.from({ length: MAX_ATTEMPTS + 25 }, (_, i) => attempt(i + 1, `a${i}`));
    saveAttempts(many);
    const loaded = loadAttempts();
    expect(loaded).toHaveLength(MAX_ATTEMPTS);
    expect(loaded[0]!.createdAt).toBe(MAX_ATTEMPTS + 25);
  });

  it('skips records that are not attempts', () => {
    window.localStorage.setItem('swp.v1.attempts', JSON.stringify([attempt(1), null, 42, { id: 'x' }]));
    expect(loadAttempts()).toHaveLength(1);
  });

  it('recovers when the stored value is not an array', () => {
    window.localStorage.setItem('swp.v1.attempts', '{"nope":true}');
    expect(loadAttempts()).toEqual([]);
  });
});

describe('clearAllLocalData', () => {
  it('removes everything the app wrote', () => {
    saveSettings({ ...DEFAULT_SETTINGS, highContrast: true });
    saveAttempts([attempt(1)]);
    clearAllLocalData();
    expect(loadAttempts()).toEqual([]);
    expect(loadSettings()).toEqual(DEFAULT_SETTINGS);
  });
});

describe('createId', () => {
  it('produces unique non-empty ids', () => {
    const ids = new Set(Array.from({ length: 500 }, () => createId()));
    expect(ids.size).toBe(500);
    for (const id of ids) expect(id.length).toBeGreaterThan(5);
  });
});
