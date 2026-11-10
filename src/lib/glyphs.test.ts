import { describe, expect, it } from 'vitest';

import { boundsOf, headingAt, polylineLength } from './geometry';
import {
  ALL_CHARACTERS,
  BASELINE,
  CAP_TOP,
  DESCENDER,
  GLYPH_BOX,
  LOWERCASE_LETTERS,
  NUMBERS,
  PRACTICE_WORDS,
  UPPERCASE_LETTERS,
  glyphFor,
  hasGlyph,
  layoutWord,
} from './glyphs';

describe('glyph coverage', () => {
  it('covers A–Z, a–z and 0–9', () => {
    expect(UPPERCASE_LETTERS.join('')).toBe('ABCDEFGHIJKLMNOPQRSTUVWXYZ');
    expect(LOWERCASE_LETTERS.join('')).toBe('abcdefghijklmnopqrstuvwxyz');
    expect(NUMBERS.join('')).toBe('0123456789');
    expect(ALL_CHARACTERS).toHaveLength(62);
  });

  it('has data for every practice word', () => {
    for (const word of PRACTICE_WORDS) {
      for (const char of word) {
        expect(hasGlyph(char), `missing glyph for "${char}" in "${word}"`).toBe(true);
      }
    }
  });

  it('returns null for characters it cannot draw', () => {
    expect(glyphFor('@')).toBeNull();
    expect(hasGlyph('@')).toBe(false);
  });
});

describe('every glyph is drawable', () => {
  for (const char of ALL_CHARACTERS) {
    it(`"${char}" has usable strokes`, () => {
      const glyph = glyphFor(char);
      expect(glyph).not.toBeNull();
      const strokes = glyph!.strokes;

      // Teaching order means a small number of deliberate strokes.
      expect(strokes.length).toBeGreaterThan(0);
      expect(strokes.length).toBeLessThanOrEqual(4);

      for (const stroke of strokes) {
        // Enough samples that the path is smooth and a direction exists.
        expect(stroke.length).toBeGreaterThanOrEqual(2);
        expect(polylineLength(stroke)).toBeGreaterThan(0);
        const heading = headingAt(stroke);
        expect(Math.hypot(heading.x, heading.y)).toBeCloseTo(1, 5);
      }
    });
  }

  it('keeps every stroke inside the design box', () => {
    for (const char of ALL_CHARACTERS) {
      const bounds = boundsOf(glyphFor(char)!.strokes)!;
      expect(bounds.x, `${char} left`).toBeGreaterThanOrEqual(0);
      expect(bounds.x + bounds.w, `${char} right`).toBeLessThanOrEqual(GLYPH_BOX.width);
      expect(bounds.y, `${char} top`).toBeGreaterThanOrEqual(0);
      expect(bounds.y + bounds.h, `${char} bottom`).toBeLessThanOrEqual(GLYPH_BOX.height);
    }
  });

  it('puts capitals and digits between the top line and the baseline', () => {
    for (const char of [...UPPERCASE_LETTERS, ...NUMBERS]) {
      const bounds = boundsOf(glyphFor(char)!.strokes)!;
      expect(bounds.y, `${char} starts above the top line`).toBeGreaterThanOrEqual(CAP_TOP - 1);
      // Q's tail is the one capital that is allowed below the baseline.
      const bottomLimit = char === 'Q' ? DESCENDER : BASELINE + 1;
      expect(bounds.y + bounds.h, `${char} drops below its line`).toBeLessThanOrEqual(bottomLimit);
    }
  });

  it('keeps lowercase letters above the descender line', () => {
    const descenders = new Set(['g', 'j', 'p', 'q', 'y']);
    for (const char of LOWERCASE_LETTERS) {
      const bounds = boundsOf(glyphFor(char)!.strokes)!;
      const bottom = bounds.y + bounds.h;
      if (descenders.has(char)) {
        expect(bottom, `${char} should reach below the baseline`).toBeGreaterThan(BASELINE);
        expect(bottom).toBeLessThanOrEqual(DESCENDER);
      } else {
        expect(bottom, `${char} should sit on the baseline`).toBeLessThanOrEqual(BASELINE + 1);
      }
    }
  });

  it('gives every character a spoken hint', () => {
    for (const char of ALL_CHARACTERS) {
      expect(glyphFor(char)!.hint.length, `${char} has no hint`).toBeGreaterThan(8);
    }
  });
});

describe('layoutWord', () => {
  it('places letters left to right without overlapping', () => {
    const { strokes, width } = layoutWord('cat');
    expect(strokes.length).toBeGreaterThan(0);
    expect(width).toBeCloseTo(3 * GLYPH_BOX.width + 2 * 6);
    const bounds = boundsOf(strokes)!;
    expect(bounds.x).toBeGreaterThanOrEqual(0);
    expect(bounds.x + bounds.w).toBeLessThanOrEqual(width);
  });

  it('keeps the vertical metrics of each letter', () => {
    const bounds = boundsOf(layoutWord('ag').strokes)!;
    expect(bounds.y + bounds.h).toBeLessThanOrEqual(DESCENDER);
  });

  it('returns nothing for an empty word', () => {
    expect(layoutWord('')).toEqual({ strokes: [], width: 0 });
  });
});
