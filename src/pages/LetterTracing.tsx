import { useState } from 'react';

import { GuidedExercise } from '../components/GuidedExercise';
import { LOWERCASE_LETTERS, UPPERCASE_LETTERS } from '../lib/glyphs';

export function LetterTracing() {
  const [caseMode, setCaseMode] = useState<'upper' | 'lower'>('upper');
  const upper = caseMode === 'upper';

  return (
    <GuidedExercise
      key={caseMode}
      title={upper ? 'Trace capital letters' : 'Trace small letters'}
      intro="Put the pen on the orange dot, follow the arrow and stay on the green path. When you are done, press Check my tracing to see how much of the shape you covered."
      mode="tracing"
      kind={upper ? 'uppercase' : 'lowercase'}
      items={upper ? UPPERCASE_LETTERS : LOWERCASE_LETTERS}
      pickerLabel="Choose a letter"
      headerExtra={
        <div className="flex gap-2" role="group" aria-label="Letter case">
          <button
            type="button"
            className={`btn ${upper ? 'btn-primary' : ''}`}
            aria-pressed={upper}
            onClick={() => setCaseMode('upper')}
          >
            A–Z
          </button>
          <button
            type="button"
            className={`btn ${!upper ? 'btn-primary' : ''}`}
            aria-pressed={!upper}
            onClick={() => setCaseMode('lower')}
          >
            a–z
          </button>
        </div>
      }
    />
  );
}
