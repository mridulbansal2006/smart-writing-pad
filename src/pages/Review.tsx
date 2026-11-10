import { useCallback, useEffect, useMemo, useState } from 'react';

import { downloadDataUrl, downloadText, sampleFilename } from '../lib/download';
import { deleteSample, listSamples } from '../lib/samples';
import { attemptsToCsv, needsMorePractice, summarize } from '../lib/stats';
import type { WritingSample } from '../lib/types';
import { useApp } from '../state/AppProvider';

/**
 * Teacher / parent view: the saved samples, the raw attempt log, a list of
 * targets worth revisiting, and exports. Deliberately read-mostly — the only
 * things an adult changes here are the "needs more practice" flags.
 */
export function Review() {
  const { attempts, updateAttempt, deleteAttempt, ready } = useApp();
  const [samples, setSamples] = useState<WritingSample[] | null>(null);
  const [selected, setSelected] = useState<WritingSample | null>(null);

  const refreshSamples = useCallback(() => {
    void listSamples().then(setSamples);
  }, []);

  useEffect(refreshSamples, [refreshSamples]);

  const summary = useMemo(() => summarize(attempts), [attempts]);
  const revisit = useMemo(() => needsMorePractice(attempts), [attempts]);

  const removeSample = useCallback(
    async (sample: WritingSample) => {
      await deleteSample(sample.id);
      // Keep the attempt record, but drop the dangling reference to the image.
      for (const attempt of attempts) {
        if (attempt.sampleId === sample.id) updateAttempt(attempt.id, { sampleId: null });
      }
      if (selected?.id === sample.id) setSelected(null);
      refreshSamples();
    },
    [attempts, refreshSamples, selected, updateAttempt],
  );

  const exportSummary = useCallback(() => {
    const lines = [
      'Smart Writing Pad — practice summary',
      `Generated: ${new Date().toLocaleString()}`,
      '',
      `Exercises attempted: ${summary.totalAttempts}`,
      `Traces that met the target: ${summary.completedTraces}`,
      `Attempts recorded without measurement (practice / free writing): ${summary.unmeasuredAttempts}`,
      `Practice sessions: ${summary.practiceSessions}`,
      `Distinct letters, numbers and words practised: ${summary.distinctTargets}`,
      `Writing samples saved: ${summary.savedSamples}`,
      summary.firstAttemptAt
        ? `First recorded attempt: ${new Date(summary.firstAttemptAt).toLocaleString()}`
        : 'First recorded attempt: none',
      summary.lastAttemptAt
        ? `Most recent attempt: ${new Date(summary.lastAttemptAt).toLocaleString()}`
        : 'Most recent attempt: none',
      '',
      'Worth revisiting (flagged, or tried twice or more without meeting the target):',
      ...(revisit.length === 0
        ? ['  none']
        : revisit.map(
            (stat) =>
              `  ${stat.target} — ${stat.attempts} attempts, best coverage ${
                stat.bestCoverage === null ? 'not measured' : `${Math.round(stat.bestCoverage * 100)}%`
              }${stat.flagged ? ' (flagged)' : ''}`,
          )),
      '',
      'Note: "coverage" is the share of the printed guide that had ink on it, and',
      '"on shape" is the share of the ink that stayed near the guide. The app does',
      'not recognise handwriting and does not assess any learning disability.',
    ];
    downloadText(lines.join('\n'), 'writing-practice-summary.txt');
  }, [revisit, summary]);

  if (!ready) return <p className="text-[var(--color-ink-soft)]">Loading saved records…</p>;

  return (
    <div className="space-y-6">
      <header className="space-y-2">
        <h1 className="text-2xl font-bold">Teacher and parent review</h1>
        <p className="max-w-3xl text-[var(--color-ink-soft)]">
          Saved work and the full practice log for this device. Records are stored locally in this browser; no
          account is created and nothing is uploaded.
        </p>
      </header>

      <div className="flex flex-wrap gap-3">
        <button type="button" className="btn" onClick={exportSummary} disabled={attempts.length === 0}>
          ⬇️ Export summary (text)
        </button>
        <button
          type="button"
          className="btn"
          onClick={() => downloadText(attemptsToCsv(attempts), 'writing-practice-history.csv', 'text/csv')}
          disabled={attempts.length === 0}
        >
          ⬇️ Export full log (CSV)
        </button>
      </div>

      <section className="card p-5">
        <h2 className="text-lg font-bold">Worth revisiting</h2>
        {revisit.length === 0 ? (
          <p className="mt-2 text-sm text-[var(--color-ink-soft)]">
            Nothing listed. Targets appear here once they have been attempted twice or more in a guided
            exercise without meeting the target, or when an adult flags them below.
          </p>
        ) : (
          <ul className="mt-3 flex flex-wrap gap-2">
            {revisit.map((stat) => (
              <li
                key={`${stat.kind}-${stat.target}`}
                className="rounded-xl border border-[var(--color-accent)] bg-[var(--color-accent-soft)] px-3 py-2 text-sm"
              >
                <span className="text-lg font-bold">{stat.target}</span>{' '}
                <span className="text-[var(--color-ink-soft)]">
                  {stat.attempts} attempts
                  {stat.bestCoverage !== null && `, best ${Math.round(stat.bestCoverage * 100)}%`}
                  {stat.flagged && ' · flagged'}
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-bold">Saved writing samples</h2>
        {samples === null ? (
          <p className="text-[var(--color-ink-soft)]">Loading samples…</p>
        ) : samples.length === 0 ? (
          <p className="card bg-[var(--color-brand-soft)] p-4 text-[var(--color-brand-dark)]">
            No samples saved yet. In any exercise, press <strong>Save writing sample</strong> to keep a picture
            of the sheet here.
          </p>
        ) : (
          <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {samples.map((sample) => (
              <li key={sample.id} className="card overflow-hidden">
                <button
                  type="button"
                  onClick={() => setSelected(sample)}
                  className="block w-full border-b border-[var(--color-line)] bg-white"
                  aria-label={`Open the sample for ${sample.target || 'free writing'}`}
                >
                  <img
                    src={sample.dataUrl}
                    alt={`Writing sample for ${sample.target || 'free writing'}`}
                    className="h-40 w-full object-contain"
                    loading="lazy"
                  />
                </button>
                <div className="flex items-center justify-between gap-2 p-3">
                  <div className="min-w-0">
                    <p className="truncate font-bold">{sample.target || 'Free writing'}</p>
                    <p className="text-xs text-[var(--color-ink-soft)]">
                      {new Date(sample.createdAt).toLocaleString()}
                    </p>
                  </div>
                  <div className="flex shrink-0 gap-1">
                    <button
                      type="button"
                      className="btn px-3"
                      title="Download this sample"
                      onClick={() =>
                        downloadDataUrl(sample.dataUrl, sampleFilename(sample.target, new Date(sample.createdAt)))
                      }
                    >
                      ⬇️
                    </button>
                    <button
                      type="button"
                      className="btn px-3"
                      title="Delete this sample"
                      onClick={() => void removeSample(sample)}
                    >
                      🗑️
                    </button>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="card overflow-hidden">
        <h2 className="p-5 pb-3 text-lg font-bold">Practice log</h2>
        {attempts.length === 0 ? (
          <p className="px-5 pb-5 text-sm text-[var(--color-ink-soft)]">No attempts recorded yet.</p>
        ) : (
          <div className="overflow-x-auto">
            {/* Secondary columns are dropped on small screens so the controls a
                teacher actually taps stay reachable on a phone. The full detail
                is always available in the CSV export. */}
            <table className="w-full border-collapse text-sm">
              <thead>
                <tr className="border-y border-[var(--color-line)] bg-[var(--color-paper)] text-left">
                  <th className="hidden px-4 py-2 md:table-cell">When</th>
                  <th className="px-4 py-2">Target</th>
                  <th className="hidden px-4 py-2 md:table-cell">Mode</th>
                  <th className="px-4 py-2">Coverage</th>
                  <th className="hidden px-4 py-2 md:table-cell">On shape</th>
                  <th className="hidden px-4 py-2 md:table-cell">Met target</th>
                  <th className="hidden px-4 py-2 md:table-cell">Child&apos;s rating</th>
                  <th className="px-2 py-2 md:px-4">Needs practice</th>
                  <th className="px-2 py-2 md:px-4">Remove</th>
                </tr>
              </thead>
              <tbody>
                {attempts.slice(0, 100).map((attempt) => (
                  <tr key={attempt.id} className="border-b border-[var(--color-line)]">
                    <td className="hidden px-4 py-2 whitespace-nowrap md:table-cell">
                      {new Date(attempt.createdAt).toLocaleString()}
                    </td>
                    <td className="px-4 py-2 font-bold">{attempt.target || '—'}</td>
                    <td className="hidden px-4 py-2 md:table-cell">{attempt.mode}</td>
                    <td className="px-4 py-2">
                      {attempt.coverage === null ? (
                        <span className="text-[var(--color-ink-soft)]">not measured</span>
                      ) : (
                        `${Math.round(attempt.coverage * 100)}%`
                      )}
                    </td>
                    <td className="hidden px-4 py-2 md:table-cell">
                      {attempt.onGuide === null ? (
                        <span className="text-[var(--color-ink-soft)]">—</span>
                      ) : (
                        `${Math.round(attempt.onGuide * 100)}%`
                      )}
                    </td>
                    <td className="hidden px-4 py-2 md:table-cell">{attempt.completed ? 'yes' : 'no'}</td>
                    <td className="hidden px-4 py-2 md:table-cell">
                      {attempt.selfRating === null ? '—' : ['', 'tricky', 'okay', 'easy'][attempt.selfRating]}
                    </td>
                    <td className="px-2 py-2 md:px-4">
                      <label className="flex items-center gap-2">
                        <input
                          type="checkbox"
                          className="h-5 w-5 accent-[var(--color-accent)]"
                          checked={attempt.needsPractice}
                          onChange={(event) =>
                            updateAttempt(attempt.id, { needsPractice: event.target.checked })
                          }
                        />
                        <span className="sr-only">
                          Flag {attempt.target || 'this attempt'} as needing more practice
                        </span>
                      </label>
                    </td>
                    <td className="px-2 py-2 md:px-4">
                      <button
                        type="button"
                        className="btn px-3"
                        title="Delete this record"
                        onClick={() => deleteAttempt(attempt.id)}
                      >
                        🗑️
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {attempts.length > 100 && (
              <p className="px-4 py-3 text-xs text-[var(--color-ink-soft)]">
                Showing the 100 most recent attempts. Export the CSV for the full log.
              </p>
            )}
          </div>
        )}
      </section>

      {selected && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label={`Writing sample for ${selected.target || 'free writing'}`}
          className="fixed inset-0 z-50 grid place-items-center bg-black/50 p-4"
          onClick={() => setSelected(null)}
        >
          <div className="card max-h-full w-full max-w-3xl overflow-auto p-4" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between gap-3 pb-3">
              <h3 className="text-lg font-bold">{selected.target || 'Free writing'}</h3>
              <button type="button" className="btn" onClick={() => setSelected(null)}>
                Close
              </button>
            </div>
            <img
              src={selected.dataUrl}
              alt={`Writing sample for ${selected.target || 'free writing'}`}
              className="w-full rounded-xl border border-[var(--color-line)]"
            />
          </div>
        </div>
      )}
    </div>
  );
}
