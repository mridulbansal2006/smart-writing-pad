import { useMemo } from 'react';
import { Link } from 'react-router-dom';

import { downloadText } from '../lib/download';
import { attemptsToCsv, byTarget, summarize } from '../lib/stats';
import { useApp } from '../state/AppProvider';

export function Progress() {
  const { attempts, ready } = useApp();
  const summary = useMemo(() => summarize(attempts), [attempts]);
  const targets = useMemo(() => byTarget(attempts), [attempts]);
  const busiestDay = useMemo(
    () => summary.dailyActivity.reduce((max, day) => Math.max(max, day.count), 0),
    [summary.dailyActivity],
  );

  if (!ready) return <p className="text-[var(--color-ink-soft)]">Loading saved progress…</p>;

  if (attempts.length === 0) {
    return (
      <div className="space-y-4">
        <h1 className="text-2xl font-bold">My progress</h1>
        <p className="card bg-[var(--color-brand-soft)] p-5 text-[var(--color-brand-dark)]">
          Nothing has been recorded on this device yet. Progress appears here after you press{' '}
          <strong>Check my tracing</strong> in a tracing exercise, or save an attempt in practice mode.
        </p>
        <Link to="/letters" className="btn btn-primary">
          Start tracing letters
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">My progress</h1>
          <p className="text-[var(--color-ink-soft)]">
            Everything here is counted from the attempts recorded on this device.
          </p>
        </div>
        <button
          type="button"
          className="btn"
          onClick={() => downloadText(attemptsToCsv(attempts), 'writing-practice-history.csv', 'text/csv')}
        >
          ⬇️ Export history (CSV)
        </button>
      </header>

      <dl className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Stat label="Exercises attempted" value={summary.totalAttempts} />
        <Stat label="Traces that met the target" value={summary.completedTraces} />
        <Stat label="Practice sessions" value={summary.practiceSessions} />
        <Stat label="Writing samples saved" value={summary.savedSamples} />
      </dl>

      <section className="card p-5">
        <h2 className="text-lg font-bold">Practice in the last 14 days</h2>
        <p className="mt-1 text-sm text-[var(--color-ink-soft)]">
          Number of attempts per day. Bars are to scale against the busiest day ({busiestDay}).
        </p>
        <ul className="mt-4 flex h-32 items-end gap-1.5">
          {summary.dailyActivity.map((day) => {
            const height = busiestDay === 0 ? 0 : Math.round((day.count / busiestDay) * 100);
            return (
              <li key={day.date} className="flex h-full flex-1 flex-col justify-end gap-1">
                <div
                  className="w-full rounded-t"
                  style={{
                    height: `${Math.max(height, day.count > 0 ? 6 : 2)}%`,
                    backgroundColor: day.count > 0 ? 'var(--color-brand)' : 'var(--color-line)',
                  }}
                  title={`${day.date}: ${day.count} attempt${day.count === 1 ? '' : 's'}`}
                />
                <span className="text-center text-[10px] text-[var(--color-ink-soft)]">
                  {day.date.slice(8)}
                </span>
              </li>
            );
          })}
        </ul>
      </section>

      <section className="card p-5">
        <h2 className="text-lg font-bold">What the numbers mean</h2>
        <ul className="mt-2 space-y-2 text-sm text-[var(--color-ink-soft)]">
          <li>
            <strong>Met the target</strong> — in a tracing exercise, at least 75% of the printed shape had ink
            on it and at least 60% of the ink stayed on the shape.
          </li>
          <li>
            <strong>Practice sessions</strong> — attempts grouped together; a gap of more than 20 minutes
            starts a new session.
          </li>
          <li>
            Practice-mode attempts are counted but not measured, because the child chooses where on the sheet
            to write. Those are shown as “not measured”.
          </li>
          <li>
            The app does not score handwriting quality and does not estimate learning progress. These are
            activity counts and geometric overlap measurements only.
          </li>
        </ul>
        {summary.meanCoverage !== null && (
          <p className="mt-3 text-sm">
            Average shape coverage across {summary.totalAttempts - summary.unmeasuredAttempts} measured
            attempts: <strong>{Math.round(summary.meanCoverage * 100)}%</strong>
            {summary.meanOnGuide !== null && (
              <> · average ink on the shape: <strong>{Math.round(summary.meanOnGuide * 100)}%</strong></>
            )}
          </p>
        )}
      </section>

      <section className="card overflow-hidden">
        <h2 className="p-5 pb-3 text-lg font-bold">Every letter, number and word tried</h2>
        <div className="overflow-x-auto">
          <table className="w-full min-w-xl border-collapse text-sm">
            <thead>
              <tr className="border-y border-[var(--color-line)] bg-[var(--color-paper)] text-left">
                <Th>Target</Th>
                <Th>Type</Th>
                <Th>Attempts</Th>
                <Th>Met target</Th>
                <Th>Best coverage</Th>
                <Th>Last practised</Th>
              </tr>
            </thead>
            <tbody>
              {targets.map((stat) => (
                <tr key={`${stat.kind}-${stat.target}`} className="border-b border-[var(--color-line)]">
                  <Td>
                    <span className="text-lg font-bold">{stat.target}</span>
                  </Td>
                  <Td>{KIND_LABEL[stat.kind]}</Td>
                  <Td>{stat.attempts}</Td>
                  <Td>{stat.completed}</Td>
                  <Td>
                    {stat.bestCoverage === null ? (
                      <span className="text-[var(--color-ink-soft)]">not measured</span>
                    ) : (
                      `${Math.round(stat.bestCoverage * 100)}%`
                    )}
                  </Td>
                  <Td>{new Date(stat.lastAttemptAt).toLocaleString()}</Td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}

const KIND_LABEL: Record<string, string> = {
  uppercase: 'Capital letter',
  lowercase: 'Small letter',
  number: 'Number',
  word: 'Word',
  free: 'Free writing',
};

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div className="card p-4">
      <dt className="text-sm text-[var(--color-ink-soft)]">{label}</dt>
      <dd className="mt-1 text-3xl font-bold tabular-nums">{value}</dd>
    </div>
  );
}

function Th({ children }: { children: React.ReactNode }) {
  return <th className="px-4 py-2 font-bold">{children}</th>;
}

function Td({ children }: { children: React.ReactNode }) {
  return <td className="px-4 py-2 align-middle">{children}</td>;
}
