import { describe, expect, it } from 'vitest';

import { boundsOf } from './geometry';
import { GLYPH_BOX, glyphFor, layoutWord } from './glyphs';
import { layoutSheet, placeStrokes } from './layout';

const sheet = { width: 600, height: 420 };

describe('layoutSheet', () => {
  it('centres the content and orders the ruled lines', () => {
    const layout = layoutSheet(sheet, GLYPH_BOX.width);
    expect(layout.offsetX).toBeGreaterThan(0);
    expect(layout.lines.capTop).toBeLessThan(layout.lines.xTop);
    expect(layout.lines.xTop).toBeLessThan(layout.lines.baseline);
    expect(layout.lines.baseline).toBeLessThan(layout.lines.descender);
  });

  it('grows and shrinks with the letter-size preference', () => {
    const small = layoutSheet(sheet, GLYPH_BOX.width, 0.6);
    const normal = layoutSheet(sheet, GLYPH_BOX.width, 1);
    const large = layoutSheet(sheet, GLYPH_BOX.width, 1.8);
    expect(small.scale).toBeLessThan(normal.scale);
    expect(large.scale).toBeGreaterThan(normal.scale);
  });

  it('never lets an extreme preference push content off the sheet', () => {
    for (const scale of [0.1, 1, 5, 100]) {
      const layout = layoutSheet(sheet, GLYPH_BOX.width, scale);
      const placed = placeStrokes(glyphFor('A')!.strokes, layout);
      const bounds = boundsOf(placed)!;
      expect(bounds.x).toBeGreaterThanOrEqual(0);
      expect(bounds.y).toBeGreaterThanOrEqual(0);
      expect(bounds.x + bounds.w).toBeLessThanOrEqual(sheet.width);
      expect(bounds.y + bounds.h).toBeLessThanOrEqual(sheet.height);
    }
  });

  it('fits a long word within the sheet width', () => {
    const word = layoutWord('water');
    const layout = layoutSheet({ width: 900, height: 420 }, word.width);
    const bounds = boundsOf(placeStrokes(word.strokes, layout))!;
    expect(bounds.x).toBeGreaterThanOrEqual(0);
    expect(bounds.x + bounds.w).toBeLessThanOrEqual(900);
  });
});

describe('placeStrokes', () => {
  it('applies the same scale and offset to every point', () => {
    const layout = layoutSheet(sheet, GLYPH_BOX.width);
    const [stroke] = placeStrokes([[{ x: 0, y: 0 }, { x: 80, y: 160 }]], layout);
    expect(stroke![0]!.x).toBeCloseTo(layout.offsetX);
    expect(stroke![1]!.x).toBeCloseTo(layout.offsetX + 80 * layout.scale);
    expect(stroke![1]!.y).toBeCloseTo(layout.offsetY + 160 * layout.scale);
  });
});
