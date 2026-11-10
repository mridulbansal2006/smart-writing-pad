import { describe, expect, it } from 'vitest';

import { line, pt, type Polyline } from './geometry';
import { glyphFor } from './glyphs';
import { EMPTY_SCORE, isTraceComplete, scoreTrace, totalInkLength } from './scoring';

const guide: Polyline[] = [line(pt(0, 0), pt(100, 0), 100)];

/** Shift a polyline sideways, to imitate ink that drifted off the guide. */
const shift = (points: Polyline, dx: number, dy: number) => points.map((p) => pt(p.x + dx, p.y + dy));

describe('scoreTrace', () => {
  it('scores a perfect retrace as full coverage', () => {
    const score = scoreTrace(guide, guide, { tolerance: 10 });
    expect(score.coverage).toBeCloseTo(1);
    expect(score.onGuide).toBeCloseTo(1);
    expect(isTraceComplete(score)).toBe(true);
  });

  it('scores an untouched guide as zero', () => {
    const score = scoreTrace(guide, [], { tolerance: 10 });
    expect(score).toEqual({ ...EMPTY_SCORE, guideSamples: score.guideSamples, tolerance: 10 });
    expect(score.coverage).toBe(0);
    expect(isTraceComplete(score)).toBe(false);
  });

  it('scores ink that is nowhere near the guide as zero on both measures', () => {
    const score = scoreTrace(guide, [shift(guide[0]!, 0, 400)], { tolerance: 10 });
    expect(score.coverage).toBe(0);
    expect(score.onGuide).toBe(0);
  });

  it('accepts ink inside the tolerance and rejects it outside', () => {
    const inside = scoreTrace(guide, [shift(guide[0]!, 0, 8)], { tolerance: 10 });
    expect(inside.coverage).toBeCloseTo(1);
    const outside = scoreTrace(guide, [shift(guide[0]!, 0, 12)], { tolerance: 10 });
    expect(outside.coverage).toBe(0);
  });

  it('counts only the part of the guide that was traced', () => {
    const half = scoreTrace(guide, [line(pt(0, 0), pt(50, 0), 50)], { tolerance: 5 });
    expect(half.coverage).toBeGreaterThan(0.45);
    expect(half.coverage).toBeLessThan(0.56);
    expect(half.onGuide).toBeCloseTo(1);
    expect(isTraceComplete(half)).toBe(false);
  });

  it('does not reward scribbling over the whole sheet', () => {
    // Ink that crosses the guide many times covers it, but most of the ink is
    // off the shape — which is exactly what `onGuide` is there to catch.
    const scribble: Polyline[] = [];
    for (let x = 0; x <= 100; x += 4) scribble.push(line(pt(x, -60), pt(x, 60), 40));
    const score = scoreTrace(guide, scribble, { tolerance: 10 });
    expect(score.coverage).toBeGreaterThan(0.9);
    expect(score.onGuide).toBeLessThan(0.3);
    expect(isTraceComplete(score)).toBe(false);
  });

  it('is independent of drawing speed', () => {
    // The same path sampled sparsely (a fast stroke) and densely (a slow one).
    const fast = scoreTrace(guide, [line(pt(0, 0), pt(100, 0), 4)], { tolerance: 6 });
    const slow = scoreTrace(guide, [line(pt(0, 0), pt(100, 0), 400)], { tolerance: 6 });
    expect(fast.coverage).toBeCloseTo(slow.coverage, 2);
    expect(fast.onGuide).toBeCloseTo(slow.onGuide, 2);
  });

  it('works on real glyph data', () => {
    // T is two strokes: the top bar, then the stem.
    const strokes = glyphFor('T')!.strokes;
    expect(strokes).toHaveLength(2);

    const traced = scoreTrace(strokes, strokes, { tolerance: 12 });
    expect(traced.coverage).toBeCloseTo(1);

    // Drawing only the bar leaves most of the stem uncovered.
    const onlyFirstStroke = scoreTrace(strokes, [strokes[0]!], { tolerance: 12 });
    expect(onlyFirstStroke.coverage).toBeGreaterThan(0.2);
    expect(onlyFirstStroke.coverage).toBeLessThan(0.8);
    expect(onlyFirstStroke.onGuide).toBeCloseTo(1);
  });

  it('reports the tolerance and sample counts it used', () => {
    const score = scoreTrace(guide, guide, { tolerance: 7, spacing: 5 });
    expect(score.tolerance).toBe(7);
    expect(score.guideSamples).toBeGreaterThan(15);
    expect(score.inkSamples).toBeGreaterThan(15);
  });
});

describe('isTraceComplete', () => {
  it('needs both measures to clear their thresholds', () => {
    const base = { guideSamples: 10, inkSamples: 10, tolerance: 10 };
    expect(isTraceComplete({ ...base, coverage: 0.8, onGuide: 0.7 })).toBe(true);
    expect(isTraceComplete({ ...base, coverage: 0.8, onGuide: 0.4 })).toBe(false);
    expect(isTraceComplete({ ...base, coverage: 0.6, onGuide: 0.9 })).toBe(false);
  });
});

describe('totalInkLength', () => {
  it('adds up every stroke', () => {
    expect(totalInkLength([line(pt(0, 0), pt(3, 4)), line(pt(0, 0), pt(0, 10))])).toBeCloseTo(15);
    expect(totalInkLength([])).toBe(0);
  });
});
