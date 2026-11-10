import { useMemo, useState } from 'react';

import { PEN_COLORS } from '../components/Toolbar';
import { glyphFor } from '../lib/glyphs';
import { layoutSheet, placeStrokes } from '../lib/layout';
import { clearSamples } from '../lib/samples';
import { speak, speechSupported } from '../lib/speech';
import { clearAllLocalData } from '../lib/storage';
import { useApp } from '../state/AppProvider';

export function SettingsPage() {
  const { settings, updateSettings, resetSettings, clearAttempts, setProfileName } = useApp();
  const [confirmingClear, setConfirmingClear] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const canSpeak = useMemo(() => speechSupported(), []);

  const wipeEverything = async () => {
    await clearSamples();
    clearAttempts();
    setProfileName('');
    clearAllLocalData();
    resetSettings();
    setConfirmingClear(false);
    setNotice('All locally stored settings, progress and writing samples have been deleted.');
  };

  return (
    <div className="space-y-6">
      <header className="space-y-2">
        <h1 className="text-2xl font-bold">Accessibility settings</h1>
        <p className="max-w-3xl text-[var(--color-ink-soft)]">
          These options change how the writing area looks and feels. They are saved on this device and apply
          to every exercise.
        </p>
      </header>

      <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_20rem]">
        <div className="space-y-5">
          <section className="card space-y-4 p-5">
            <h2 className="text-lg font-bold">Size and spacing</h2>

            <div>
              <label htmlFor="letter-scale" className="block font-bold">
                Letter size
              </label>
              <p className="text-sm text-[var(--color-ink-soft)]">
                Larger letters are easier to follow but leave less room on the sheet.
              </p>
              <div className="mt-2 flex items-center gap-3">
                <input
                  id="letter-scale"
                  type="range"
                  min={0.6}
                  max={1.8}
                  step={0.1}
                  value={settings.letterScale}
                  onChange={(event) => updateSettings({ letterScale: Number(event.target.value) })}
                  className="h-2 flex-1 accent-[var(--color-brand)]"
                />
                <span className="w-14 text-right tabular-nums">{settings.letterScale.toFixed(1)}×</span>
              </div>
            </div>

            <div>
              <label htmlFor="pen-width-setting" className="block font-bold">
                Default pen thickness
              </label>
              <div className="mt-2 flex items-center gap-3">
                <input
                  id="pen-width-setting"
                  type="range"
                  min={2}
                  max={24}
                  step={1}
                  value={settings.penWidth}
                  onChange={(event) => updateSettings({ penWidth: Number(event.target.value) })}
                  className="h-2 flex-1 accent-[var(--color-brand)]"
                />
                <span className="w-14 text-right tabular-nums">{settings.penWidth}</span>
              </div>
            </div>

            <fieldset className="border-0 p-0">
              <legend className="font-bold">Default pen colour</legend>
              <div className="mt-2 flex flex-wrap gap-2">
                {PEN_COLORS.map((color) => (
                  <button
                    key={color.value}
                    type="button"
                    aria-label={color.label}
                    aria-pressed={settings.penColor.toLowerCase() === color.value}
                    onClick={() => updateSettings({ penColor: color.value })}
                    className="h-11 w-11 rounded-full border-2"
                    style={{
                      backgroundColor: color.value,
                      borderColor:
                        settings.penColor.toLowerCase() === color.value
                          ? 'var(--color-accent)'
                          : 'var(--color-line)',
                    }}
                  />
                ))}
              </div>
            </fieldset>
          </section>

          <section className="card space-y-4 p-5">
            <h2 className="text-lg font-bold">Guides and distractions</h2>

            <div>
              <label htmlFor="guide-visibility-setting" className="block font-bold">
                Guide letter visibility
              </label>
              <select
                id="guide-visibility-setting"
                className="mt-2 w-full max-w-sm rounded-xl border border-[var(--color-line)] bg-white px-3 py-2"
                value={settings.guideVisibility}
                onChange={(event) =>
                  updateSettings({ guideVisibility: event.target.value as typeof settings.guideVisibility })
                }
              >
                <option value="full">Clear — easiest to follow</option>
                <option value="faint">Faded — a gentle reminder</option>
                <option value="off">Hidden — write without a path</option>
              </select>
            </div>

            <div>
              <label htmlFor="difficulty-setting" className="block font-bold">
                Tracing difficulty
              </label>
              <p className="text-sm text-[var(--color-ink-soft)]">
                How close to the printed shape the ink has to stay to be counted.
              </p>
              <select
                id="difficulty-setting"
                className="mt-2 w-full max-w-sm rounded-xl border border-[var(--color-line)] bg-white px-3 py-2"
                value={settings.difficulty}
                onChange={(event) =>
                  updateSettings({ difficulty: event.target.value as typeof settings.difficulty })
                }
              >
                <option value="easy">Easy — a wide path counts</option>
                <option value="medium">Medium</option>
                <option value="precise">Precise — stay on the line</option>
              </select>
            </div>

            <Toggle
              id="show-ruled-lines"
              label="Show ruled writing lines"
              description="Top line, dashed middle line, baseline and descender line."
              checked={settings.showRuledLines}
              onChange={(showRuledLines) => updateSettings({ showRuledLines })}
            />
            <Toggle
              id="show-start-markers"
              label="Show start dots and arrows"
              description="Numbered dots show where each stroke begins and which way it goes."
              checked={settings.showStartMarkers}
              onChange={(showStartMarkers) => updateSettings({ showStartMarkers })}
            />
            <Toggle
              id="reduced-distractions"
              label="Reduce visual distractions"
              description="Hides decorative text and extra icons, leaving the exercise itself."
              checked={settings.reducedDistractions}
              onChange={(reducedDistractions) => updateSettings({ reducedDistractions })}
            />
            <Toggle
              id="high-contrast"
              label="High contrast"
              description="Black on white with stronger borders."
              checked={settings.highContrast}
              onChange={(highContrast) => updateSettings({ highContrast })}
            />
            <Toggle
              id="large-controls"
              label="Larger buttons"
              description="Bigger tap targets for less precise hand control."
              checked={settings.largeControls}
              onChange={(largeControls) => updateSettings({ largeControls })}
            />
          </section>

          <section className="card space-y-3 p-5">
            <h2 className="text-lg font-bold">Spoken instructions</h2>
            {canSpeak ? (
              <>
                <Toggle
                  id="speech-enabled"
                  label="Read instructions aloud"
                  description="Uses the voice built into this browser. Nothing is sent anywhere."
                  checked={settings.speechEnabled}
                  onChange={(speechEnabled) => updateSettings({ speechEnabled })}
                />
                <button
                  type="button"
                  className="btn"
                  onClick={() => speak('Start on the orange dot and follow the arrow.', true)}
                >
                  🔊 Test the voice
                </button>
              </>
            ) : (
              <p className="text-sm text-[var(--color-ink-soft)]">
                This browser does not provide the Web Speech API, so spoken instructions are unavailable here.
                Everything else works normally.
              </p>
            )}
          </section>

          <section className="card space-y-3 p-5">
            <h2 className="text-lg font-bold">Stored data</h2>
            <p className="text-sm text-[var(--color-ink-soft)]">
              Settings and the practice log are kept in this browser&apos;s local storage; writing samples are
              kept in its IndexedDB database. Nothing is uploaded, and there is no account. Clearing the data
              below cannot be undone.
            </p>
            <div className="flex flex-wrap gap-3">
              <button type="button" className="btn" onClick={resetSettings}>
                Reset settings to defaults
              </button>
              {confirmingClear ? (
                <>
                  <button type="button" className="btn btn-primary" onClick={() => void wipeEverything()}>
                    Yes, delete everything
                  </button>
                  <button type="button" className="btn" onClick={() => setConfirmingClear(false)}>
                    Cancel
                  </button>
                </>
              ) : (
                <button type="button" className="btn" onClick={() => setConfirmingClear(true)}>
                  Delete all data on this device
                </button>
              )}
            </div>
            {notice && (
              <p role="status" className="text-sm font-bold text-[var(--color-brand-dark)]">
                {notice}
              </p>
            )}
          </section>
        </div>

        <aside className="lg:sticky lg:top-40 lg:self-start">
          <div className="card p-4">
            <h2 className="text-base font-bold">Preview</h2>
            <p className="mt-1 text-sm text-[var(--color-ink-soft)]">
              The letter ‘a’ with your current settings.
            </p>
            <SettingsPreview />
          </div>
        </aside>
      </div>
    </div>
  );
}

/** Live preview so an adult can see the effect of each option immediately. */
function SettingsPreview() {
  const { settings } = useApp();
  const glyph = glyphFor('a');
  const layout = layoutSheet({ width: 280, height: 300 }, 80, settings.letterScale, 16);
  const placed = placeStrokes(glyph?.strokes ?? [], layout);
  const guideOpacity = settings.guideVisibility === 'full' ? 0.85 : settings.guideVisibility === 'faint' ? 0.35 : 0;

  return (
    <div className="mt-3 overflow-hidden rounded-xl border border-[var(--color-line)] bg-white">
      <svg viewBox={`0 0 ${layout.sheet.width} ${layout.sheet.height}`} className="h-auto w-full" role="img" aria-label="Preview of the letter a with the current settings">
        {settings.showRuledLines && (
          <g stroke="var(--color-line)" strokeWidth={1.5}>
            <line x1={0} y1={layout.lines.capTop} x2={layout.sheet.width} y2={layout.lines.capTop} />
            <line
              x1={0}
              y1={layout.lines.xTop}
              x2={layout.sheet.width}
              y2={layout.lines.xTop}
              strokeDasharray="8 10"
            />
            <line
              x1={0}
              y1={layout.lines.baseline}
              x2={layout.sheet.width}
              y2={layout.lines.baseline}
              stroke="var(--color-brand)"
              strokeWidth={2.5}
            />
          </g>
        )}
        <g
          fill="none"
          stroke="var(--color-brand)"
          strokeOpacity={guideOpacity}
          strokeWidth={Math.max(2, 7 * layout.scale)}
          strokeLinecap="round"
        >
          {placed.map((stroke, index) => (
            <path
              key={index}
              d={stroke.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x.toFixed(1)} ${p.y.toFixed(1)}`).join(' ')}
            />
          ))}
        </g>
        {settings.showStartMarkers &&
          guideOpacity > 0 &&
          placed.map((stroke, index) => {
            const start = stroke[0];
            if (!start) return null;
            return <circle key={index} cx={start.x} cy={start.y} r={Math.max(6, 9 * layout.scale)} fill="var(--color-accent)" />;
          })}
      </svg>
    </div>
  );
}

function Toggle({
  id,
  label,
  description,
  checked,
  onChange,
}: {
  id: string;
  label: string;
  description: string;
  checked: boolean;
  onChange: (value: boolean) => void;
}) {
  return (
    <div className="flex items-start gap-3">
      <input
        id={id}
        type="checkbox"
        checked={checked}
        onChange={(event) => onChange(event.target.checked)}
        className="mt-1 h-6 w-6 shrink-0 accent-[var(--color-brand)]"
      />
      <label htmlFor={id}>
        <span className="block font-bold">{label}</span>
        <span className="block text-sm text-[var(--color-ink-soft)]">{description}</span>
      </label>
    </div>
  );
}
