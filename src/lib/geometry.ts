/**
 * Small geometry helpers shared by the glyph library, the canvas and the
 * tracing-coverage scorer. Everything here is pure so it can be unit tested
 * in Node without a DOM.
 */

export type Point = { x: number; y: number };

/** A polyline. Glyph strokes and user strokes are both just lists of points. */
export type Polyline = Point[];

export const pt = (x: number, y: number): Point => ({ x, y });

export function distance(a: Point, b: Point): number {
  const dx = a.x - b.x;
  const dy = a.y - b.y;
  return Math.sqrt(dx * dx + dy * dy);
}

/** Total length along a polyline. */
export function polylineLength(points: Polyline): number {
  let total = 0;
  for (let i = 1; i < points.length; i++) total += distance(points[i - 1]!, points[i]!);
  return total;
}

/** Straight segment sampled into `steps + 1` points. */
export function line(from: Point, to: Point, steps = 12): Polyline {
  const out: Polyline = [];
  for (let i = 0; i <= steps; i++) {
    const t = i / steps;
    out.push(pt(from.x + (to.x - from.x) * t, from.y + (to.y - from.y) * t));
  }
  return out;
}

/** Polyline through a list of corner points, with each leg sampled. */
export function poly(...corners: Point[]): Polyline {
  const out: Polyline = [corners[0]!];
  for (let i = 1; i < corners.length; i++) {
    out.push(...line(corners[i - 1]!, corners[i]!, 12).slice(1));
  }
  return out;
}

/**
 * Circular arc sampled into a polyline. Angles are in degrees in screen space
 * (y grows downwards): 0 = right, 90 = bottom, -90 = top, 180 = left.
 * The sweep runs from `a0` to `a1`, so a decreasing pair sweeps anticlockwise
 * on screen. This is what gives every glyph stroke an unambiguous direction.
 */
export function arc(cx: number, cy: number, r: number, a0: number, a1: number): Polyline {
  const span = Math.abs(a1 - a0);
  const steps = Math.max(6, Math.round(span / 6));
  const out: Polyline = [];
  for (let i = 0; i <= steps; i++) {
    const deg = a0 + ((a1 - a0) * i) / steps;
    const rad = (deg * Math.PI) / 180;
    out.push(pt(cx + r * Math.cos(rad), cy + r * Math.sin(rad)));
  }
  return out;
}

/** Concatenate sampled pieces into a single continuous stroke. */
export function join(...parts: Polyline[]): Polyline {
  const out: Polyline = [];
  for (const part of parts) {
    for (const p of part) {
      const last = out[out.length - 1];
      if (last && distance(last, p) < 0.001) continue;
      out.push(p);
    }
  }
  return out;
}

/** `M x y L x y …` path data for rendering a polyline as SVG. */
export function toPathData(points: Polyline): string {
  if (points.length === 0) return '';
  const head = points[0]!;
  const rest = points.slice(1).map((p) => `L ${round(p.x)} ${round(p.y)}`);
  return [`M ${round(head.x)} ${round(head.y)}`, ...rest].join(' ');
}

const round = (n: number) => Math.round(n * 100) / 100;

/**
 * Resample a polyline to points spaced `spacing` apart. Used to make scoring
 * independent of how fast the child moved the pen (a slow drag produces far
 * more raw pointer samples than a quick one).
 */
export function resample(points: Polyline, spacing: number): Polyline {
  if (points.length === 0) return [];
  if (points.length === 1) return [points[0]!];
  const out: Polyline = [points[0]!];
  let carry = 0;
  for (let i = 1; i < points.length; i++) {
    const a = points[i - 1]!;
    const b = points[i]!;
    const segment = distance(a, b);
    if (segment === 0) continue;
    let travelled = spacing - carry;
    while (travelled <= segment) {
      const t = travelled / segment;
      out.push(pt(a.x + (b.x - a.x) * t, a.y + (b.y - a.y) * t));
      travelled += spacing;
    }
    carry = (segment - (travelled - spacing)) % spacing;
  }
  const last = points[points.length - 1]!;
  if (distance(out[out.length - 1]!, last) > spacing / 2) out.push(last);
  return out;
}

/** Shortest distance from `p` to the segment `a`–`b`. */
export function distanceToSegment(p: Point, a: Point, b: Point): number {
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const lengthSquared = dx * dx + dy * dy;
  if (lengthSquared === 0) return distance(p, a);
  let t = ((p.x - a.x) * dx + (p.y - a.y) * dy) / lengthSquared;
  t = Math.max(0, Math.min(1, t));
  return distance(p, pt(a.x + t * dx, a.y + t * dy));
}

/** Shortest distance from `p` to any segment of any polyline in `lines`. */
export function distanceToPolylines(p: Point, lines: Polyline[]): number {
  let best = Infinity;
  for (const points of lines) {
    if (points.length === 1) {
      best = Math.min(best, distance(p, points[0]!));
      continue;
    }
    for (let i = 1; i < points.length; i++) {
      const d = distanceToSegment(p, points[i - 1]!, points[i]!);
      if (d < best) best = d;
    }
  }
  return best;
}

/** Axis-aligned bounding box of a set of polylines. */
export function boundsOf(lines: Polyline[]): { x: number; y: number; w: number; h: number } | null {
  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;
  for (const points of lines) {
    for (const p of points) {
      if (p.x < minX) minX = p.x;
      if (p.y < minY) minY = p.y;
      if (p.x > maxX) maxX = p.x;
      if (p.y > maxY) maxY = p.y;
    }
  }
  if (minX === Infinity) return null;
  return { x: minX, y: minY, w: maxX - minX, h: maxY - minY };
}

/** Unit direction of the first few points of a stroke (for the start arrow). */
export function headingAt(points: Polyline, index = 0, lookahead = 4): Point {
  const a = points[index] ?? pt(0, 0);
  const b = points[Math.min(index + lookahead, points.length - 1)] ?? a;
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const length = Math.sqrt(dx * dx + dy * dy) || 1;
  return pt(dx / length, dy / length);
}
