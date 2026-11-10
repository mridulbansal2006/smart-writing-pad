/**
 * Hand-authored single-line ("engraving") letter shapes.
 *
 * Every glyph is a list of strokes, every stroke an ordered polyline. Because
 * the data is ordered rather than an outline, the app gets four things for
 * free: a path to trace, a start dot, a direction arrow, and a stroke-by-stroke
 * sequence. Shapes follow common print-handwriting teaching order (top to
 * bottom, left to right, stems before bowls and crossbars).
 *
 * Coordinates live in a 80 × 160 design box shared by every glyph:
 *
 *   y =  10  CAP_TOP     top line        (capitals, ascenders: b d f h k l t)
 *   y =  60  X_TOP       dashed midline  (top of a c e m n o r s u v w x z)
 *   y = 110  BASELINE    writing line
 *   y = 145  DESCENDER   descender line  (g j p q y)
 */

import { arc, join, line, poly, pt, type Polyline } from './geometry';

export const GLYPH_BOX = { width: 80, height: 160 } as const;
export const CAP_TOP = 10;
export const X_TOP = 60;
export const BASELINE = 110;
export const DESCENDER = 145;

export type Glyph = {
  char: string;
  strokes: Polyline[];
  /** Short teaching hint, read out by text-to-speech when it is enabled. */
  hint: string;
};

const L = (x1: number, y1: number, x2: number, y2: number) => line(pt(x1, y1), pt(x2, y2));
const P = (...xy: number[]) => {
  const corners = [];
  for (let i = 0; i < xy.length; i += 2) corners.push(pt(xy[i]!, xy[i + 1]!));
  return poly(...corners);
};
const dot = (x: number, y: number) => arc(x, y, 3, -90, 270);

/** char -> strokes. Kept as data so it is easy to inspect and unit test. */
const UPPERCASE: Record<string, Polyline[]> = {
  A: [L(40, 10, 10, 110), L(40, 10, 70, 110), L(21, 73, 59, 73)],
  B: [L(14, 10, 14, 110), arc(14, 34, 24, -90, 90), arc(14, 84, 26, -90, 90)],
  C: [arc(42, 60, 32, -55, -305)],
  D: [L(14, 10, 14, 110), arc(14, 60, 50, -90, 90)],
  E: [L(14, 10, 14, 110), L(14, 10, 66, 10), L(14, 60, 58, 60), L(14, 110, 66, 110)],
  F: [L(14, 10, 14, 110), L(14, 10, 66, 10), L(14, 60, 58, 60)],
  G: [arc(42, 60, 32, -55, -360), L(74, 60, 46, 60)],
  H: [L(14, 10, 14, 110), L(66, 10, 66, 110), L(14, 60, 66, 60)],
  I: [L(20, 10, 60, 10), L(40, 10, 40, 110), L(20, 110, 60, 110)],
  J: [join(L(52, 10, 52, 84), arc(32, 84, 20, 0, 110))],
  K: [L(14, 10, 14, 110), L(62, 10, 14, 64), L(30, 52, 64, 110)],
  L: [P(14, 10, 14, 110, 64, 110)],
  M: [P(12, 110, 12, 10, 40, 70, 68, 10, 68, 110)],
  N: [P(14, 110, 14, 10, 64, 110, 64, 10)],
  O: [arc(40, 60, 30, -90, -450)],
  P: [L(14, 10, 14, 110), arc(14, 38, 28, -90, 90)],
  Q: [arc(40, 60, 30, -90, -450), L(52, 86, 72, 116)],
  R: [L(14, 10, 14, 110), arc(14, 38, 28, -90, 90), L(26, 66, 66, 110)],
  S: [join(arc(40, 36, 26, -30, -215), arc(40, 84, 26, -145, 150))],
  T: [L(12, 10, 68, 10), L(40, 10, 40, 110)],
  U: [join(L(14, 10, 14, 84), arc(40, 84, 26, 180, 0), L(66, 84, 66, 10))],
  V: [P(12, 10, 40, 110, 68, 10)],
  W: [P(8, 10, 24, 110, 40, 40, 56, 110, 72, 10)],
  X: [L(12, 10, 68, 110), L(68, 10, 12, 110)],
  Y: [L(12, 10, 40, 62), L(68, 10, 40, 62), L(40, 62, 40, 110)],
  Z: [P(14, 10, 66, 10, 14, 110, 66, 110)],
};

const LOWERCASE: Record<string, Polyline[]> = {
  a: [arc(34, 85, 24, -40, -390), L(58, 62, 58, 110)],
  b: [L(14, 10, 14, 110), arc(38, 85, 24, -90, 180)],
  c: [arc(38, 85, 24, -50, -310)],
  d: [L(62, 10, 62, 110), arc(38, 85, 24, -90, -360)],
  e: [join(L(14, 85, 62, 85), arc(38, 85, 24, 0, -300))],
  f: [join(arc(34, 28, 18, 0, -180), L(16, 28, 16, 110)), L(4, 60, 48, 60)],
  g: [arc(34, 85, 24, -40, -390), join(L(58, 62, 58, 124), arc(38, 124, 20, 0, 140))],
  h: [L(14, 10, 14, 110), join(arc(38, 85, 24, 180, 360), L(62, 85, 62, 110))],
  i: [L(34, 60, 34, 110), dot(34, 40)],
  j: [join(L(38, 60, 38, 126), arc(20, 126, 18, 0, 140)), dot(38, 40)],
  k: [L(14, 10, 14, 110), L(54, 62, 16, 90), L(28, 80, 56, 110)],
  l: [L(34, 10, 34, 110)],
  m: [
    L(12, 60, 12, 110),
    join(arc(26, 78, 14, 180, 360), L(40, 78, 40, 110)),
    join(arc(54, 78, 14, 180, 360), L(68, 78, 68, 110)),
  ],
  n: [L(14, 60, 14, 110), join(arc(38, 84, 24, 180, 360), L(62, 84, 62, 110))],
  o: [arc(38, 85, 24, -90, -450)],
  p: [L(14, 60, 14, 145), arc(38, 85, 24, -90, 180)],
  q: [L(62, 60, 62, 145), arc(38, 85, 24, -90, -360)],
  r: [L(14, 60, 14, 110), arc(36, 82, 22, 180, 295)],
  s: [join(arc(36, 76, 16, -30, -215), arc(36, 94, 16, -145, 150))],
  t: [L(34, 25, 34, 110), L(12, 60, 56, 60)],
  u: [join(L(14, 60, 14, 86), arc(38, 86, 24, 180, 0), L(62, 86, 62, 110))],
  v: [P(12, 60, 36, 110, 60, 60)],
  w: [P(8, 60, 22, 110, 36, 74, 50, 110, 64, 60)],
  x: [L(12, 60, 60, 110), L(60, 60, 12, 110)],
  y: [L(12, 60, 38, 110), P(64, 60, 30, 145)],
  z: [P(14, 60, 58, 60, 14, 110, 58, 110)],
};

const DIGITS: Record<string, Polyline[]> = {
  '0': [arc(40, 60, 30, -90, -450)],
  '1': [P(22, 28, 40, 12, 40, 110), L(18, 110, 62, 110)],
  '2': [join(arc(40, 38, 26, -170, 55), L(55, 59, 14, 110), L(14, 110, 68, 110))],
  '3': [join(arc(40, 36, 24, -170, 70), arc(40, 84, 26, -110, 160))],
  '4': [P(46, 10, 12, 76, 68, 76), L(46, 40, 46, 110)],
  // Taught as "down, around, then the hat across the top", so every stroke
  // runs top-to-bottom or left-to-right.
  '5': [L(24, 12, 22, 52), arc(38, 78, 30, -115, 130), L(24, 12, 64, 12)],
  '6': [join(arc(42, 46, 32, -30, -200), arc(40, 80, 28, 180, -180))],
  '7': [P(12, 12, 68, 12, 30, 110), L(26, 64, 56, 64)],
  '8': [arc(40, 36, 24, -90, 270), arc(40, 84, 26, -90, 270)],
  '9': [arc(40, 42, 28, -90, -450), L(68, 42, 62, 110)],
};

const HINTS: Record<string, string> = {
  A: 'Slide down, slide down, then across the middle.',
  B: 'Straight line down, then two bumps on the right.',
  C: 'Start at the top and curve around to the left.',
  D: 'Straight line down, then one big curve.',
  E: 'Line down, then three lines across.',
  F: 'Line down, then two lines across.',
  G: 'Curve all the way around, then a little line in.',
  H: 'Line down, line down, then across the middle.',
  I: 'Line across, line down, line across.',
  J: 'Line down, then curve like a hook.',
  K: 'Line down, slide in, slide out.',
  L: 'Long line down, then across the bottom.',
  M: 'Up, down to the middle, up, then down.',
  N: 'Up, slide down, then up again.',
  O: 'One round circle, starting at the top.',
  P: 'Line down, then a bump at the top.',
  Q: 'A circle, then a little tail at the bottom.',
  R: 'Line down, a bump, then a leg.',
  S: 'Curve back, then curve forward.',
  T: 'Line across the top, then straight down.',
  U: 'Down, curve along the bottom, then up.',
  V: 'Slide down, then slide up.',
  W: 'Down, up, down, up.',
  X: 'One line down this way, one line down that way.',
  Y: 'Two lines meet in the middle, then straight down.',
  Z: 'Across, slide down, then across again.',
  a: 'Round circle first, then a line down beside it.',
  b: 'Line down, then a bump on the bottom right.',
  c: 'Start at the top and curve round to the left.',
  d: 'Line down, then a circle on the left.',
  e: 'Little line across, then curve around.',
  f: 'Curve over the top, line down, then across.',
  g: 'A circle, then a line down with a hook.',
  h: 'Tall line down, then a bump.',
  i: 'Short line down, then a dot on top.',
  j: 'Line down with a hook, then a dot on top.',
  k: 'Tall line down, slide in, slide out.',
  l: 'One tall straight line down.',
  m: 'Line down, then two bumps.',
  n: 'Line down, then one bump.',
  o: 'One small circle, starting at the top.',
  p: 'Line down below the line, then a bump.',
  q: 'Circle, then a line straight down below the line.',
  r: 'Line down, then a small curve at the top.',
  s: 'Curve back, then curve forward.',
  t: 'Line down, then a line across.',
  u: 'Down, curve along the bottom, then up.',
  v: 'Slide down, then slide up.',
  w: 'Down, up, down, up.',
  x: 'One line down this way, one line down that way.',
  y: 'Slide down to the line, then slide down past it.',
  z: 'Across, slide down, then across again.',
  '0': 'One tall circle, starting at the top.',
  '1': 'A little flag, then straight down, then a base.',
  '2': 'Curve over, slide down, then across.',
  '3': 'Curve around, then curve around again.',
  '4': 'Slide down, across, then a line down.',
  '5': 'Down, curve around, then a line across the top.',
  '6': 'Curve down, then loop around.',
  '7': 'Across the top, slide down, then a small line.',
  '8': 'A circle on top, a circle underneath.',
  '9': 'A circle at the top, then a line down.',
};

const ALL: Record<string, Polyline[]> = { ...UPPERCASE, ...LOWERCASE, ...DIGITS };

export const UPPERCASE_LETTERS = Object.keys(UPPERCASE);
export const LOWERCASE_LETTERS = Object.keys(LOWERCASE);
export const NUMBERS = Object.keys(DIGITS);

/** Short, common words whose letters are all covered by the glyph set. */
export const PRACTICE_WORDS = [
  'cat',
  'dog',
  'sun',
  'bus',
  'hat',
  'red',
  'ball',
  'milk',
  'fish',
  'tree',
  'book',
  'name',
  'play',
  'jump',
  'home',
  'water',
] as const;

export function hasGlyph(char: string): boolean {
  return char in ALL;
}

export function glyphFor(char: string): Glyph | null {
  const strokes = ALL[char];
  if (!strokes) return null;
  return { char, strokes, hint: HINTS[char] ?? '' };
}

/**
 * Lay a word out left to right, returning the strokes of every glyph shifted
 * into place plus the total width of the line.
 */
export function layoutWord(word: string, letterSpacing = 6): { strokes: Polyline[]; width: number } {
  const strokes: Polyline[] = [];
  let x = 0;
  for (const char of word) {
    const glyph = glyphFor(char);
    if (!glyph) {
      x += GLYPH_BOX.width * 0.6 + letterSpacing;
      continue;
    }
    for (const stroke of glyph.strokes) {
      strokes.push(stroke.map((p) => pt(p.x + x, p.y)));
    }
    x += GLYPH_BOX.width + letterSpacing;
  }
  return { strokes, width: Math.max(0, x - letterSpacing) };
}

/** Every character the app can draw a guide for, in teaching order. */
export const ALL_CHARACTERS = [...UPPERCASE_LETTERS, ...LOWERCASE_LETTERS, ...NUMBERS];
