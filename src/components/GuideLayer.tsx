import { distance, headingAt, pt, toPathData, type Point, type Polyline } from '../lib/geometry';
import type { SheetLayout } from '../lib/layout';
import type { GuideVisibility } from '../lib/types';

type Props = {
  layout: SheetLayout;
  /** Guide strokes already placed in sheet units. */
  strokes: Polyline[];
  visibility: GuideVisibility;
  showRuledLines: boolean;
  showStartMarkers: boolean;
};

const OPACITY: Record<GuideVisibility, number> = { full: 0.85, faint: 0.35, off: 0 };

/**
 * The printed sheet behind the ink: ruled writing lines, the letter to trace,
 * and numbered start dots with a direction arrow for each stroke.
 *
 * It is an SVG under the canvas rather than something drawn into it, so the
 * guide stays perfectly crisp at any screen size and can never be erased or
 * exported by accident.
 */
export function GuideLayer({ layout, strokes, visibility, showRuledLines, showStartMarkers }: Props) {
  const { sheet, lines, scale } = layout;
  const guideWidth = Math.max(2, 7 * scale);
  const markerRadius = Math.max(7, 9 * scale);

  return (
    <svg
      viewBox={`0 0 ${sheet.width} ${sheet.height}`}
      className="absolute inset-0 h-full w-full"
      aria-hidden="true"
      focusable="false"
    >
      {showRuledLines && (
        <g stroke="var(--color-line)" strokeWidth={Math.max(1, 1.5 * scale)}>
          <line x1={0} y1={lines.capTop} x2={sheet.width} y2={lines.capTop} />
          <line
            x1={0}
            y1={lines.xTop}
            x2={sheet.width}
            y2={lines.xTop}
            strokeDasharray={`${10 * scale} ${12 * scale}`}
          />
          <line
            x1={0}
            y1={lines.baseline}
            x2={sheet.width}
            y2={lines.baseline}
            stroke="var(--color-brand)"
            strokeWidth={Math.max(1.5, 2.5 * scale)}
          />
          <line
            x1={0}
            y1={lines.descender}
            x2={sheet.width}
            y2={lines.descender}
            strokeDasharray={`${6 * scale} ${14 * scale}`}
          />
        </g>
      )}

      {visibility !== 'off' && (
        <g
          fill="none"
          stroke="var(--color-brand)"
          strokeOpacity={OPACITY[visibility]}
          strokeWidth={guideWidth}
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          {strokes.map((stroke, index) => (
            <path key={index} d={toPathData(stroke)} />
          ))}
        </g>
      )}

      {showStartMarkers &&
        visibility !== 'off' &&
        placeMarkers(strokes, markerRadius).map((marker, index) => (
          <StartMarker key={index} marker={marker} order={index + 1} radius={markerRadius} />
        ))}
    </svg>
  );
}

type Marker = { at: Point; heading: Point };

/**
 * Work out where each numbered dot sits.
 *
 * Each dot is pulled back along its own stroke's direction, so it marks the
 * approach to the first point rather than covering it. Strokes that begin at
 * the same place — the two diagonals of A, the bowl and stem of g — would
 * still overlap, so any pair that is left too close is pushed apart. Without
 * this, "1" disappears underneath "2" and the stroke order is unreadable.
 */
export function placeMarkers(strokes: Polyline[], radius: number): Marker[] {
  const markers: Marker[] = strokes
    .filter((stroke) => stroke.length > 0)
    .map((stroke) => {
      const heading = headingAt(stroke);
      const start = stroke[0]!;
      return { at: pt(start.x - heading.x * radius * 1.25, start.y - heading.y * radius * 1.25), heading };
    });

  const minGap = radius * 2.2;
  for (let pass = 0; pass < 12; pass++) {
    let moved = false;
    for (let i = 0; i < markers.length; i++) {
      for (let j = i + 1; j < markers.length; j++) {
        const a = markers[i]!;
        const b = markers[j]!;
        const gap = distance(a.at, b.at);
        if (gap >= minGap) continue;

        let dx = b.at.x - a.at.x;
        let dy = b.at.y - a.at.y;
        let length = Math.hypot(dx, dy);
        if (length < 0.001) {
          // Exactly coincident: separate along the first stroke's normal.
          dx = -a.heading.y;
          dy = a.heading.x;
          length = 1;
        }
        const push = ((minGap - gap) / 2 / length) * 1.05;
        a.at = pt(a.at.x - dx * push, a.at.y - dy * push);
        b.at = pt(b.at.x + dx * push, b.at.y + dy * push);
        moved = true;
      }
    }
    if (!moved) break;
  }
  return markers;
}

/**
 * A numbered dot where a stroke begins, with an arrow showing which way to go.
 * Both come straight from the stroke data, so they can never disagree with the
 * path the child is asked to follow.
 */
function StartMarker({ marker, order, radius }: { marker: Marker; order: number; radius: number }) {
  const { at: start, heading } = marker;
  const arrowLength = radius * 2.6;
  const tip = { x: start.x + heading.x * arrowLength, y: start.y + heading.y * arrowLength };
  const tailStart = { x: start.x + heading.x * radius * 1.15, y: start.y + heading.y * radius * 1.15 };
  // Two short barbs rotated ±150° from the heading make the arrow head.
  const barb = (angle: number) => {
    const rad = (angle * Math.PI) / 180;
    const dx = heading.x * Math.cos(rad) - heading.y * Math.sin(rad);
    const dy = heading.x * Math.sin(rad) + heading.y * Math.cos(rad);
    return { x: tip.x + dx * radius * 0.9, y: tip.y + dy * radius * 0.9 };
  };
  const left = barb(150);
  const right = barb(-150);

  return (
    <g>
      <g stroke="var(--color-accent)" strokeWidth={radius * 0.32} strokeLinecap="round" fill="none">
        <line x1={tailStart.x} y1={tailStart.y} x2={tip.x} y2={tip.y} />
        <polyline points={`${left.x},${left.y} ${tip.x},${tip.y} ${right.x},${right.y}`} />
      </g>
      <circle cx={start.x} cy={start.y} r={radius} fill="var(--color-accent)" />
      <text
        x={start.x}
        y={start.y}
        textAnchor="middle"
        dominantBaseline="central"
        fontSize={radius * 1.3}
        fontWeight="700"
        fill="#ffffff"
        fontFamily="var(--font-sans)"
      >
        {order}
      </text>
    </g>
  );
}
