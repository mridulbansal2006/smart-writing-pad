import { forwardRef, type ReactNode } from 'react';

import type { Polyline } from '../lib/geometry';
import type { SheetLayout } from '../lib/layout';
import type { GuideStyle } from '../lib/render';
import type { GuideVisibility } from '../lib/types';
import { GuideLayer } from './GuideLayer';
import { WritingCanvas, type CanvasState, type CanvasTool, type WritingCanvasHandle } from './WritingCanvas';

type Props = {
  layout: SheetLayout;
  guideStrokes?: Polyline[];
  guideVisibility?: GuideVisibility;
  showRuledLines: boolean;
  showStartMarkers: boolean;
  penColor: string;
  penWidth: number;
  tool: CanvasTool;
  label: string;
  onChange?: (state: CanvasState) => void;
  onFirstStroke?: () => void;
  /** Overlay shown on top of the sheet, e.g. an empty-state prompt. */
  overlay?: ReactNode;
};

/**
 * The paper: ruled guide underneath, ink canvas on top, both sharing one
 * coordinate system so what the child traces can be compared with the guide.
 */
export const WritingSheet = forwardRef<WritingCanvasHandle, Props>(function WritingSheet(
  {
    layout,
    guideStrokes = [],
    guideVisibility = 'off',
    showRuledLines,
    showStartMarkers,
    penColor,
    penWidth,
    tool,
    label,
    onChange,
    onFirstStroke,
    overlay,
  },
  ref,
) {
  const guideStyle: GuideStyle = {
    guideColor: '#9cc6c3',
    ruleColor: '#ded9cd',
    guideWidth: Math.max(2, 7 * layout.scale),
    showRuledLines,
    lines: layout.lines,
  };

  return (
    <div
      className="card relative mx-auto w-full overflow-hidden bg-white shadow-sm"
      /* Cap the height so the sheet and its toolbar fit on one screen: a child
         should never have to scroll away from the pad to reach the eraser. */
      style={{ maxWidth: `calc(58vh * ${layout.sheet.width / layout.sheet.height})` }}
    >
      <div className="relative w-full" style={{ aspectRatio: `${layout.sheet.width} / ${layout.sheet.height}` }}>
        <GuideLayer
          layout={layout}
          strokes={guideStrokes}
          visibility={guideVisibility}
          showRuledLines={showRuledLines}
          showStartMarkers={showStartMarkers}
        />
        <div className="absolute inset-0">
          <WritingCanvas
            ref={ref}
            sheet={layout.sheet}
            guideStrokes={guideStrokes}
            guideStyle={guideStyle}
            penColor={penColor}
            penWidth={penWidth}
            tool={tool}
            label={label}
            onChange={(_strokes, state) => onChange?.(state)}
            onFirstStroke={onFirstStroke}
          />
        </div>
        {overlay}
      </div>
    </div>
  );
});
