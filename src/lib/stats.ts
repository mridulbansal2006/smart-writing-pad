/**
 * Everything the dashboards show is derived here from the recorded attempts.
 *
 * Only facts the app actually observed are reported: how many attempts were
 * made, how many cleared the tracing-coverage thresholds, which characters
 * have been worked on, and when. There is no inferred "handwriting score",
 * no improvement percentage and no prediction.
 */

import type { Attempt, ExerciseKind } from './types';

export type DayCount = { date: string; count: number };

export type ProgressSummary = {
  totalAttempts: number;
  completedTraces: number;
  /** Attempts in modes that have no guide, so nothing was measured. */
  unmeasuredAttempts: number;
  savedSamples: number;
  practiceSessions: number;
  distinctTargets: number;
  firstAttemptAt: number | null;
  lastAttemptAt: number | null;
  /** Attempt counts for the last 14 days, oldest first. */
  dailyActivity: DayCount[];
  /** Mean coverage over measured attempts, or null when there are none. */
  meanCoverage: number | null;
  meanOnGuide: number | null;
};

/** Gap after which the next attempt counts as a new practice session. */
export const SESSION_GAP_MS = 20 * 60 * 1000;

export function localDateKey(timestamp: number): string {
  const d = new Date(timestamp);
  const month = `${d.getMonth() + 1}`.padStart(2, '0');
  const day = `${d.getDate()}`.padStart(2, '0');
  return `${d.getFullYear()}-${month}-${day}`;
}

/**
 * Count practice sessions by grouping attempts that happened close together.
 * A child who practises before school and again after it has two sessions.
 */
export function countSessions(attempts: Attempt[], gapMs = SESSION_GAP_MS): number {
  if (attempts.length === 0) return 0;
  const times = attempts.map((a) => a.createdAt).sort((a, b) => a - b);
  let sessions = 1;
  for (let i = 1; i < times.length; i++) {
    if (times[i]! - times[i - 1]! > gapMs) sessions++;
  }
  return sessions;
}

export function dailyActivity(attempts: Attempt[], days = 14, now = Date.now()): DayCount[] {
  const counts = new Map<string, number>();
  for (const attempt of attempts) {
    const key = localDateKey(attempt.createdAt);
    counts.set(key, (counts.get(key) ?? 0) + 1);
  }
  const out: DayCount[] = [];
  const midnight = new Date(now);
  midnight.setHours(0, 0, 0, 0);
  for (let i = days - 1; i >= 0; i--) {
    const day = new Date(midnight.getTime() - i * 24 * 60 * 60 * 1000);
    const key = localDateKey(day.getTime());
    out.push({ date: key, count: counts.get(key) ?? 0 });
  }
  return out;
}

export function summarize(attempts: Attempt[], now = Date.now()): ProgressSummary {
  const measured = attempts.filter((a) => a.coverage !== null);
  const times = attempts.map((a) => a.createdAt);
  const mean = (values: number[]) =>
    values.length === 0 ? null : values.reduce((s, v) => s + v, 0) / values.length;

  return {
    totalAttempts: attempts.length,
    completedTraces: attempts.filter((a) => a.completed).length,
    unmeasuredAttempts: attempts.length - measured.length,
    savedSamples: attempts.filter((a) => a.sampleId !== null).length,
    practiceSessions: countSessions(attempts),
    distinctTargets: new Set(attempts.filter((a) => a.target !== '').map((a) => a.target)).size,
    firstAttemptAt: times.length ? Math.min(...times) : null,
    lastAttemptAt: times.length ? Math.max(...times) : null,
    dailyActivity: dailyActivity(attempts, 14, now),
    meanCoverage: mean(measured.map((a) => a.coverage!)),
    meanOnGuide: mean(measured.map((a) => a.onGuide!)),
  };
}

export type TargetStat = {
  target: string;
  kind: ExerciseKind;
  attempts: number;
  completed: number;
  bestCoverage: number | null;
  lastAttemptAt: number;
  flagged: boolean;
};

/** Per-character/word rollup, newest activity first. */
export function byTarget(attempts: Attempt[]): TargetStat[] {
  const map = new Map<string, TargetStat>();
  for (const attempt of attempts) {
    if (attempt.target === '') continue;
    const key = `${attempt.kind}:${attempt.target}`;
    const existing = map.get(key);
    if (!existing) {
      map.set(key, {
        target: attempt.target,
        kind: attempt.kind,
        attempts: 1,
        completed: attempt.completed ? 1 : 0,
        bestCoverage: attempt.coverage,
        lastAttemptAt: attempt.createdAt,
        flagged: attempt.needsPractice,
      });
      continue;
    }
    existing.attempts += 1;
    if (attempt.completed) existing.completed += 1;
    if (attempt.coverage !== null) {
      existing.bestCoverage =
        existing.bestCoverage === null ? attempt.coverage : Math.max(existing.bestCoverage, attempt.coverage);
    }
    existing.lastAttemptAt = Math.max(existing.lastAttemptAt, attempt.createdAt);
    existing.flagged = existing.flagged || attempt.needsPractice;
  }
  return [...map.values()].sort((a, b) => b.lastAttemptAt - a.lastAttemptAt);
}

/**
 * Characters worth revisiting: either flagged during review, or tried at least
 * twice in a guided mode without an attempt clearing the thresholds. This is
 * a filter over recorded results, not a prediction about the child.
 */
export function needsMorePractice(attempts: Attempt[]): TargetStat[] {
  return byTarget(attempts).filter(
    (stat) => stat.flagged || (stat.completed === 0 && stat.attempts >= 2 && stat.bestCoverage !== null),
  );
}

/** CSV export of the attempt log. One row per attempt, with a header. */
export function attemptsToCsv(attempts: Attempt[]): string {
  const header = [
    'date',
    'time',
    'mode',
    'kind',
    'target',
    'coverage_percent',
    'on_guide_percent',
    'met_threshold',
    'self_rating',
    'sample_saved',
    'flagged_for_practice',
  ];
  const rows = [...attempts]
    .sort((a, b) => a.createdAt - b.createdAt)
    .map((a) => {
      const d = new Date(a.createdAt);
      return [
        localDateKey(a.createdAt),
        d.toLocaleTimeString(),
        a.mode,
        a.kind,
        a.target,
        a.coverage === null ? '' : Math.round(a.coverage * 100).toString(),
        a.onGuide === null ? '' : Math.round(a.onGuide * 100).toString(),
        a.completed ? 'yes' : 'no',
        a.selfRating === null ? '' : a.selfRating.toString(),
        a.sampleId ? 'yes' : 'no',
        a.needsPractice ? 'yes' : 'no',
      ];
    });
  return [header, ...rows].map((row) => row.map(csvCell).join(',')).join('\r\n');
}

function csvCell(value: string): string {
  return /[",\r\n]/.test(value) ? `"${value.replace(/"/g, '""')}"` : value;
}
