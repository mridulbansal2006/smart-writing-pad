import { useCallback, useRef, useState } from 'react';

import { Toolbar } from '../components/Toolbar';
import {
  WritingCanvas,
  type CanvasState,
  type CanvasTool,
  type WritingCanvasHandle,
} from '../components/WritingCanvas';
import { downloadDataUrl, sampleFilename } from '../lib/download';
import { putSample } from '../lib/samples';
import { createId } from '../lib/storage';
import { useApp } from '../state/AppProvider';

const SHEET = { width: 1200, height: 520 } as const;
const ROWS = 3;
const ROW_HEIGHT = SHEET.height / ROWS;

/**
 * Free writing: a blank ruled pad with the full set of drawing controls and no
 * exercise attached. Useful for warming up, for copying work off a board, and
 * for children who find a guided path stressful to start with.
 */
export function WritingPad() {
  const { settings, updateSettings, recordAttempt } = useApp();
  const canvasRef = useRef<WritingCanvasHandle>(null);

  const [tool, setTool] = useState<CanvasTool>('pen');
  const [canvasState, setCanvasState] = useState<CanvasState>({
    strokeCount: 0,
    canUndo: false,
    canRedo: false,
  });
  const [message, setMessage] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const save = useCallback(async () => {
    const handle = canvasRef.current;
    if (!handle || handle.getInk().length === 0) {
      setMessage('Write something on the pad first.');
      return;
    }
    const dataUrl = handle.exportPng();
    if (!dataUrl) {
      setMessage('This browser could not create the image.');
      return;
    }

    setSaving(true);
    const sampleId = createId();
    const stored = await putSample({
      id: sampleId,
      createdAt: Date.now(),
      target: '',
      mode: 'free',
      dataUrl,
      width: SHEET.width,
      height: SHEET.height,
    });
    setSaving(false);

    if (!stored) {
      setMessage('This browser would not let the app store the picture. You can still download it.');
      return;
    }
    recordAttempt({
      mode: 'free',
      kind: 'free',
      target: '',
      coverage: null,
      onGuide: null,
      tolerance: null,
      completed: false,
      selfRating: null,
      sampleId,
      needsPractice: false,
    });
    setMessage('Saved. You can find it on the Review page.');
  }, [recordAttempt]);

  const download = useCallback(() => {
    const dataUrl = canvasRef.current?.exportPng();
    if (!dataUrl) {
      setMessage('This browser could not create the image.');
      return;
    }
    downloadDataUrl(dataUrl, sampleFilename(''));
    setMessage('Image downloaded.');
  }, []);

  return (
    <div className="space-y-5">
      <header className="space-y-2">
        <h1 className="text-2xl font-bold">Writing pad</h1>
        <p className="max-w-3xl text-[var(--color-ink-soft)]">
          A blank pad to write or draw on with a mouse, a finger or a stylus. Nothing is measured here. Use
          Save to keep a copy inside the app, or Download to get a PNG file.
        </p>
      </header>

      <div
        className="card relative mx-auto w-full overflow-hidden bg-white shadow-sm"
        /* Same height cap as the guided sheets, so the toolbar stays in reach. */
        style={{ maxWidth: `calc(58vh * ${SHEET.width / SHEET.height})` }}
      >
        <div className="relative w-full" style={{ aspectRatio: `${SHEET.width} / ${SHEET.height}` }}>
          {settings.showRuledLines && (
            <svg
              viewBox={`0 0 ${SHEET.width} ${SHEET.height}`}
              className="absolute inset-0 h-full w-full"
              aria-hidden="true"
            >
              {Array.from({ length: ROWS }, (_, row) => {
                const top = row * ROW_HEIGHT;
                return (
                  <g key={row}>
                    <line
                      x1={0}
                      y1={top + ROW_HEIGHT * 0.12}
                      x2={SHEET.width}
                      y2={top + ROW_HEIGHT * 0.12}
                      stroke="var(--color-line)"
                      strokeWidth={1.5}
                    />
                    <line
                      x1={0}
                      y1={top + ROW_HEIGHT * 0.46}
                      x2={SHEET.width}
                      y2={top + ROW_HEIGHT * 0.46}
                      stroke="var(--color-line)"
                      strokeWidth={1.5}
                      strokeDasharray="10 12"
                    />
                    <line
                      x1={0}
                      y1={top + ROW_HEIGHT * 0.8}
                      x2={SHEET.width}
                      y2={top + ROW_HEIGHT * 0.8}
                      stroke="var(--color-brand)"
                      strokeWidth={2.5}
                    />
                  </g>
                );
              })}
            </svg>
          )}
          <div className="absolute inset-0">
            <WritingCanvas
              ref={canvasRef}
              sheet={SHEET}
              penColor={settings.penColor}
              penWidth={settings.penWidth}
              tool={tool}
              label="Blank writing pad"
              onChange={(_ink, state) => setCanvasState(state)}
            />
          </div>
          {canvasState.strokeCount === 0 && (
            <p className="pointer-events-none absolute inset-x-0 bottom-4 text-center text-sm text-[var(--color-ink-soft)]">
              Start writing anywhere on the pad.
            </p>
          )}
        </div>
      </div>

      <Toolbar
        tool={tool}
        onToolChange={setTool}
        penColor={settings.penColor}
        onPenColorChange={(penColor) => updateSettings({ penColor })}
        penWidth={settings.penWidth}
        onPenWidthChange={(penWidth) => updateSettings({ penWidth })}
        canUndo={canvasState.canUndo}
        canRedo={canvasState.canRedo}
        onUndo={() => canvasRef.current?.undo()}
        onRedo={() => canvasRef.current?.redo()}
        onClear={() => {
          canvasRef.current?.clear();
          setMessage(null);
        }}
      />

      <div className="flex flex-wrap gap-3">
        <button type="button" className="btn btn-primary" onClick={save} disabled={saving}>
          {saving ? 'Saving…' : '💾 Save writing sample'}
        </button>
        <button type="button" className="btn" onClick={download}>
          ⬇️ Download as image
        </button>
        <label className="btn cursor-pointer">
          <input
            type="checkbox"
            className="h-5 w-5 accent-[var(--color-brand)]"
            checked={settings.showRuledLines}
            onChange={(event) => updateSettings({ showRuledLines: event.target.checked })}
          />
          Ruled lines
        </label>
      </div>

      {message && (
        <p
          role="status"
          aria-live="polite"
          className="card bg-[var(--color-brand-soft)] px-4 py-3 font-bold text-[var(--color-brand-dark)]"
        >
          {message}
        </p>
      )}
    </div>
  );
}
