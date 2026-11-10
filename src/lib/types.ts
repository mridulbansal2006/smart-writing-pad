export type ExerciseMode = 'free' | 'tracing' | 'practice' | 'word';

export type ExerciseKind = 'uppercase' | 'lowercase' | 'number' | 'word' | 'free';

/** One recorded attempt at an exercise. Written only when the child acts. */
export type Attempt = {
  id: string;
  createdAt: number;
  mode: ExerciseMode;
  kind: ExerciseKind;
  /** The letter, digit or word that was on screen ('' for free writing). */
  target: string;
  /** Tracing coverage, 0–1. null when the mode has no guide to measure. */
  coverage: number | null;
  /** Share of ink on the guide, 0–1. null when there is no guide. */
  onGuide: number | null;
  /** Tolerance used for the measurement, in canvas units. */
  tolerance: number | null;
  /** True when both shares cleared their thresholds (tracing only). */
  completed: boolean;
  /** Optional child self-assessment: 1 tricky, 2 okay, 3 easy. */
  selfRating: 1 | 2 | 3 | null;
  /** Key of the saved PNG in IndexedDB, when the attempt was saved. */
  sampleId: string | null;
  /** Flag a teacher or parent set during review. */
  needsPractice: boolean;
};

export type GuideVisibility = 'full' | 'faint' | 'off';

export type Settings = {
  /** Multiplier on the on-screen letter size. */
  letterScale: number;
  /** Width of the drawn stroke in canvas units. */
  penWidth: number;
  penColor: string;
  highContrast: boolean;
  /** Hides decorative chrome and extra copy. */
  reducedDistractions: boolean;
  guideVisibility: GuideVisibility;
  showStartMarkers: boolean;
  showRuledLines: boolean;
  largeControls: boolean;
  speechEnabled: boolean;
  /** Tracing tolerance preset: easier presets accept wider strokes. */
  difficulty: 'easy' | 'medium' | 'precise';
};

export const DEFAULT_SETTINGS: Settings = {
  letterScale: 1,
  penWidth: 6,
  penColor: '#2f4858',
  highContrast: false,
  reducedDistractions: false,
  guideVisibility: 'full',
  showStartMarkers: true,
  showRuledLines: true,
  largeControls: false,
  speechEnabled: false,
  difficulty: 'easy',
};

/** Canvas-unit tolerance for each difficulty preset. */
export const DIFFICULTY_TOLERANCE: Record<Settings['difficulty'], number> = {
  easy: 22,
  medium: 15,
  precise: 10,
};

export type WritingSample = {
  id: string;
  createdAt: number;
  target: string;
  mode: ExerciseMode;
  /** PNG data URL of the flattened canvas. */
  dataUrl: string;
  width: number;
  height: number;
};
