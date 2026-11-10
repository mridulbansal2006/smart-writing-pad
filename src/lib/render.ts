/**
 * Canvas drawing. The same functions paint the live canvas and the offscreen
 * canvas used for PNG export, so a downloaded sample looks like what the child
 * saw on screen.
 */

import { type Point, type Polyline } from './geometry';

export type InkStroke = {
  id: string;
  color: string;
  /** Width in sheet units. */
  width: number;
  points: Polyline;
};

export type Sheet = { width: number; height: number };

export function drawStroke(ctx: CanvasRenderingContext2D, stroke: InkStroke): void {
  const { points } = stroke;
  if (points.length === 0) return;

  ctx.save();
  ctx.strokeStyle = stroke.color;
  ctx.fillStyle = stroke.color;
  ctx.lineWidth = stroke.width;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';

  // A single tap should still leave a mark.
  if (points.length === 1) {
    const p = points[0]!;
    ctx.beginPath();
    ctx.arc(p.x, p.y, stroke.width / 2, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
    return;
  }

  // Quadratic segments through the midpoints smooth out pointer jitter.
  ctx.beginPath();
  ctx.moveTo(points[0]!.x, points[0]!.y);
  for (let i = 1; i < points.length - 1; i++) {
    const current = points[i]!;
    const next = points[i + 1]!;
    ctx.quadraticCurveTo(current.x, current.y, (current.x + next.x) / 2, (current.y + next.y) / 2);
  }
  const last = points[points.length - 1]!;
  ctx.lineTo(last.x, last.y);
  ctx.stroke();
  ctx.restore();
}

export function drawInk(ctx: CanvasRenderingContext2D, strokes: InkStroke[]): void {
  for (const stroke of strokes) drawStroke(ctx, stroke);
}

export type GuideStyle = {
  /** Colour of the letter guide path. */
  guideColor: string;
  /** Colour of the ruled writing lines. */
  ruleColor: string;
  guideWidth: number;
  showRuledLines: boolean;
  lines: { capTop: number; xTop: number; baseline: number; descender: number };
};

/** Ruled lines plus the letter guide, used when exporting with the guide on. */
export function drawGuide(
  ctx: CanvasRenderingContext2D,
  sheet: Sheet,
  guideStrokes: Polyline[],
  style: GuideStyle,
): void {
  ctx.save();
  if (style.showRuledLines) {
    ctx.strokeStyle = style.ruleColor;
    ctx.lineWidth = 1.5;
    for (const [y, dashed] of [
      [style.lines.capTop, false],
      [style.lines.xTop, true],
      [style.lines.baseline, false],
      [style.lines.descender, true],
    ] as const) {
      ctx.setLineDash(dashed ? [8, 10] : []);
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(sheet.width, y);
      ctx.stroke();
    }
    ctx.setLineDash([]);
  }

  ctx.strokeStyle = style.guideColor;
  ctx.lineWidth = style.guideWidth;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  for (const stroke of guideStrokes) {
    if (stroke.length < 2) continue;
    ctx.beginPath();
    ctx.moveTo(stroke[0]!.x, stroke[0]!.y);
    for (let i = 1; i < stroke.length; i++) ctx.lineTo(stroke[i]!.x, stroke[i]!.y);
    ctx.stroke();
  }
  ctx.restore();
}

/**
 * Flatten a sheet to a PNG data URL at `scale`× the sheet units. Returns null
 * when a 2D context cannot be created (very old or headless browsers).
 */
export function exportSheetPng(options: {
  sheet: Sheet;
  ink: InkStroke[];
  guideStrokes?: Polyline[];
  guideStyle?: GuideStyle;
  background: string;
  scale?: number;
}): string | null {
  const { sheet, ink, guideStrokes, guideStyle, background, scale = 2 } = options;
  const canvas = document.createElement('canvas');
  canvas.width = Math.round(sheet.width * scale);
  canvas.height = Math.round(sheet.height * scale);
  const ctx = canvas.getContext('2d');
  if (!ctx) return null;

  ctx.scale(scale, scale);
  ctx.fillStyle = background;
  ctx.fillRect(0, 0, sheet.width, sheet.height);
  if (guideStrokes && guideStyle) drawGuide(ctx, sheet, guideStrokes, guideStyle);
  drawInk(ctx, ink);
  return canvas.toDataURL('image/png');
}

/** Map a pointer event's client position into sheet units. */
export function clientToSheet(
  rect: { left: number; top: number; width: number; height: number },
  sheet: Sheet,
  clientX: number,
  clientY: number,
): Point {
  const x = ((clientX - rect.left) / rect.width) * sheet.width;
  const y = ((clientY - rect.top) / rect.height) * sheet.height;
  return { x, y };
}
