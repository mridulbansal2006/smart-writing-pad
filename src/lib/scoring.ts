/**
 * Tracing coverage, deliberately NOT handwriting recognition.
 *
 * The app only measures how much of the printed guide the child's ink actually
 * covered, and how much of their ink landed on the guide. Both are plain
 * geometric overlap measurements on the same canvas coordinates:
 *
 *   coverage  — share of guide sample points that have ink within `tolerance`.
 *               "Did they go over the whole letter?"
 *   onGuide   — share of the child's ink points that sit within `tolerance` of
 *               the guide. "Did they stay on the letter?"
 *
 * Neither number says anything about letter identity, handwriting quality or
 * learning progress, and the UI labels them exactly as what they are. A blank
 * canvas scores 0; scribbling over the whole sheet pushes coverage up but
 * drops onGuide, so the two have to be read together.
 */

import {
  distanceToPolylines,
  type Polyline,
  polylineLength,
  resample,
} from './geometry';

export type TraceScore = {
  /** 0–1: share of the guide that was covered by ink. */
  coverage: number;
  /** 0–1: share of the ink that landed on the guide. */
  onGuide: number;
  /** Sample counts, kept so the UI can be honest about thin evidence. */
  guideSamples: number;
  inkSamples: number;
  /** The tolerance (in canvas units) the two shares were measured with. */
  tolerance: number;
};

export const EMPTY_SCORE: TraceScore = {
  coverage: 0,
  onGuide: 0,
  guideSamples: 0,
  inkSamples: 0,
  tolerance: 0,
};

export type ScoreOptions = {
  /** How far ink may sit from the guide and still count, in canvas units. */
  tolerance: number;
  /** Spacing used to resample both sides before comparing. */
  spacing?: number;
};

export function scoreTrace(
  guide: Polyline[],
  ink: Polyline[],
  { tolerance, spacing = 4 }: ScoreOptions,
): TraceScore {
  const guidePoints = guide.flatMap((stroke) => resample(stroke, spacing));
  const inkPoints = ink.flatMap((stroke) => resample(stroke, spacing));

  if (guidePoints.length === 0 || inkPoints.length === 0) {
    return { ...EMPTY_SCORE, guideSamples: guidePoints.length, inkSamples: inkPoints.length, tolerance };
  }

  let covered = 0;
  for (const p of guidePoints) {
    if (distanceToPolylines(p, ink) <= tolerance) covered++;
  }

  let onGuide = 0;
  for (const p of inkPoints) {
    if (distanceToPolylines(p, guide) <= tolerance) onGuide++;
  }

  return {
    coverage: covered / guidePoints.length,
    onGuide: onGuide / inkPoints.length,
    guideSamples: guidePoints.length,
    inkSamples: inkPoints.length,
    tolerance,
  };
}

/**
 * Whether an attempt counts as "traced over". Both shares have to clear their
 * threshold, so neither an untouched letter nor an all-over scribble passes.
 */
export function isTraceComplete(score: TraceScore, minCoverage = 0.75, minOnGuide = 0.6): boolean {
  return score.coverage >= minCoverage && score.onGuide >= minOnGuide;
}

/** How much ink there is, in canvas units — used to spot an empty attempt. */
export function totalInkLength(ink: Polyline[]): number {
  return ink.reduce((sum, stroke) => sum + polylineLength(stroke), 0);
}
