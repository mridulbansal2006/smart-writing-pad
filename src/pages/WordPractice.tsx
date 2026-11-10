import { GuidedExercise } from '../components/GuidedExercise';
import { PRACTICE_WORDS } from '../lib/glyphs';

export function WordPractice() {
  return (
    <GuidedExercise
      title="Trace short words"
      intro="Words are traced one letter at a time, left to right. The ruled lines show how tall each letter should be and where it sits, which helps with spacing and staying on the line."
      mode="word"
      kind="word"
      items={PRACTICE_WORDS}
      pickerLabel="Choose a word"
    />
  );
}
