# Architecture

How Smart Writing Pad is put together, and why.

---

## 1. Shape of the system

The application is a single-page React app that runs entirely in the browser. There are three
layers, and the dependency arrows only ever point downwards:

```
┌──────────────────────────────────────────────────────────────┐
│  pages/      Dashboard · WritingPad · LetterTracing ·        │
│              NumberPractice · WordPractice · PracticeMode ·  │
│              Progress · Review · SettingsPage                │
├──────────────────────────────────────────────────────────────┤
│  components/ Layout · GuidedExercise · WritingSheet ·        │
│              WritingCanvas · GuideLayer · Toolbar ·          │
│              ItemPicker · ScoreReadout · ErrorBoundary       │
│  state/      AppProvider (settings + attempt log)            │
├──────────────────────────────────────────────────────────────┤
│  lib/        geometry · glyphs · layout · scoring · render ·  │
│              stats · storage · samples · speech · download   │
└──────────────────────────────────────────────────────────────┘
```

`lib/` contains no React and touches the DOM only where it must (canvas rendering, storage,
speech, downloads). That is what makes the interesting parts — the letterforms, the fitting
maths, the coverage measurement, the statistics — testable in Node without a browser.

## 2. Component architecture

### `WritingCanvas`
The writing surface, and the only component that handles pointer input.

- Input comes through **Pointer Events** (`onPointerDown/Move/Up/Cancel/Leave`), so a mouse, a
  finger and a stylus all take exactly the same path. There is no touch-specific branch.
- `getCoalescedEvents()` is used when available, recovering the input samples the browser batched
  between animation frames. This matters for fast strokes and high-report-rate styluses.
- The pointer is captured on pointer-down so a stroke continues correctly if the pen leaves the
  element, and a second finger mid-stroke is ignored.
- Strokes are stored **in sheet units, not pixels**. A stroke is `{ id, color, width, points[] }`.
  Because the geometry is resolution-independent, resizing the window or switching device never
  changes the drawing, and the scorer can compare ink against the guide directly.
- Ink lives in **refs**, not state, so a pointer move never waits on a React render; a counter is
  bumped to schedule the repaint and notify the parent.
- The canvas backing store is sized to `clientWidth × devicePixelRatio` (capped at 3) and the
  context is scaled so all drawing code works in sheet units. A `ResizeObserver` repaints on
  layout changes.
- Imperative API via `useImperativeHandle`: `undo`, `redo`, `clear`, `getInk`, `exportPng`.

### `GuideLayer`
An inline SVG *behind* the canvas holding the ruled lines, the letter to trace, and the numbered
start markers. Keeping it out of the canvas means the guide is crisp at any size, can never be
erased, and the child's ink is always separable from it.

Start markers are derived from the stroke data: the dot is the first point pulled back along the
stroke's own direction, and the arrow is its heading. Strokes that begin at the same place — A's
two diagonals, g's bowl and stem — would overlap, so a short relaxation pass pushes any pair
closer than `2.2 × radius` apart until they are readable.

### `WritingSheet`
Stacks `GuideLayer` and `WritingCanvas` in one aspect-ratio box and caps the box height at
`58vh`, so the sheet and its toolbar fit on one screen. (Before that cap, clicking a control
scrolled the pad off-screen — found by the end-to-end tests.)

### `GuidedExercise`
The shared implementation behind Letters, Numbers, Words and Practice. It owns the current
target, builds the guide for it, runs the measurement, records attempts, and saves or downloads
samples. The four pages differ only in the item list, the mode and a header control, which is why
there is one implementation instead of four.

Changing target remounts the sheet via a React `key`. That gives the next exercise a clean canvas
and an empty undo history without a special "reset" path — the previous letter's ink can never
leak into the next attempt.

## 3. State management

There is no state library. The application has exactly two pieces of shared state, both in
`AppProvider` (React context):

- **`settings`** — accessibility and pen preferences.
- **`attempts`** — the practice log.

Both are *write-through*: every update sets React state and writes to localStorage in the same
call, so a crash or a closed tab cannot leave the two out of step. If a write fails (private
browsing, full quota) the provider sets `storageBlocked` and the layout shows a banner rather
than silently losing the child's work.

Accessibility preferences are published as data attributes on `<html>` (`data-contrast`,
`data-calm`, `data-large-controls`) so plain CSS can react to them. No component needs to know
that high-contrast mode exists.

Everything else is local component state. Per-exercise things (current letter, current tool,
last score) deliberately do not outlive the screen.

## 4. Canvas implementation

**Coordinate systems.** Glyphs are authored in an 80 × 160 *design box* with fixed writing lines
(cap top 10, x-height top 60, baseline 110, descender 145). A *sheet* is the exercise's drawing
area in its own units. `layout.ts` computes the scale and offset that centre the design box on
the sheet, and reports where the ruled lines land. Everything downstream — the guide, the ruled
paper, the pen width, the scoring tolerance — uses that one transform, so they cannot drift apart.

**The letterforms.** `glyphs.ts` is a hand-authored single-line font: every character is an
ordered list of polylines built from `line`, `arc` and `poly` helpers, following common
print-handwriting teaching order. Because the data is ordered rather than an outline, one source
yields the trace path, the start dot, the direction arrow, the stroke count and the sequence.
A font file could not do this — outlines have no stroke order.

**Drawing.** Strokes are painted as quadratic curves through the midpoints of consecutive
points, which smooths pointer jitter without moving the line off the samples. A single tap draws
a dot. The eraser removes whole strokes within a radius rather than painting white, which keeps
erasing undoable and keeps saved PNGs clean.

**Undo/redo.** Full snapshots of the stroke array on a `past`/`future` pair of stacks, capped at
60 entries. Snapshots of a few hundred small objects are cheap, and the alternative (a command
log) would add complexity for no user-visible gain.

**Export.** `exportSheetPng` renders to an offscreen canvas at 2× with the same drawing
functions, optionally compositing the guide underneath, and returns a PNG data URL.

## 5. Tracing measurement

`scoring.ts` implements the only "evaluation" in the product, and keeps it modest on purpose.

1. Resample the guide polylines and the ink polylines to a fixed spacing (4 units). This is what
   makes the result independent of drawing speed — a slow drag produces far more raw pointer
   samples than a quick one.
2. `coverage` = share of guide sample points within `tolerance` of any ink segment.
3. `onGuide` = share of ink sample points within `tolerance` of any guide segment.
4. An attempt is complete when `coverage ≥ 0.75` **and** `onGuide ≥ 0.60`.

Needing both is the point. Coverage alone would reward scribbling over the whole sheet;
`onGuide` alone would reward one careful short mark. A unit test asserts exactly that: a dense
zig-zag across the sheet scores > 0.9 coverage but < 0.3 on-guide and fails.

Tolerance comes from the difficulty setting in design units (easy 22, medium 15, precise 10),
multiplied by the layout scale so it means the same thing on a phone and on a monitor.

This is geometric overlap and nothing more. The app does not identify which character was
written and makes no claim about handwriting quality — the UI states this wherever a number is
shown.

## 6. Data persistence

| Data | Store | Key / store name | Why |
| --- | --- | --- | --- |
| Settings | localStorage | `swp.v1.settings` | Tiny, needed synchronously on first paint |
| Attempt log | localStorage | `swp.v1.attempts` | Small JSON; capped at 500 records |
| Device nickname | localStorage | `swp.v1.profile` | One short string |
| Writing samples | IndexedDB | `smart-writing-pad` / `samples` | PNG data URLs are far too big for localStorage |

Both layers are defensive by default:

- Every localStorage read is wrapped in `try/catch` (it throws in some privacy modes) and every
  parsed value is validated. `sanitizeSettings` keeps only known keys with values of the right
  type and range, so a corrupted or hand-edited entry degrades to defaults instead of crashing.
- Non-conforming entries in the attempt array are dropped individually rather than discarding
  the whole log.
- IndexedDB helpers *resolve* rather than reject when the database is unavailable, so practice
  still works when a picture cannot be saved; the UI says so.
- Samples are pruned to the newest 60 on every write, keeping the database inside browser quotas.

Nothing is uploaded, there is no account, and the only free-text field is an optional device
nickname whose helper text asks users not to enter a child's real name.

## 7. Technical decisions

| Decision | Alternatives considered | Why this one |
| --- | --- | --- |
| **Local-first, no backend** | Node/Express + database | Nothing in the MVP needs a server. A backend would add auth, hosting and a privacy burden around children's data for zero added capability. |
| **Hand-authored stroke font** | A real font file; SVG letter outlines | Outlines have no stroke order. Ordered polylines give the trace path, start dots, arrows and sequence from one source, and are directly comparable to the child's ink. |
| **Guide in SVG, ink on canvas** | Everything on canvas | The guide stays crisp at any size, cannot be erased, and ink stays separable for scoring and export. |
| **Coverage + on-guide, two numbers** | A single "accuracy %"; ML recognition | Two plainly-defined geometric measures can be explained and tested. A single score, or a recognition claim, would imply an assessment the app cannot honestly make. |
| **Sheet units, not pixels** | Pixel coordinates | Makes drawings resolution-independent and lets scoring compare ink to the guide with no conversion. |
| **Hash routing** | Browser history routing | The build is static files that must work on Vercel, Netlify, GitHub Pages and from `file://` with no server rewrite rules. |
| **Snapshot undo** | Command/inverse-operation log | Snapshots of small objects are cheap and far harder to get subtly wrong. |
| **Tailwind + CSS variables** | CSS modules; a component library | Theme tokens redefined under `data-contrast="high"` give a real high-contrast mode without a parallel stylesheet. |
| **Atkinson Hyperlegible** | System font stack | Designed for maximum character distinction — directly relevant for children who confuse b/d/p/q. |
| **Vitest + Playwright** | Jest; manual testing only | Pure logic is tested in milliseconds; the browser suite catches what unit tests cannot, such as the sheet growing taller than the viewport. |

## 8. Error handling

- A top-level `ErrorBoundary` catches render errors and offers a way back, so a child is never
  left on a blank page.
- Storage failures surface as a banner instead of silent data loss.
- Every canvas action that cannot proceed explains why ("Trace over the letter first…",
  "There is nothing on the sheet to save yet.") rather than doing nothing.
- `exportPng` returns `null` if a 2D context cannot be created, and callers report it.
- Empty states on Progress and Review explain how to produce data, instead of showing fake rows.
