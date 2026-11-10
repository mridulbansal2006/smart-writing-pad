import { useState } from 'react';

import { GuidedExercise } from '../components/GuidedExercise';
import { LOWERCASE_LETTERS, NUMBERS, PRACTICE_WORDS, UPPERCASE_LETTERS } from '../lib/glyphs';
import type { ExerciseKind } from '../lib/types';

const SETS: { id: ExerciseKind; label: string; items: readonly string[] }[] = [
  { id: 'uppercase', label: 'A–Z', items: UPPERCASE_LETTERS },
  { id: 'lowercase', label: 'a–z', items: LOWERCASE_LETTERS },
  { id: 'number', label: '0–9', items: NUMBERS },
  { id: 'word', label: 'Words', items: PRACTICE_WORDS },
];

/**
 * Practice mode: the example is shown beside a blank ruled sheet and the child
 * reproduces it without a guide to trace. Because they choose where on the
 * paper to write, there is nothing meaningful to measure against — so the app
 * records the attempt and an optional self-rating, and nothing else.
 */
export function PracticeMode() {
  const [setId, setSetId] = useState<ExerciseKind>('uppercase');
  const active = SETS.find((set) => set.id === setId) ?? SETS[0]!;

  return (
    <GuidedExercise
      key={setId}
      title="Practice on your own"
      intro="Look at the example on the right, then write it yourself on the blank sheet. There is no path to follow here, so the app does not measure anything — it just remembers that you practised."
      mode="practice"
      kind={active.id}
      items={active.items}
      pickerLabel={`Choose what to practise (${active.label})`}
      practice
      headerExtra={
        <div className="flex flex-wrap gap-2" role="group" aria-label="Practice set">
          {SETS.map((set) => (
            <button
              key={set.id}
              type="button"
              className={`btn ${set.id === setId ? 'btn-primary' : ''}`}
              aria-pressed={set.id === setId}
              onClick={() => setSetId(set.id)}
            >
              {set.label}
            </button>
          ))}
        </div>
      }
    />
  );
}
