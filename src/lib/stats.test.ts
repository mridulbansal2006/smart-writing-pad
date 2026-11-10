import { describe, expect, it } from 'vitest';

import {
  SESSION_GAP_MS,
  attemptsToCsv,
  byTarget,
  countSessions,
  dailyActivity,
  localDateKey,
  needsMorePractice,
  summarize,
} from './stats';
import type { Attempt } from './types';

let counter = 0;
function attempt(patch: Partial<Attempt> = {}): Attempt {
  counter += 1;
  return {
    id: `a${counter}`,
    createdAt: Date.UTC(2026, 10, 10, 12, 0, 0),
    mode: 'tracing',
    kind: 'uppercase',
    target: 'A',
    coverage: 0.9,
    onGuide: 0.8,
    tolerance: 20,
    completed: true,
    selfRating: null,
    sampleId: null,
    needsPractice: false,
    ...patch,
  };
}

describe('countSessions', () => {
  it('is zero with no attempts', () => {
    expect(countSessions([])).toBe(0);
  });

  it('groups attempts that happen close together', () => {
    const start = Date.now();
    const attempts = [
      attempt({ createdAt: start }),
      attempt({ createdAt: start + 60_000 }),
      attempt({ createdAt: start + 120_000 }),
    ];
    expect(countSessions(attempts)).toBe(1);
  });

  it('starts a new session after a long gap', () => {
    const start = Date.now();
    const attempts = [
      attempt({ createdAt: start }),
      attempt({ createdAt: start + SESSION_GAP_MS + 1000 }),
      attempt({ createdAt: start + SESSION_GAP_MS + 2000 }),
    ];
    expect(countSessions(attempts)).toBe(2);
  });

  it('does not depend on the order records arrive in', () => {
    const start = Date.now();
    const unordered = [
      attempt({ createdAt: start + SESSION_GAP_MS * 2 }),
      attempt({ createdAt: start }),
      attempt({ createdAt: start + 1000 }),
    ];
    expect(countSessions(unordered)).toBe(2);
  });
});

describe('dailyActivity', () => {
  it('returns one bucket per day, oldest first, including empty days', () => {
    const now = Date.now();
    const days = dailyActivity([attempt({ createdAt: now })], 14, now);
    expect(days).toHaveLength(14);
    expect(days[13]!.date).toBe(localDateKey(now));
    expect(days[13]!.count).toBe(1);
    expect(days[0]!.count).toBe(0);
  });

  it('ignores attempts outside the window', () => {
    const now = Date.now();
    const old = now - 40 * 24 * 60 * 60 * 1000;
    const days = dailyActivity([attempt({ createdAt: old })], 14, now);
    expect(days.every((day) => day.count === 0)).toBe(true);
  });
});

describe('summarize', () => {
  it('reports zeroes for an empty log', () => {
    const summary = summarize([]);
    expect(summary.totalAttempts).toBe(0);
    expect(summary.meanCoverage).toBeNull();
    expect(summary.firstAttemptAt).toBeNull();
    expect(summary.dailyActivity).toHaveLength(14);
  });

  it('separates measured from unmeasured attempts', () => {
    const summary = summarize([
      attempt({ coverage: 0.8, onGuide: 0.8, completed: true }),
      attempt({ coverage: 0.4, onGuide: 0.5, completed: false }),
      attempt({ mode: 'practice', coverage: null, onGuide: null, completed: false }),
    ]);
    expect(summary.totalAttempts).toBe(3);
    expect(summary.completedTraces).toBe(1);
    expect(summary.unmeasuredAttempts).toBe(1);
    expect(summary.meanCoverage).toBeCloseTo(0.6);
    expect(summary.meanOnGuide).toBeCloseTo(0.65);
  });

  it('counts saved samples and distinct targets', () => {
    const summary = summarize([
      attempt({ target: 'A', sampleId: 's1' }),
      attempt({ target: 'B' }),
      attempt({ target: 'A' }),
      attempt({ target: '', kind: 'free', mode: 'free' }),
    ]);
    expect(summary.savedSamples).toBe(1);
    expect(summary.distinctTargets).toBe(2);
  });
});

describe('byTarget', () => {
  it('rolls up attempts per target and keeps the best coverage', () => {
    const stats = byTarget([
      attempt({ target: 'C', coverage: 0.5, completed: false }),
      attempt({ target: 'C', coverage: 0.82, completed: true }),
      attempt({ target: '', kind: 'free' }),
    ]);
    expect(stats).toHaveLength(1);
    expect(stats[0]!.attempts).toBe(2);
    expect(stats[0]!.completed).toBe(1);
    expect(stats[0]!.bestCoverage).toBeCloseTo(0.82);
  });

  it('keeps the same character in different cases apart', () => {
    const stats = byTarget([
      attempt({ target: 'S', kind: 'uppercase' }),
      attempt({ target: 's', kind: 'lowercase' }),
    ]);
    expect(stats).toHaveLength(2);
  });
});

describe('needsMorePractice', () => {
  it('lists targets attempted twice or more without meeting the target', () => {
    const list = needsMorePractice([
      attempt({ target: 'G', coverage: 0.4, completed: false }),
      attempt({ target: 'G', coverage: 0.5, completed: false }),
      attempt({ target: 'H', coverage: 0.9, completed: true }),
    ]);
    expect(list.map((s) => s.target)).toEqual(['G']);
  });

  it('includes anything an adult flagged, however it was scored', () => {
    const list = needsMorePractice([attempt({ target: 'Z', completed: true, needsPractice: true })]);
    expect(list.map((s) => s.target)).toEqual(['Z']);
  });

  it('ignores a single unsuccessful attempt', () => {
    expect(needsMorePractice([attempt({ target: 'K', coverage: 0.3, completed: false })])).toEqual([]);
  });

  it('ignores unmeasured practice attempts', () => {
    const list = needsMorePractice([
      attempt({ target: 'M', mode: 'practice', coverage: null, onGuide: null, completed: false }),
      attempt({ target: 'M', mode: 'practice', coverage: null, onGuide: null, completed: false }),
    ]);
    expect(list).toEqual([]);
  });
});

describe('attemptsToCsv', () => {
  it('writes a header and one row per attempt, oldest first', () => {
    const csv = attemptsToCsv([
      attempt({ createdAt: Date.UTC(2026, 10, 10, 10, 0), target: 'A' }),
      attempt({ createdAt: Date.UTC(2026, 10, 9, 10, 0), target: 'B' }),
    ]);
    const rows = csv.split('\r\n');
    expect(rows[0]).toContain('coverage_percent');
    expect(rows).toHaveLength(3);
    expect(rows[1]).toContain('B');
    expect(rows[2]).toContain('A');
  });

  it('leaves unmeasured values blank rather than guessing', () => {
    const csv = attemptsToCsv([attempt({ coverage: null, onGuide: null, mode: 'practice', selfRating: 2 })]);
    const cells = csv.split('\r\n')[1]!.split(',');
    expect(cells[5]).toBe('');
    expect(cells[6]).toBe('');
    expect(cells[8]).toBe('2');
  });

  it('quotes values that contain a comma', () => {
    const csv = attemptsToCsv([attempt({ target: 'a,b' })]);
    expect(csv).toContain('"a,b"');
  });
});
