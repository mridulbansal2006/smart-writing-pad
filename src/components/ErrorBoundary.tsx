import { Component, type ErrorInfo, type ReactNode } from 'react';

type Props = { children: ReactNode };
type State = { error: Error | null };

/**
 * Last line of defence. A child mid-exercise should never be left looking at a
 * blank white page, so an unexpected render error shows a readable message and
 * a way back instead.
 */
export class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo): void {
    console.error('Unexpected application error', error, info.componentStack);
  }

  render() {
    const { error } = this.state;
    if (!error) return this.props.children;

    return (
      <div className="mx-auto max-w-xl p-6">
        <div className="card p-6">
          <h1 className="text-xl font-bold">Something went wrong</h1>
          <p className="mt-2 text-[var(--color-ink-soft)]">
            The app hit an unexpected error. Your saved settings and progress are untouched.
          </p>
          <pre className="mt-4 overflow-x-auto rounded-lg bg-[var(--color-paper)] p-3 text-xs">
            {error.message}
          </pre>
          <button
            type="button"
            className="btn btn-primary mt-4"
            onClick={() => {
              window.location.hash = '#/';
              window.location.reload();
            }}
          >
            Back to home
          </button>
        </div>
      </div>
    );
  }
}
