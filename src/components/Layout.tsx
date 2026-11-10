import { NavLink, Outlet } from 'react-router-dom';

import { useApp } from '../state/AppProvider';

const NAV = [
  { to: '/', label: 'Home', icon: '🏠' },
  { to: '/pad', label: 'Writing Pad', icon: '✏️' },
  { to: '/letters', label: 'Letters', icon: '🔤' },
  { to: '/numbers', label: 'Numbers', icon: '🔢' },
  { to: '/words', label: 'Words', icon: '📖' },
  { to: '/practice', label: 'Practice', icon: '🎯' },
  { to: '/progress', label: 'Progress', icon: '📈' },
  { to: '/review', label: 'Review', icon: '👩‍🏫' },
  { to: '/settings', label: 'Settings', icon: '⚙️' },
];

export function Layout() {
  const { profileName, storageBlocked } = useApp();

  return (
    <div className="min-h-dvh bg-[var(--color-paper)]">
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-50 focus:rounded-lg focus:bg-white focus:px-4 focus:py-2 focus:font-bold"
      >
        Skip to main content
      </a>

      {/* Deliberately not sticky. A bar pinned over the page would sit on top
          of the writing sheet whenever it scrolls under it, swallowing the
          pointer events for any stroke drawn there — a child's ink would just
          go missing. Pages are short enough to scroll back to the nav. */}
      <header className="relative z-30 border-b border-[var(--color-line)] bg-[var(--color-paper)]">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center gap-3 px-4 py-3">
          <NavLink to="/" className="flex items-center gap-3">
            <span
              aria-hidden="true"
              className="grid h-10 w-10 place-items-center rounded-xl bg-[var(--color-brand)] text-lg text-white"
            >
              ✍️
            </span>
            <span>
              <span className="block text-lg leading-tight font-bold">Smart Writing Pad</span>
              <span className="decorative block text-xs text-[var(--color-ink-soft)]">
                Handwriting practice, one stroke at a time
              </span>
            </span>
          </NavLink>
          {profileName && (
            <span className="ml-auto rounded-full bg-[var(--color-brand-soft)] px-3 py-1 text-sm font-bold text-[var(--color-brand-dark)]">
              {profileName}
            </span>
          )}
        </div>

        <nav aria-label="Main" className="mx-auto max-w-6xl px-2 pb-2">
          <ul className="flex gap-1 overflow-x-auto pb-1">
            {NAV.map((item) => (
              <li key={item.to} className="shrink-0">
                <NavLink
                  to={item.to}
                  end={item.to === '/'}
                  className={({ isActive }) =>
                    [
                      'flex items-center gap-2 rounded-xl px-3 py-2 text-sm font-bold whitespace-nowrap',
                      isActive
                        ? 'bg-[var(--color-brand)] text-white'
                        : 'text-[var(--color-ink-soft)] hover:bg-[var(--color-brand-soft)] hover:text-[var(--color-brand-dark)]',
                    ].join(' ')
                  }
                >
                  <span aria-hidden="true">{item.icon}</span>
                  {item.label}
                </NavLink>
              </li>
            ))}
          </ul>
        </nav>
      </header>

      {storageBlocked && (
        <p
          role="status"
          className="mx-auto mt-4 max-w-6xl rounded-xl border border-[var(--color-accent)] bg-[var(--color-accent-soft)] px-4 py-3 text-sm"
        >
          This browser is not letting the app save to local storage, so settings and progress will be lost when
          the tab closes. Practising still works.
        </p>
      )}

      <main id="main" className="mx-auto max-w-6xl px-4 py-6">
        <Outlet />
      </main>

      <footer className="mx-auto max-w-6xl px-4 pb-10 text-xs leading-relaxed text-[var(--color-ink-soft)]">
        <p>
          Smart Writing Pad is a handwriting <strong>practice</strong> tool for classrooms and homes. It is not a
          medical device: it does not diagnose, screen for or treat any learning disability, and the figures it
          shows describe only what was drawn on this device.
        </p>
      </footer>
    </div>
  );
}
