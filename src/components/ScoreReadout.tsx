import { isTraceComplete, type TraceScore } from '../lib/scoring';

/**
 * What the measurement actually was. The wording matters here: these are two
 * geometric overlap figures, not a handwriting grade, and the panel says so
 * rather than leaving a child or a parent to assume otherwise.
 */
export function ScoreReadout({ score }: { score: TraceScore }) {
  const complete = isTraceComplete(score);
  return (
    <section
      className="card space-y-4 p-4"
      aria-label="Tracing measurement"
      style={{
        borderColor: complete ? 'var(--color-good)' : 'var(--color-line)',
        backgroundColor: complete ? 'var(--color-good-soft)' : 'var(--color-card)',
      }}
    >
      <div className="grid gap-4 sm:grid-cols-2">
        <Meter
          label="Shape covered by your ink"
          value={score.coverage}
          threshold={0.75}
          detail={`${Math.round(score.coverage * 100)}% of the guide had ink within the allowed distance.`}
        />
        <Meter
          label="Your ink that stayed on the shape"
          value={score.onGuide}
          threshold={0.6}
          detail={`${Math.round(score.onGuide * 100)}% of what you drew was close to the guide.`}
        />
      </div>
      <p className="text-xs leading-relaxed text-[var(--color-ink-soft)]">
        Both numbers are distance measurements between what you drew and the printed guide, taken{' '}
        {Math.round(score.tolerance)} units apart at this difficulty setting. They describe this one tracing
        only — the app does not recognise handwriting and cannot judge how well anyone writes.
      </p>
    </section>
  );
}

function Meter({
  label,
  value,
  threshold,
  detail,
}: {
  label: string;
  value: number;
  threshold: number;
  detail: string;
}) {
  const percent = Math.round(value * 100);
  const met = value >= threshold;
  return (
    <div>
      <div className="flex items-baseline justify-between gap-2">
        <h3 className="text-sm font-bold">{label}</h3>
        <span className="text-xl font-bold tabular-nums">{percent}%</span>
      </div>
      <div
        className="mt-2 h-3 w-full overflow-hidden rounded-full bg-[var(--color-paper)]"
        role="meter"
        aria-valuenow={percent}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label={label}
      >
        <div
          className="h-full rounded-full"
          style={{
            width: `${percent}%`,
            backgroundColor: met ? 'var(--color-good)' : 'var(--color-accent)',
          }}
        />
      </div>
      <p className="mt-1 text-xs text-[var(--color-ink-soft)]">{detail}</p>
      <p className="text-xs text-[var(--color-ink-soft)]">
        Target for this exercise: {Math.round(threshold * 100)}%
      </p>
    </div>
  );
}
