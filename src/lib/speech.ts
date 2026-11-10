/**
 * Spoken instructions through the browser's Web Speech API.
 *
 * Support varies a lot between browsers, so every call is guarded and the
 * settings screen only offers the option when the API is actually present.
 */

export function speechSupported(): boolean {
  return typeof window !== 'undefined' && 'speechSynthesis' in window;
}

export function speak(text: string, enabled: boolean): void {
  if (!enabled || !text || !speechSupported()) return;
  try {
    const synth = window.speechSynthesis;
    synth.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.rate = 0.9;
    utterance.pitch = 1;
    synth.speak(utterance);
  } catch {
    /* speech is a convenience; never let it break an exercise */
  }
}

export function stopSpeaking(): void {
  if (!speechSupported()) return;
  try {
    window.speechSynthesis.cancel();
  } catch {
    /* ignore */
  }
}
