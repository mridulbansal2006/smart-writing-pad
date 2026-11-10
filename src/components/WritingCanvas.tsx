import {
  forwardRef,
  useCallback,
  useEffect,
  useImperativeHandle,
  useRef,
  useState,
} from 'react';

import { distanceToPolylines, type Point, type Polyline } from '../lib/geometry';
import { createId } from '../lib/storage';
import {
  clientToSheet,
  drawInk,
  exportSheetPng,
  type GuideStyle,
  type InkStroke,
  type Sheet,
} from '../lib/render';

export type CanvasTool = 'pen' | 'eraser';

export type WritingCanvasHandle = {
  undo: () => void;
  redo: () => void;
  clear: () => void;
  getInk: () => InkStroke[];
  /** PNG data URL of the sheet, optionally with the printed guide behind it. */
  exportPng: (options?: { includeGuide?: boolean }) => string | null;
};

export type CanvasState = {
  strokeCount: number;
  canUndo: boolean;
  canRedo: boolean;
};

type Props = {
  sheet: Sheet;
  /** Guide strokes in sheet units, drawn into exported images. */
  guideStrokes?: Polyline[];
  guideStyle?: GuideStyle;
  penColor: string;
  penWidth: number;
  tool: CanvasTool;
  background?: string;
  /** Accessible description of what is being written. */
  label: string;
  onChange?: (strokes: InkStroke[], state: CanvasState) => void;
  /** Called the first time the child puts the pen down after a reset. */
  onFirstStroke?: () => void;
};

/** How close the eraser has to pass to a stroke to remove it, in sheet units. */
const ERASER_RADIUS = 14;
/** Minimum movement before a new point is recorded, in sheet units. */
const MIN_POINT_DISTANCE = 1.2;

/**
 * The writing surface.
 *
 * Input goes through Pointer Events, so a mouse, a finger and a stylus all
 * take the same path and no device-specific code is needed. Strokes are stored
 * as polylines in sheet units (not pixels), which keeps drawings correct when
 * the canvas is resized, lets the tracing scorer compare ink against the guide
 * directly, and makes undo/redo and PNG export straightforward.
 */
export const WritingCanvas = forwardRef<WritingCanvasHandle, Props>(function WritingCanvas(
  {
    sheet,
    guideStrokes,
    guideStyle,
    penColor,
    penWidth,
    tool,
    background = '#ffffff',
    label,
    onChange,
    onFirstStroke,
  },
  ref,
) {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  // Ink lives in refs because pointer handling must not wait on a React
  // render; `version` is bumped to trigger repaints and notify the parent.
  const strokesRef = useRef<InkStroke[]>([]);
  const liveStrokeRef = useRef<InkStroke | null>(null);
  const pastRef = useRef<InkStroke[][]>([]);
  const futureRef = useRef<InkStroke[][]>([]);
  const activePointerRef = useRef<number | null>(null);
  const erasedDuringDragRef = useRef(false);
  const hasDrawnRef = useRef(false);
  const [, setVersion] = useState(0);

  const notify = useCallback(() => {
    setVersion((v) => v + 1);
    onChange?.(strokesRef.current, {
      strokeCount: strokesRef.current.length,
      canUndo: pastRef.current.length > 0,
      canRedo: futureRef.current.length > 0,
    });
  }, [onChange]);

  const paint = useCallback(() => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const cssWidth = container.clientWidth;
    const cssHeight = (cssWidth * sheet.height) / sheet.width;
    const dpr = Math.min(window.devicePixelRatio || 1, 3);
    const pixelWidth = Math.max(1, Math.round(cssWidth * dpr));
    const pixelHeight = Math.max(1, Math.round(cssHeight * dpr));
    if (canvas.width !== pixelWidth || canvas.height !== pixelHeight) {
      canvas.width = pixelWidth;
      canvas.height = pixelHeight;
    }

    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    const scale = (cssWidth / sheet.width) * dpr;
    ctx.setTransform(scale, 0, 0, scale, 0, 0);

    const all = liveStrokeRef.current
      ? [...strokesRef.current, liveStrokeRef.current]
      : strokesRef.current;
    drawInk(ctx, all);
  }, [sheet.height, sheet.width]);

  // Repaint on every state change and whenever the element is resized.
  useEffect(() => {
    paint();
  });

  useEffect(() => {
    const container = containerRef.current;
    if (!container || typeof ResizeObserver === 'undefined') return;
    const observer = new ResizeObserver(() => paint());
    observer.observe(container);
    return () => observer.disconnect();
  }, [paint]);

  const pushHistory = useCallback(() => {
    pastRef.current = [...pastRef.current, strokesRef.current.map((s) => ({ ...s }))].slice(-60);
    futureRef.current = [];
  }, []);

  const sheetPointFrom = useCallback(
    (clientX: number, clientY: number): Point | null => {
      const canvas = canvasRef.current;
      if (!canvas) return null;
      const rect = canvas.getBoundingClientRect();
      if (rect.width === 0 || rect.height === 0) return null;
      return clientToSheet(rect, sheet, clientX, clientY);
    },
    [sheet],
  );

  const eraseAt = useCallback((point: Point) => {
    const remaining = strokesRef.current.filter(
      (stroke) => distanceToPolylines(point, [stroke.points]) > ERASER_RADIUS + stroke.width / 2,
    );
    if (remaining.length !== strokesRef.current.length) {
      strokesRef.current = remaining;
      erasedDuringDragRef.current = true;
      notify();
    }
  }, [notify]);

  const handlePointerDown = useCallback(
    (event: React.PointerEvent<HTMLCanvasElement>) => {
      // Ignore a second finger mid-stroke, and right/middle mouse buttons.
      if (activePointerRef.current !== null) return;
      if (event.pointerType === 'mouse' && event.button !== 0) return;
      const point = sheetPointFrom(event.clientX, event.clientY);
      if (!point) return;

      activePointerRef.current = event.pointerId;
      try {
        event.currentTarget.setPointerCapture(event.pointerId);
      } catch {
        /* capture is an optimisation, not a requirement */
      }

      if (!hasDrawnRef.current) {
        hasDrawnRef.current = true;
        onFirstStroke?.();
      }

      if (tool === 'eraser') {
        pushHistory();
        erasedDuringDragRef.current = false;
        eraseAt(point);
        return;
      }

      liveStrokeRef.current = {
        id: createId(),
        color: penColor,
        width: penWidth,
        points: [point],
      };
      setVersion((v) => v + 1);
    },
    [eraseAt, onFirstStroke, penColor, penWidth, pushHistory, sheetPointFrom, tool],
  );

  const handlePointerMove = useCallback(
    (event: React.PointerEvent<HTMLCanvasElement>) => {
      if (activePointerRef.current !== event.pointerId) return;

      // Coalesced events recover the samples the browser batched between
      // frames, which matters for fast strokes and high-rate styluses.
      const native = event.nativeEvent;
      const points =
        typeof native.getCoalescedEvents === 'function'
          ? native.getCoalescedEvents().map((e) => ({ clientX: e.clientX, clientY: e.clientY }))
          : [];
      const samples = points.length > 0 ? points : [{ clientX: event.clientX, clientY: event.clientY }];

      if (tool === 'eraser') {
        for (const sample of samples) {
          const point = sheetPointFrom(sample.clientX, sample.clientY);
          if (point) eraseAt(point);
        }
        return;
      }

      const stroke = liveStrokeRef.current;
      if (!stroke) return;
      let added = false;
      for (const sample of samples) {
        const point = sheetPointFrom(sample.clientX, sample.clientY);
        if (!point) continue;
        const last = stroke.points[stroke.points.length - 1]!;
        const dx = point.x - last.x;
        const dy = point.y - last.y;
        if (Math.sqrt(dx * dx + dy * dy) < MIN_POINT_DISTANCE) continue;
        stroke.points.push(point);
        added = true;
      }
      if (added) setVersion((v) => v + 1);
    },
    [eraseAt, sheetPointFrom, tool],
  );

  const endStroke = useCallback(
    (event: React.PointerEvent<HTMLCanvasElement>) => {
      if (activePointerRef.current !== event.pointerId) return;
      activePointerRef.current = null;
      try {
        event.currentTarget.releasePointerCapture(event.pointerId);
      } catch {
        /* already released */
      }

      if (tool === 'eraser') {
        // Nothing was touched, so keep history clean.
        if (!erasedDuringDragRef.current) pastRef.current = pastRef.current.slice(0, -1);
        erasedDuringDragRef.current = false;
        notify();
        return;
      }

      const stroke = liveStrokeRef.current;
      liveStrokeRef.current = null;
      if (!stroke) return;
      pushHistory();
      strokesRef.current = [...strokesRef.current, stroke];
      notify();
    },
    [notify, pushHistory, tool],
  );

  useImperativeHandle(
    ref,
    () => ({
      undo() {
        const previous = pastRef.current[pastRef.current.length - 1];
        if (!previous) return;
        pastRef.current = pastRef.current.slice(0, -1);
        futureRef.current = [...futureRef.current, strokesRef.current];
        strokesRef.current = previous;
        notify();
      },
      redo() {
        const next = futureRef.current[futureRef.current.length - 1];
        if (!next) return;
        futureRef.current = futureRef.current.slice(0, -1);
        pastRef.current = [...pastRef.current, strokesRef.current];
        strokesRef.current = next;
        notify();
      },
      clear() {
        if (strokesRef.current.length === 0) return;
        pastRef.current = [...pastRef.current, strokesRef.current];
        futureRef.current = [];
        strokesRef.current = [];
        hasDrawnRef.current = false;
        notify();
      },
      getInk: () => strokesRef.current,
      exportPng: (options) =>
        exportSheetPng({
          sheet,
          ink: strokesRef.current,
          guideStrokes: options?.includeGuide ? guideStrokes : undefined,
          guideStyle: options?.includeGuide ? guideStyle : undefined,
          background,
        }),
    }),
    [background, guideStrokes, guideStyle, notify, sheet],
  );

  return (
    <div ref={containerRef} className="relative w-full">
      <canvas
        ref={canvasRef}
        role="img"
        aria-label={label}
        className="writing-surface relative block w-full cursor-crosshair"
        style={{ aspectRatio: `${sheet.width} / ${sheet.height}` }}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={endStroke}
        onPointerCancel={endStroke}
        onPointerLeave={endStroke}
        onContextMenu={(event) => event.preventDefault()}
      />
    </div>
  );
});
