import { describe, expect, it } from 'vitest';

import {
  arc,
  boundsOf,
  distance,
  distanceToSegment,
  headingAt,
  join,
  line,
  poly,
  polylineLength,
  pt,
  resample,
  toPathData,
} from './geometry';

describe('line', () => {
  it('includes both ends and is evenly spaced', () => {
    const points = line(pt(0, 0), pt(10, 0), 5);
    expect(points).toHaveLength(6);
    expect(points[0]).toEqual(pt(0, 0));
    expect(points[5]).toEqual(pt(10, 0));
    expect(points[1]!.x).toBeCloseTo(2);
  });
});

describe('arc', () => {
  it('uses screen angles: -90 is the top, 90 the bottom', () => {
    const top = arc(0, 0, 10, -90, -90)[0]!;
    expect(top.x).toBeCloseTo(0);
    expect(top.y).toBeCloseTo(-10);
    const bottom = arc(0, 0, 10, 90, 90)[0]!;
    expect(bottom.y).toBeCloseTo(10);
  });

  it('keeps every sample on the circle', () => {
    for (const p of arc(5, 7, 12, -90, 180)) {
      expect(distance(p, pt(5, 7))).toBeCloseTo(12, 5);
    }
  });

  it('sweeps in the direction given by the angle order', () => {
    const clockwise = arc(0, 0, 10, 0, 90);
    const anticlockwise = arc(0, 0, 10, 0, -90);
    expect(clockwise[clockwise.length - 1]!.y).toBeGreaterThan(0);
    expect(anticlockwise[anticlockwise.length - 1]!.y).toBeLessThan(0);
  });
});

describe('poly and polylineLength', () => {
  it('measures the full path through every corner', () => {
    expect(polylineLength(poly(pt(0, 0), pt(3, 0), pt(3, 4)))).toBeCloseTo(7);
  });
});

describe('join', () => {
  it('drops the duplicated point where two pieces meet', () => {
    const joined = join(line(pt(0, 0), pt(5, 0), 5), line(pt(5, 0), pt(5, 5), 5));
    expect(joined).toHaveLength(11);
    expect(polylineLength(joined)).toBeCloseTo(10);
  });
});

describe('resample', () => {
  it('spaces points evenly regardless of the input density', () => {
    const dense = line(pt(0, 0), pt(100, 0), 500);
    const sparse = line(pt(0, 0), pt(100, 0), 2);
    const a = resample(dense, 10);
    const b = resample(sparse, 10);
    expect(a.length).toBe(b.length);
    expect(a[1]!.x).toBeCloseTo(10, 1);
  });

  it('handles degenerate inputs', () => {
    expect(resample([], 5)).toEqual([]);
    expect(resample([pt(1, 1)], 5)).toEqual([pt(1, 1)]);
  });
});

describe('distanceToSegment', () => {
  it('measures perpendicular distance inside the segment', () => {
    expect(distanceToSegment(pt(5, 3), pt(0, 0), pt(10, 0))).toBeCloseTo(3);
  });

  it('clamps to the nearest end outside the segment', () => {
    expect(distanceToSegment(pt(-4, 0), pt(0, 0), pt(10, 0))).toBeCloseTo(4);
  });

  it('falls back to point distance for a zero-length segment', () => {
    expect(distanceToSegment(pt(3, 4), pt(0, 0), pt(0, 0))).toBeCloseTo(5);
  });
});

describe('boundsOf', () => {
  it('covers every polyline', () => {
    expect(boundsOf([line(pt(0, 0), pt(10, 0)), line(pt(-5, 2), pt(3, 8))])).toEqual({
      x: -5,
      y: 0,
      w: 15,
      h: 8,
    });
  });

  it('is null when there is nothing to measure', () => {
    expect(boundsOf([])).toBeNull();
  });
});

describe('headingAt', () => {
  it('returns a unit vector pointing along the stroke', () => {
    const heading = headingAt(line(pt(0, 0), pt(0, 10), 10));
    expect(heading.x).toBeCloseTo(0);
    expect(heading.y).toBeCloseTo(1);
  });
});

describe('toPathData', () => {
  it('starts with a move and continues with lines', () => {
    expect(toPathData([pt(1, 2), pt(3, 4)])).toBe('M 1 2 L 3 4');
    expect(toPathData([])).toBe('');
  });
});
