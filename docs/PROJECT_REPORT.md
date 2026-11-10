# Project Report

**Smart Writing Pen & Digital Learning Pad for Children with Specific Learning Disabilities**

Course: Application Development · Project type: Major project · Team size: 3

---

## Table of contents

1. [Abstract](#1-abstract)
2. [Introduction](#2-introduction)
3. [Problem analysis](#3-problem-analysis)
4. [Proposed solution](#4-proposed-solution)
5. [Objectives](#5-objectives)
6. [Functional requirements](#6-functional-requirements)
7. [Non-functional requirements](#7-non-functional-requirements)
8. [System design](#8-system-design)
9. [Implementation](#9-implementation)
10. [Testing](#10-testing)
11. [Results](#11-results)
12. [Limitations](#12-limitations)
13. [Future scope](#13-future-scope)
14. [Conclusion](#14-conclusion)

---

## 1. Abstract

Children with specific learning difficulties that affect writing frequently struggle with letter
formation, stroke sequencing, spacing and alignment, and they often lack opportunities for
structured, independent practice with visible feedback. This project delivers **Smart Writing
Pad**, a browser-based digital writing pad and guided handwriting practice application.

The system provides a pressure-free writing surface that works identically with a mouse, a
touchscreen or a stylus; guided tracing exercises for the uppercase and lowercase alphabets, the
digits 0–9 and a set of short words, each with a start point, a direction arrow and a numbered
stroke order; four learning modes; a set of accessibility adaptations that persist between
sessions; and a progress and review facility for teachers and parents.

A key design commitment is **honesty about measurement**. The application does not perform
handwriting recognition and makes no clinical claim. When a child traces a letter, the system
reports two clearly-defined geometric quantities — how much of the printed guide received ink,
and how much of the ink stayed on the guide — and labels them as such. Modes in which no
meaningful measurement is possible record attempts without inventing a score.

The implementation comprises approximately 3,800 lines of TypeScript, React and CSS, validated by
145 automated unit tests and 58 end-to-end browser tests executed at both desktop and mobile
viewport sizes. All tests pass and the production build completes without errors.

## 2. Introduction

Handwriting remains central to primary education, but for a significant minority of children the
motor and sequencing demands of letter formation make it a persistent source of difficulty and
anxiety. Conventional remediation relies on printed worksheets, which are consumable, give no
feedback until an adult marks them, cannot be adapted in size or contrast for an individual
child, and leave no durable record of what was practised.

Touch-screen devices are now widespread in schools and homes, and the web platform exposes the
primitives needed to build a credible digital alternative: a Pointer Events model that unifies
mouse, touch and stylus input; a 2D canvas suitable for low-latency ink; client-side storage
sufficient for a practice history and saved work; and a speech synthesis API for spoken support.

This project asks whether those primitives can be assembled into something a teacher would
actually use: an application that is accessible by default, that adapts to the individual child,
that records practice truthfully, and that runs on whatever device is to hand without an account
or an internet connection.

## 3. Problem analysis

### 3.1 Difficulties the system addresses

| Difficulty | Consequence for the child | What the software can do |
| --- | --- | --- |
| Forming letters correctly | Letters are malformed or reversed | Show the letter as a path to follow, at an adjustable size |
| Knowing where a letter starts | The child freezes, or starts in the wrong place | A numbered start dot per stroke |
| Stroke sequence and direction | Letters built in an idiosyncratic order that does not scale to joined writing | Numbered strokes plus a direction arrow, generated from the same data as the path |
| Staying on the line | Writing drifts above or below the baseline | Ruled top, middle, base and descender lines on every sheet |
| Letter size and spacing | Inconsistent height; words run together | A shared design box fixes relative letter heights; word exercises lay letters out with fixed spacing |
| Practising independently | Practice only happens with an adult present | Self-contained exercises with immediate, explainable feedback |
| No visible progress | Effort feels invisible; motivation drops | A record of what was attempted, when, and what was covered |
| Visual stress and distraction | Attention is consumed by the interface | High-contrast mode, reduced-distraction mode, larger controls, adjustable guide visibility |

### 3.2 Limitations of existing approaches

- **Printed worksheets** cannot adapt, give no immediate feedback and leave no analysable record.
- **General drawing apps** have a canvas but no guides, no sequencing support and no progress.
- **Commercial tracing apps** often gamify heavily (adding distraction), require accounts and
  the collection of children's data, and frequently advertise "handwriting recognition" or
  improvement scores whose basis is undisclosed.

### 3.3 Requirements derived from the analysis

The system must adapt visually to the individual, work on any input device, make stroke order
explicit, remember practice without an account, keep children's data on the device, and be
scrupulous about the difference between what it measures and what it cannot.

## 4. Proposed solution

A single-page web application, local-first, with no backend:

1. **Interactive writing pad** — canvas drawing via Pointer Events with colour, thickness,
   eraser, undo/redo, clear, save and PNG download.
2. **Guided tracing** — a hand-authored single-line font storing each character as ordered
   strokes, yielding the trace path, start dots, arrows and stroke count from one source.
3. **Four modes** — free writing, tracing, independent practice, and progress review.
4. **Accessibility adaptations** — persisted settings for letter size, contrast, distraction
   reduction, guide visibility, control size, ruled lines and spoken instructions.
5. **Honest progress tracking** — attempt counts, session counts, per-character history, and the
   two geometric measures, with unmeasured modes explicitly labelled.
6. **Teacher/parent review** — saved samples, the full log, flags and exports.

**Explicit non-goals:** diagnosis or screening; handwriting recognition; any claim of
therapeutic or educational outcome; collection of personal data.

## 5. Objectives

| # | Objective | Status |
| --- | --- | --- |
| O1 | A writing surface usable with mouse, touch and stylus | Met |
| O2 | Guided tracing for A–Z, a–z, 0–9 and short words with stroke order | Met |
| O3 | Four distinct, working learning modes | Met |
| O4 | Accessibility settings that persist across sessions | Met |
| O5 | Progress tracking that survives reloads and reports only measured facts | Met |
| O6 | A review and export facility for teachers and parents | Met |
| O7 | A responsive interface usable on phone, tablet and desktop | Met |
| O8 | Automated tests covering the critical behaviours | Met (145 unit, 58 e2e) |
| O9 | No collection of children's personal data | Met |

## 6. Functional requirements

| ID | Requirement | Implemented in |
| --- | --- | --- |
| FR1 | Draw on a canvas with mouse, touch or stylus | `WritingCanvas` |
| FR2 | Choose from six pen colours | `Toolbar` |
| FR3 | Adjust pen thickness (2–24) | `Toolbar`, `SettingsPage` |
| FR4 | Erase individual strokes | `WritingCanvas` eraser tool |
| FR5 | Undo and redo | `WritingCanvas` history stacks |
| FR6 | Clear the sheet | `WritingCanvas.clear` |
| FR7 | Save a writing sample in the app | `samples.ts` (IndexedDB) |
| FR8 | Download the sheet as a PNG | `render.exportSheetPng`, `download.ts` |
| FR9 | Trace uppercase A–Z | `glyphs.ts`, `LetterTracing` |
| FR10 | Trace lowercase a–z | `glyphs.ts`, `LetterTracing` |
| FR11 | Trace digits 0–9 | `glyphs.ts`, `NumberPractice` |
| FR12 | Trace short words | `layoutWord`, `WordPractice` |
| FR13 | Show start point and direction per stroke | `GuideLayer.placeMarkers` |
| FR14 | Adjustable tracing difficulty | `DIFFICULTY_TOLERANCE`, settings |
| FR15 | Free-writing mode | `WritingPad` |
| FR16 | Practice mode with a reference and no guide | `PracticeMode` |
| FR17 | Progress mode showing history | `Progress` |
| FR18 | Adjustable letter size | `layoutSheet`, settings |
| FR19 | High-contrast mode | CSS tokens under `data-contrast` |
| FR20 | Reduced-distraction mode | CSS under `data-calm` |
| FR21 | Adjustable guide visibility | `GuideLayer`, settings |
| FR22 | Larger interactive controls | CSS under `data-large-controls` |
| FR23 | Optional ruled-line overlays | `GuideLayer`, `WritingPad` |
| FR24 | Optional spoken instructions | `speech.ts` |
| FR25 | Settings persist across sessions | `storage.ts` + `AppProvider` |
| FR26 | Dashboard of attempts, completions, sessions, samples | `stats.ts`, `Progress` |
| FR27 | Recent activity over 14 days | `stats.dailyActivity` |
| FR28 | Progress persists across reloads | localStorage attempt log |
| FR29 | Review saved samples | `Review` |
| FR30 | Identify characters needing more practice | `stats.needsMorePractice` |
| FR31 | Export a progress summary and full log | `attemptsToCsv`, `Review` |
| FR32 | Anonymous local profile | Optional device nickname |

## 7. Non-functional requirements

| ID | Requirement | How it is met |
| --- | --- | --- |
| NFR1 | **Accessibility** — usable with keyboard and assistive technology | Semantic landmarks, skip link, labelled controls, `aria-live` results, `role="meter"` on measures, visible focus rings, `prefers-reduced-motion` honoured |
| NFR2 | **Responsiveness** — phone to desktop | Fluid layout; sheets capped at 58vh; verified by e2e tests at 393 px and 1280 px with no horizontal overflow |
| NFR3 | **Performance** — ink must feel immediate | Pointer data in refs, not React state; coalesced events; DPR-aware canvas; 104 kB gzipped JS |
| NFR4 | **Reliability** — never lose a child's work silently | Write-through persistence, validated reads, storage-failure banner, error boundary |
| NFR5 | **Privacy** — no children's data leaves the device | No backend, no account, no analytics, no network calls at runtime; one optional device nickname |
| NFR6 | **Portability** — runs on any static host | Static build, relative asset base, hash routing |
| NFR7 | **Maintainability** | Pure logic isolated in `lib/`, typed throughout, 145 unit tests |
| NFR8 | **Honesty** — no fabricated metrics | Only measured quantities reported; unmeasured modes labelled; disclaimer on every screen |

## 8. System design

### 8.1 Layered design

```
Pages  ──▶  Components  ──▶  Pure library (lib/)
                │                  │
                ▼                  ▼
          AppProvider        localStorage / IndexedDB / Canvas / Speech
```

### 8.2 Data model

```ts
Attempt  { id, createdAt, mode, kind, target,
           coverage|null, onGuide|null, tolerance|null,
           completed, selfRating|null, sampleId|null, needsPractice }

Settings { letterScale, penWidth, penColor, highContrast,
           reducedDistractions, guideVisibility, showStartMarkers,
           showRuledLines, largeControls, speechEnabled, difficulty }

WritingSample { id, createdAt, target, mode, dataUrl, width, height }
```

`coverage` and `onGuide` are nullable on purpose: `null` means *not measured*, which is a
different statement from zero, and the dashboards keep the two apart.

### 8.3 Coordinate design

Glyphs live in an 80 × 160 design box with writing lines at y = 10 (cap top), 60 (x-height),
110 (baseline) and 145 (descender). `layoutSheet` maps that box onto the sheet and reports the
transformed line positions; `placeStrokes` moves the strokes. The guide, the ruled paper, the pen
and the scoring tolerance all derive from that single transform.

### 8.4 Screen flow

```
Home ──┬─▶ Writing Pad ───────────────┐
       ├─▶ Letters ─┐                 │
       ├─▶ Numbers  ├─▶ trace ─▶ check├─▶ attempt recorded ─┬─▶ Progress
       ├─▶ Words  ──┘                 │                     └─▶ Review ─▶ export
       ├─▶ Practice ─▶ write ─▶ rate ─┘
       └─▶ Settings (affects every screen)
```

## 9. Implementation

### 9.1 Technology

React 19, TypeScript, Vite 8, Tailwind CSS 4, HTML Canvas 2D, Pointer Events, localStorage,
IndexedDB, Web Speech API, Vitest, Playwright. No backend and no runtime third-party services.

### 9.2 The letterform data

Characters are built from three primitives — `line`, `arc` (with angles in screen space so
direction is explicit) and `poly` — assembled into ordered strokes in conventional teaching
order. For example `T` is the top bar followed by the stem; `5` is the stem, then the bowl, then
the hat, so that every stroke runs top-to-bottom or left-to-right.

Because the data is ordered, the renderer derives the start dot and the direction arrow from the
same array that produces the path. It is impossible for the arrow to point the wrong way relative
to the path a child is asked to trace.

### 9.3 Measurement algorithm

```
resample guide and ink to 4-unit spacing
coverage = |{g ∈ guide : dist(g, ink) ≤ τ}| / |guide|
onGuide  = |{i ∈ ink   : dist(i, guide) ≤ τ}| / |ink|
complete = coverage ≥ 0.75 ∧ onGuide ≥ 0.60
τ = difficulty tolerance × layout scale
```

Resampling removes the dependence on drawing speed. Requiring both conditions defeats the two
obvious degenerate strategies, and the unit tests assert exactly those cases.

### 9.4 Notable implementation problems and their resolutions

1. **Stroke markers collided.** On letters whose strokes share a start point (A, g, 5), marker
   "1" was drawn underneath marker "2" and the stroke order was unreadable. Resolved by offsetting
   each marker backwards along its own stroke direction and then running a short relaxation pass
   that pushes any remaining overlapping pair apart. A unit test now asserts a minimum separation
   for all 62 characters.
2. **Glyphs overshot their writing lines.** Tests comparing every glyph's bounds against the
   baseline and descender caught `g`, `j`, `s` and `u` descending too far. The arcs were corrected.
3. **The sheet grew taller than the viewport.** At desktop width, a single-letter sheet rendered
   roughly 730 px tall, so pressing a control scrolled the pad off-screen. Found while debugging an
   end-to-end failure; resolved by capping sheet height at 58vh.
4. **A nine-column review table was unusable on a phone.** The flag checkbox could not be reached
   at 393 px. Secondary columns are now hidden below the `md` breakpoint; full detail remains in
   the CSV export.
5. **A sticky page header swallowed ink.** The page header was pinned to the top of the viewport,
   so whenever the writing sheet scrolled underneath it, pointer events for strokes drawn across
   that band were delivered to the header rather than the canvas and the ink never appeared. The
   signature was a tracing that scored 51% coverage but 100% on-guide: every mark was on the
   letter, yet half the letter had no ink. The header is no longer sticky, and an end-to-end test
   now traces a letter with the sheet scrolled flush to the top of the viewport.
6. **Drawing speed skewed early scores.** Raw pointer samples made slow strokes score differently
   from fast ones; resampling both sides to fixed spacing removed the effect, and a test now pins it.

## 10. Testing

### 10.1 Strategy

Pure logic is unit tested in Node (fast, exhaustive, covering every glyph and every storage edge
case). Behaviour that only exists in a browser — real pointer input, persistence across reloads,
downloads, layout — is tested end-to-end in Chromium at two viewport sizes.

The end-to-end tests read the guide paths out of the rendered SVG and trace them with the mouse,
so they exercise the same path a child follows and no layout maths is duplicated in the tests.

### 10.2 Unit tests — 145 across 8 files

| File | Tests | Covers |
| --- | --- | --- |
| `geometry.test.ts` | 14 | Line/arc sampling, screen-space angles, resampling, point-to-segment distance, bounds, headings, path data |
| `glyphs.test.ts` | 72 | All 62 characters: stroke counts, direction, bounds inside the design box, correct placement against cap/baseline/descender lines, hints present, word layout |
| `scoring.test.ts` | 11 | Perfect trace, empty canvas, off-target ink, tolerance boundary, partial trace, scribble rejection, speed independence, real glyph data |
| `layout.test.ts` | 6 | Centring, line ordering, letter-size scaling, clamping at extreme sizes, word fitting |
| `stats.test.ts` | 18 | Session grouping, daily activity, summaries, per-target rollup, revisit list, CSV export |
| `storage.test.ts` | 15 | Defaults, round-trip, corrupted data, value sanitising, log cap, malformed records, clearing, id uniqueness |
| `samples.test.ts` | 6 | IndexedDB store/read/list/delete, pruning cap, replacement |
| `GuideLayer.test.ts` | 4 | Marker separation on all 62 characters, placement and heading |

### 10.3 End-to-end tests — 29 scenarios × 2 viewports = 58

| Area | Checks |
| --- | --- |
| Navigation | All nine screens reachable; dashboard cards; unknown route fallback; no dead links |
| Writing pad | Draw, undo, redo, clear, erase; colour/thickness persisted across reload; save; PNG download |
| Tracing | Guard against empty submission; full trace meets both thresholds; scribble fails the on-guide measure; progress survives reload; picker marks completed letters; guide fade/hide; next/back; letters, numbers and words all render guides |
| Practice mode | No guide present; reference shown; attempt recorded as unmeasured with a self-rating |
| Accessibility | Settings applied to `<html>` and persisted; reduced distractions; markers and ruled lines toggled; skip link; every sheet has an accessible name |
| Review | Samples listed; flagging persists; summary and CSV exports; deleting all data clears progress and samples |
| Responsive | No horizontal overflow on any screen; sheet fits the viewport and is traceable; controls ≥ 40 px tall |

### 10.4 Results of the latest run

```
Unit tests:  8 files, 145 passed, 0 failed
E2E tests:   58 passed, 0 failed  (desktop 1280×720, Pixel 5 393×851)
Type check:  no errors
Production build: succeeded (336 kB JS, 104 kB gzipped; 25 kB CSS, 6 kB gzipped)
```

Defects found by the test suite during development and fixed: glyph descender overshoots (4
characters), colliding stroke markers, sheet exceeding viewport height, unusable review table on
mobile, a sticky header that swallowed pointer events over the writing sheet, and speed-dependent
scoring.

## 11. Results

The delivered application meets all P0 and P1 requirements set for the project:

- A functional writing canvas supporting mouse, touch and stylus, with the full control set.
- Guided tracing for 62 characters and 16 words, each with stroke order and direction.
- Four working learning modes.
- Eleven accessibility settings, persisted and applied globally.
- A progress dashboard and a teacher/parent review screen with working exports.
- A responsive interface verified at phone and desktop sizes.
- A production build and a repository ready for submission.

Measured engineering outcomes: 145 unit tests and 58 end-to-end tests passing; a clean type
check; a 104 kB gzipped bundle; no console errors on any screen (asserted by tests).

The project makes no claim about educational outcomes. No trial with children was conducted, and
none is reported.

## 12. Limitations

1. **Coverage is not recognition.** Correct-looking coverage can be achieved with the wrong
   stroke order or with many short strokes. Stroke order is taught and shown but not verified.
2. **Practice and free writing are unmeasured** by design, and appear only as counts.
3. **One print style only** — no cursive, joined writing or regional letterform variants.
4. **Device-local storage** — no sync, no multi-child profiles, and clearing site data erases
   everything. Caps of 60 samples and 500 attempts apply.
5. **Speech depends on the browser**; the option is hidden where the API is absent.
6. **Verified in Chromium only**, at two viewport sizes. Other engines are expected to work but
   were not tested.
7. **No hardware was built.** The pen and pad described in the problem statement are addressed in
   software; a hardware path is proposed but not implemented.
8. **No user study.** Usability with the target group has not been evaluated.

## 13. Future scope

- Stroke-order and direction verification, with feedback naming the specific stroke
- Multiple child profiles per device with import/export
- Cursive and joined-writing guides; alternative letterforms
- A handwriting-quality measure developed and validated with special educators
- An optional classroom backend for syncing and teacher dashboards
- Stylus pressure and tilt where exposed by the hardware
- Offline installation as a Progressive Web App
- Hardware integration along the lines set out in `HARDWARE_EXTENSION.md`
- A usability study with children, teachers and occupational therapists

## 14. Conclusion

The project set out to turn a problem statement about a writing pen and pad for children with
specific learning disabilities into a working, demonstrable application. The result is a
local-first web application that provides a genuine writing surface, structured tracing
exercises with explicit stroke order, a substantial set of accessibility adaptations, and a
truthful record of practice — backed by 203 automated tests and a clean production build.

The decision that shaped the project most was choosing to measure less. It would have been
straightforward to display a single "accuracy" percentage and call it handwriting assessment.
Instead the system reports two transparent geometric quantities, states their limits wherever
they appear, and records "not measured" where nothing meaningful can be measured. For software
intended for vulnerable learners, that restraint is a feature, and it is what makes the numbers
the application does show worth trusting.
