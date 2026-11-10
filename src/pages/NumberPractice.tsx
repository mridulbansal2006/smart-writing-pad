import { GuidedExercise } from '../components/GuidedExercise';
import { NUMBERS } from '../lib/glyphs';

export function NumberPractice() {
  return (
    <GuidedExercise
      title="Trace numbers 0–9"
      intro="Each number starts at the orange dot. Follow the arrow all the way round, then check your tracing."
      mode="tracing"
      kind="number"
      items={NUMBERS}
      pickerLabel="Choose a number"
    />
  );
}
