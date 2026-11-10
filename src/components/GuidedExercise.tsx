import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import { glyphFor, layoutWord } from '../lib/glyphs';
import { layoutSheet, placeStrokes } from '../lib/layout';
import { downloadDataUrl, sampleFilename } from '../lib/download';
import { putSample } from '../lib/samples';
import { EMPTY_SCORE, isTraceComplete, scoreTrace, totalInkLength, type TraceScore } from '../lib/scoring';
import { speak } from '../lib/speech';
import { createId } from '../lib/storage';
import { DIFFICULTY_TOLERANCE, type Attempt, type ExerciseKind, type ExerciseMode } from '../lib/types';
import { useApp } from '../state/AppProvider';
import { ItemPicker } from './ItemPicker';
import { ScoreReadout } from './ScoreReadout';
import { Toolbar } from './Toolbar';
import { WritingSheet } from './WritingSheet';
import type { CanvasState, CanvasTool, WritingCanvasHandle } from './WritingCanvas';

type Props = {
  title: string;
  intro: string;
  mode: ExerciseMode;
  kind: ExerciseKind;
  items: readonly string[];
  /** Picker label, e.g. "Choose a letter". */
  pickerLabel: string;
  /**
   * Practice exercises hide the guide and ask the child to reproduce the
   * character from a reference shown beside the sheet. Nothing is measured in
   * that case, because where they write on the paper is up to them.
   */
  practice?: boolean;
  /** Extra controls rendered next to the title (e.g. an A–Z / a–z switch). */
  headerExtra?: React.ReactNode;
};

const MIN_INK_LENGTH = 12;

export function GuidedExercise({
  title,
  intro,
  mode,
  kind,
  items,
  pickerLabel,
  practice = false,
  headerExtra,
}: Props) {
  const { settings, updateSettings, recordAttempt, updateAttempt } = useApp();
  const canvasRef = useRef<WritingCanvasHandle>(null);
  const feedbackRef = useRef<HTMLDivElement>(null);

  const [index, setIndex] = useState(0);
  const [tool, setTool] = useState<CanvasTool>('pen');
  const [canvasState, setCanvasState] = useState<CanvasState>({
    strokeCount: 0,
    canUndo: false,
    canRedo: false,
  });
  const [score, setScore] = useState<TraceScore | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [lastAttempt, setLastAttempt] = useState<Attempt | null>(null);
  const [savingSample, setSavingSample] = useState(false);

  const target = items[Math.min(index, items.length - 1)] ?? '';
  const isWord = target.length > 1;

  // Design-space strokes for the current target, then the sheet they sit on.
  const { designStrokes, designWidth, hint } = useMemo(() => {
    if (isWord) {
      const laid = layoutWord(target);
      return { designStrokes: laid.strokes, designWidth: laid.width, hint: `Write the word ${target}.` };
    }
    const glyph = glyphFor(target);
    return {
      designStrokes: glyph?.strokes ?? [],
      designWidth: 80,
      hint: glyph?.hint ?? '',
    };
  }, [isWord, target]);

  const layout = useMemo(() => {
    const sheetWidth = Math.min(1200, Math.max(460, Math.round(designWidth * 2.6 + 120)));
    return layoutSheet({ width: sheetWidth, height: 420 }, designWidth, settings.letterScale);
  }, [designWidth, settings.letterScale]);

  const guideStrokes = useMemo(() => placeStrokes(designStrokes, layout), [designStrokes, layout]);

  const tolerance = DIFFICULTY_TOLERANCE[settings.difficulty] * layout.scale;
  const guideVisibility = practice ? 'off' : settings.guideVisibility;

  const resetAttemptState = useCallback(() => {
    setScore(null);
    setMessage(null);
    setLastAttempt(null);
    setCanvasState({ strokeCount: 0, canUndo: false, canRedo: false });
  }, []);

  const goTo = useCallback(
    (nextIndex: number) => {
      const clamped = Math.min(items.length - 1, Math.max(0, nextIndex));
      setIndex(clamped);
      resetAttemptState();
      const next = items[clamped];
      if (next) speak(`Now try ${describe(next)}`, settings.speechEnabled);
    },
    [items, resetAttemptState, settings.speechEnabled],
  );

  /** Measure the trace, record it, and say plainly what was measured. */
  const checkTrace = useCallback(() => {
    const ink = canvasRef.current?.getInk() ?? [];
    const inkLines = ink.map((stroke) => stroke.points);
    if (totalInkLength(inkLines) < MIN_INK_LENGTH) {
      setScore(null);
      setMessage('Trace over the letter first, then press Check my tracing.');
      return;
    }

    const result = scoreTrace(guideStrokes, inkLines, { tolerance });
    const completed = isTraceComplete(result);
    setScore(result);
    const attempt = recordAttempt({
      mode,
      kind,
      target,
      coverage: result.coverage,
      onGuide: result.onGuide,
      tolerance,
      completed,
      selfRating: null,
      sampleId: null,
      needsPractice: false,
    });
    setLastAttempt(attempt);
    const spoken = completed
      ? 'Well done. You covered the whole shape.'
      : 'Good try. Some parts of the shape still need ink.';
    setMessage(spoken);
    speak(spoken, settings.speechEnabled);
  }, [guideStrokes, kind, mode, recordAttempt, settings.speechEnabled, target, tolerance]);

  /** Practice mode: record that the attempt happened, plus how it felt. */
  const recordPractice = useCallback(
    (selfRating: 1 | 2 | 3 | null) => {
      const ink = canvasRef.current?.getInk() ?? [];
      if (totalInkLength(ink.map((s) => s.points)) < MIN_INK_LENGTH) {
        setMessage('Write on the sheet first, then save the attempt.');
        return;
      }
      const attempt = recordAttempt({
        mode,
        kind,
        target,
        coverage: null,
        onGuide: null,
        tolerance: null,
        completed: false,
        selfRating,
        sampleId: null,
        needsPractice: false,
      });
      setLastAttempt(attempt);
      setScore(null);
      setMessage('Attempt saved to the practice history.');
    },
    [kind, mode, recordAttempt, target],
  );

  /** Store the flattened sheet so a teacher can look at it later. */
  const saveSample = useCallback(async () => {
    const handle = canvasRef.current;
    if (!handle) return;
    if (handle.getInk().length === 0) {
      setMessage('There is nothing on the sheet to save yet.');
      return;
    }
    const dataUrl = handle.exportPng({ includeGuide: !practice });
    if (!dataUrl) {
      setMessage('This browser could not create the image.');
      return;
    }

    setSavingSample(true);
    const sampleId = createId();
    const stored = await putSample({
      id: sampleId,
      createdAt: Date.now(),
      target,
      mode,
      dataUrl,
      width: layout.sheet.width,
      height: layout.sheet.height,
    });
    setSavingSample(false);

    if (!stored) {
      setMessage('This browser would not let the app store the picture. You can still download it.');
      return;
    }
    if (lastAttempt) {
      updateAttempt(lastAttempt.id, { sampleId });
      setLastAttempt({ ...lastAttempt, sampleId });
    } else {
      const attempt = recordAttempt({
        mode,
        kind,
        target,
        coverage: null,
        onGuide: null,
        tolerance: null,
        completed: false,
        selfRating: null,
        sampleId,
        needsPractice: false,
      });
      setLastAttempt(attempt);
    }
    setMessage('Picture saved. You can see it on the Review page.');
  }, [kind, lastAttempt, layout.sheet, mode, practice, recordAttempt, target, updateAttempt]);

  const downloadSheet = useCallback(() => {
    const dataUrl = canvasRef.current?.exportPng({ includeGuide: !practice });
    if (!dataUrl) {
      setMessage('This browser could not create the image.');
      return;
    }
    downloadDataUrl(dataUrl, sampleFilename(target));
    setMessage('Image downloaded.');
  }, [practice, target]);

  // The result sits below the sheet, so bring it into view rather than leaving
  // a child to work out that something appeared off-screen. Scrolling is
  // instant rather than animated: a page still gliding under the pen is worse
  // than one that has already settled.
  useEffect(() => {
    if (score || message) feedbackRef.current?.scrollIntoView({ block: 'nearest' });
  }, [score, message]);

  const empty = canvasState.strokeCount === 0;

  return (
    <div className="space-y-5">
      <header className="space-y-2">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h1 className="text-2xl font-bold">{title}</h1>
          {headerExtra}
        </div>
        <p className="max-w-3xl text-[var(--color-ink-soft)]">{intro}</p>
      </header>

      <ItemPicker
        label={pickerLabel}
        items={items}
        selected={target}
        onSelect={(item) => goTo(items.indexOf(item))}
      />

      <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_19rem]">
        <div className="space-y-4">
          <WritingSheet
            /* A new key per target gives the next exercise a clean canvas and
               an empty undo history, with no stale ink from the last letter. */
            key={`${kind}-${target}-${settings.letterScale}`}
            ref={canvasRef}
            layout={layout}
            guideStrokes={guideStrokes}
            guideVisibility={guideVisibility}
            showRuledLines={settings.showRuledLines}
            showStartMarkers={settings.showStartMarkers && !practice}
            penColor={settings.penColor}
            penWidth={settings.penWidth}
            tool={tool}
            label={
              practice
                ? `Blank writing sheet for practising ${describe(target)}`
                : `Writing sheet with a guide for ${describe(target)}`
            }
            onChange={setCanvasState}
            overlay={
              empty ? (
                <p className="pointer-events-none absolute inset-x-0 bottom-3 text-center text-sm text-[var(--color-ink-soft)]">
                  {practice
                    ? 'Look at the example, then write it here.'
                    : 'Start on the orange dot and follow the arrow.'}
                </p>
              ) : null
            }
          />

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
              setScore(null);
              setMessage(null);
            }}
          />
        </div>

        <aside className="space-y-4">
          <div className="card p-4">
            <h2 className="text-base font-bold">
              {practice ? 'Write it yourself' : `${designStrokes.length} stroke${designStrokes.length === 1 ? '' : 's'}`}
            </h2>
            {practice ? (
              <ReferenceCard target={target} />
            ) : (
              <p className="mt-2 text-sm text-[var(--color-ink-soft)]">{hint}</p>
            )}
            <button
              type="button"
              className="btn mt-3 w-full"
              onClick={() => speak(hint || `Write ${describe(target)}`, true)}
            >
              🔊 Read the instruction
            </button>
          </div>

          <div className="card space-y-3 p-4">
            {practice ? (
              <>
                <h2 className="text-base font-bold">How did that feel?</h2>
                <p className="text-sm text-[var(--color-ink-soft)]">
                  Nothing is measured here — the app only records that you practised, and your own rating.
                </p>
                <div className="grid grid-cols-3 gap-2">
                  <button type="button" className="btn" onClick={() => recordPractice(1)}>
                    😕 Tricky
                  </button>
                  <button type="button" className="btn" onClick={() => recordPractice(2)}>
                    🙂 Okay
                  </button>
                  <button type="button" className="btn" onClick={() => recordPractice(3)}>
                    😀 Easy
                  </button>
                </div>
                <button type="button" className="btn w-full" onClick={() => recordPractice(null)}>
                  Save attempt without a rating
                </button>
              </>
            ) : (
              <>
                <h2 className="text-base font-bold">Finished?</h2>
                <button type="button" className="btn btn-primary w-full" onClick={checkTrace}>
                  ✓ Check my tracing
                </button>
                <label className="block text-sm font-bold" htmlFor="difficulty">
                  How close do I have to stay?
                </label>
                <select
                  id="difficulty"
                  className="w-full rounded-xl border border-[var(--color-line)] bg-white px-3 py-2"
                  value={settings.difficulty}
                  onChange={(event) =>
                    updateSettings({ difficulty: event.target.value as typeof settings.difficulty })
                  }
                >
                  <option value="easy">Easy — a wide path counts</option>
                  <option value="medium">Medium</option>
                  <option value="precise">Precise — stay on the line</option>
                </select>
                <label className="block text-sm font-bold" htmlFor="guide-visibility">
                  Guide letter
                </label>
                <select
                  id="guide-visibility"
                  className="w-full rounded-xl border border-[var(--color-line)] bg-white px-3 py-2"
                  value={settings.guideVisibility}
                  onChange={(event) =>
                    updateSettings({ guideVisibility: event.target.value as typeof settings.guideVisibility })
                  }
                >
                  <option value="full">Clear</option>
                  <option value="faint">Faded</option>
                  <option value="off">Hidden</option>
                </select>
              </>
            )}
          </div>

          <div className="card space-y-2 p-4">
            <h2 className="text-base font-bold">Keep this work</h2>
            <button type="button" className="btn w-full" onClick={saveSample} disabled={savingSample}>
              {savingSample ? 'Saving…' : '💾 Save writing sample'}
            </button>
            <button type="button" className="btn w-full" onClick={downloadSheet}>
              ⬇️ Download as image
            </button>
          </div>

          <div className="flex gap-2">
            <button type="button" className="btn flex-1" onClick={() => goTo(index - 1)} disabled={index === 0}>
              ← Back
            </button>
            <button
              type="button"
              className="btn btn-primary flex-1"
              onClick={() => goTo(index + 1)}
              disabled={index >= items.length - 1}
            >
              Next →
            </button>
          </div>
        </aside>
      </div>

      {(message || score) && (
        <div ref={feedbackRef} role="status" aria-live="polite" className="space-y-3">
          {message && (
            <p className="card bg-[var(--color-brand-soft)] px-4 py-3 font-bold text-[var(--color-brand-dark)]">
              {message}
            </p>
          )}
          {score && <ScoreReadout score={score ?? EMPTY_SCORE} />}
        </div>
      )}
    </div>
  );
}

function describe(target: string): string {
  if (target.length > 1) return `the word ${target}`;
  if (/[0-9]/.test(target)) return `the number ${target}`;
  return target === target.toUpperCase() ? `capital ${target}` : `small ${target}`;
}

/** The reference character shown in practice mode, drawn from the same data. */
function ReferenceCard({ target }: { target: string }) {
  const { strokes, width } = target.length > 1 ? layoutWord(target) : { strokes: glyphFor(target)?.strokes ?? [], width: 80 };
  const layout = layoutSheet({ width: Math.max(160, width * 1.4), height: 220 }, width, 1, 12);
  const placed = placeStrokes(strokes, layout);
  return (
    <div className="mt-2 rounded-xl border border-[var(--color-line)] bg-white p-2">
      <svg
        viewBox={`0 0 ${layout.sheet.width} ${layout.sheet.height}`}
        className="h-auto w-full"
        role="img"
        aria-label={`Example of ${describe(target)}`}
      >
        <line
          x1={0}
          y1={layout.lines.baseline}
          x2={layout.sheet.width}
          y2={layout.lines.baseline}
          stroke="var(--color-line)"
          strokeWidth={2}
        />
        <g
          fill="none"
          stroke="var(--color-ink)"
          strokeWidth={Math.max(3, 7 * layout.scale)}
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          {placed.map((stroke, index) => (
            <path
              key={index}
              d={stroke.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x.toFixed(1)} ${p.y.toFixed(1)}`).join(' ')}
            />
          ))}
        </g>
      </svg>
    </div>
  );
}
