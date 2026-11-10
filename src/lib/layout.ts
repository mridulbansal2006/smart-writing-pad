/**
 * Fitting glyph design coordinates onto a writing sheet.
 *
 * Glyphs are authored in an 80 × 160 design box (see `glyphs.ts`). A sheet is
 * whatever size the exercise needs. This module works out the scale and offset
 * that centre the content, and reports where the ruled lines land so the
 * guide, the ruled paper and the coverage tolerance all agree.
 */

import { BASELINE, CAP_TOP, DESCENDER, GLYPH_BOX, X_TOP } from './glyphs';
import { pt, type Polyline } from './geometry';
import type { Sheet } from './render';

export type SheetLayout = {
  sheet: Sheet;
  scale: number;
  offsetX: number;
  offsetY: number;
  lines: { capTop: number; xTop: number; baseline: number; descender: number };
};

/** Share of the sheet the content fills at the default letter size. */
const NOMINAL_FILL = 0.78;

/**
 * @param designWidth width of the content in design units (80 for one glyph,
 *   wider for a word)
 * @param letterScale user preference multiplier; the result is clamped so the
 *   content always fits inside the padded sheet, however large the preference
 */
export function layoutSheet(sheet: Sheet, designWidth: number, letterScale = 1, padding = 24): SheetLayout {
  const usableWidth = Math.max(1, sheet.width - padding * 2);
  const usableHeight = Math.max(1, sheet.height - padding * 2);
  const maxScale = Math.min(usableWidth / designWidth, usableHeight / GLYPH_BOX.height);
  const nominal = maxScale * NOMINAL_FILL;
  const scale = Math.min(Math.max(nominal * letterScale, nominal * 0.5), maxScale);

  const contentWidth = designWidth * scale;
  const contentHeight = GLYPH_BOX.height * scale;
  const offsetX = (sheet.width - contentWidth) / 2;
  const offsetY = (sheet.height - contentHeight) / 2;

  return {
    sheet,
    scale,
    offsetX,
    offsetY,
    lines: {
      capTop: offsetY + CAP_TOP * scale,
      xTop: offsetY + X_TOP * scale,
      baseline: offsetY + BASELINE * scale,
      descender: offsetY + DESCENDER * scale,
    },
  };
}

/** Move design-space strokes into sheet space. */
export function placeStrokes(strokes: Polyline[], layout: SheetLayout): Polyline[] {
  return strokes.map((stroke) =>
    stroke.map((p) => pt(p.x * layout.scale + layout.offsetX, p.y * layout.scale + layout.offsetY)),
  );
}
