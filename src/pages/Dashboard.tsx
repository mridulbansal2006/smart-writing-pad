import { Link } from 'react-router-dom';
import { useMemo } from 'react';

import { summarize } from '../lib/stats';
import { useApp } from '../state/AppProvider';

const MODES = [
  {
    to: '/pad',
    title: 'Writing pad',
    body: 'A blank ruled pad for free writing and drawing.',
    icon: '✏️',
  },
  {
    to: '/letters',
    title: 'Letter tracing',
    body: 'Capital and small letters with a path, a start dot and arrows.',
    icon: '🔤',
  },
  {
    to: '/numbers',
    title: 'Number tracing',
    body: 'Trace the numbers 0 to 9 the same way.',
    icon: '🔢',
  },
  {
    to: '/words',
    title: 'Word tracing',
    body: 'Short words on ruled lines, for spacing and letter height.',
    icon: '📖',
  },
  {
    to: '/practice',
    title: 'Practice on your own',
    body: 'See an example, then write it yourself with no path to follow.',
    icon: '🎯',
  },
  {
    to: '/progress',
    title: 'My progress',
    body: 'What has been practised, and when.',
    icon: '📈',
  },
];

export function Dashboard() {
  const { attempts, profileName, setProfileName, ready } = useApp();
  const summary = useMemo(() => summarize(attempts), [attempts]);

  return (
    <div className="space-y-6">
      <section className="card p-6">
        <h1 className="text-3xl font-bold">
          {profileName ? `Hello, ${profileName}!` : 'Welcome to Smart Writing Pad'}
        </h1>
        <p className="mt-2 max-w-2xl text-[var(--color-ink-soft)]">
          Practise forming letters, numbers and short words with a guided path, adjustable letter size and a
          writing surface that works with a mouse, a finger or a stylus. Everything stays on this device.
        </p>
        <div className="decorative mt-4 max-w-md">
          <label htmlFor="profile-name" className="block text-sm font-bold">
            Nickname for this device (optional)
          </label>
          <input
            id="profile-name"
            type="text"
            value={profileName}
            maxLength={40}
            placeholder="e.g. Class 3 tablet, or a first name"
            onChange={(event) => setProfileName(event.target.value)}
            className="mt-1 w-full rounded-xl border border-[var(--color-line)] bg-white px-3 py-2"
          />
          <p className="mt-1 text-xs text-[var(--color-ink-soft)]">
            Only used as a label on this device. Please do not enter a child&apos;s full name or any other
            personal details.
          </p>
        </div>
      </section>

      <section aria-labelledby="quick-stats-heading" className="space-y-3">
        <h2 id="quick-stats-heading" className="text-xl font-bold">
          At a glance
        </h2>
        {!ready ? (
          <p className="text-[var(--color-ink-soft)]">Loading saved progress…</p>
        ) : summary.totalAttempts === 0 ? (
          <p className="card bg-[var(--color-brand-soft)] p-4 text-[var(--color-brand-dark)]">
            No practice recorded on this device yet. Pick an activity below to begin — your attempts will
            appear here.
          </p>
        ) : (
          <dl className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <Stat label="Exercises attempted" value={summary.totalAttempts} />
            <Stat label="Traces that met the target" value={summary.completedTraces} />
            <Stat label="Practice sessions" value={summary.practiceSessions} />
            <Stat label="Letters, numbers and words tried" value={summary.distinctTargets} />
          </dl>
        )}
      </section>

      <section aria-labelledby="activities-heading" className="space-y-3">
        <h2 id="activities-heading" className="text-xl font-bold">
          What would you like to do?
        </h2>
        <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {MODES.map((mode) => (
            <li key={mode.to}>
              <Link
                to={mode.to}
                className="card flex h-full flex-col gap-2 p-5 transition-colors hover:border-[var(--color-brand)] hover:bg-[var(--color-brand-soft)]"
              >
                <span aria-hidden="true" className="text-3xl">
                  {mode.icon}
                </span>
                <span className="text-lg font-bold">{mode.title}</span>
                <span className="text-sm text-[var(--color-ink-soft)]">{mode.body}</span>
              </Link>
            </li>
          ))}
        </ul>
      </section>

      <section className="card p-5">
        <h2 className="text-lg font-bold">For teachers and parents</h2>
        <p className="mt-2 text-sm text-[var(--color-ink-soft)]">
          The Review page shows saved writing samples and every recorded attempt, and can export a CSV
          summary. Accessibility settings — letter size, contrast, guide visibility, larger controls and
          spoken instructions — are on the Settings page and are remembered on this device.
        </p>
        <div className="mt-3 flex flex-wrap gap-3">
          <Link to="/review" className="btn">
            Open review
          </Link>
          <Link to="/settings" className="btn">
            Accessibility settings
          </Link>
        </div>
      </section>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div className="card p-4">
      <dt className="text-sm text-[var(--color-ink-soft)]">{label}</dt>
      <dd className="mt-1 text-3xl font-bold tabular-nums">{value}</dd>
    </div>
  );
}
