import { HashRouter, Navigate, Route, Routes } from 'react-router-dom';

import { ErrorBoundary } from './components/ErrorBoundary';
import { Layout } from './components/Layout';
import { Dashboard } from './pages/Dashboard';
import { LetterTracing } from './pages/LetterTracing';
import { NumberPractice } from './pages/NumberPractice';
import { PracticeMode } from './pages/PracticeMode';
import { Progress } from './pages/Progress';
import { Review } from './pages/Review';
import { SettingsPage } from './pages/SettingsPage';
import { WordPractice } from './pages/WordPractice';
import { WritingPad } from './pages/WritingPad';
import { AppProvider } from './state/AppProvider';

/**
 * Routing uses a hash router on purpose: the built app is a set of static
 * files that must work from any host — Vercel, Netlify, GitHub Pages or a USB
 * stick opened in a browser — without server-side rewrite rules.
 */
export function App() {
  return (
    <ErrorBoundary>
      <AppProvider>
        <HashRouter>
          <Routes>
            <Route element={<Layout />}>
              <Route path="/" element={<Dashboard />} />
              <Route path="/pad" element={<WritingPad />} />
              <Route path="/letters" element={<LetterTracing />} />
              <Route path="/numbers" element={<NumberPractice />} />
              <Route path="/words" element={<WordPractice />} />
              <Route path="/practice" element={<PracticeMode />} />
              <Route path="/progress" element={<Progress />} />
              <Route path="/review" element={<Review />} />
              <Route path="/settings" element={<SettingsPage />} />
              <Route path="*" element={<Navigate to="/" replace />} />
            </Route>
          </Routes>
        </HashRouter>
      </AppProvider>
    </ErrorBoundary>
  );
}
