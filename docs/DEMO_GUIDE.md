# Demo Guide

How to show Smart Writing Pad to evaluators, and how to answer what they are likely to ask.

---

## Before you start

```bash
npm install
npm run build
npm run preview      # http://localhost:4173
```

`npm run dev` works too. Use the production preview for a demo — it starts instantly and cannot
show a build error mid-presentation.

**Five-minute checklist**

- [ ] `npm test` and `npm run test:e2e` run green, so you can say so from evidence.
- [ ] Open the app and go to **Settings → Delete all data on this device**, so you demo from a
      genuine empty state (and the empty states themselves are worth showing).
- [ ] Have a stylus or touchscreen ready if you have one; a mouse is fine.
- [ ] Open a second tab on the GitHub repository.
- [ ] Zoom the browser to ~110% so the room can see the strokes.

---

## The 8-minute demonstration

### 1. Frame the problem (45 s)

> "The problem statement asks for a writing pen and pad for children with specific learning
> disabilities. We built the software half: a digital writing pad with guided handwriting
> practice. It runs entirely in the browser, stores nothing on a server, and — importantly —
> it does not claim to diagnose anything or to grade handwriting."

Point out the disclaimer in the footer. Saying this *first* pre-empts the hardest question.

### 2. Home (30 s)

Show the empty state: "No practice recorded on this device yet." Say that nothing here is seeded
demo data — every number appears only after real use.

### 3. Writing pad (1 min)

Write something freehand. While writing, mention:

- Input goes through **Pointer Events**, so mouse, finger and stylus all take one code path.
- Change colour and thickness; **undo**, **redo**, **erase** one stroke, **clear**.
- Press **Download as image** and show the PNG that lands in Downloads.

### 4. Letter tracing — the core (2 min)

Go to **Letters** and pick **A**.

- Point at the **orange numbered dots and arrows**: "stroke order and direction come from the
  same data as the path, so they can't contradict it."
- Trace it, deliberately well, and press **Check my tracing**.
- Read the two numbers aloud and explain them in one sentence each: how much of the shape got
  ink, and how much of the ink stayed on the shape.

**Then do the honest demo that makes the project stand out:** press Clear and scribble messily
all over the sheet, then Check again.

> "Coverage is high — I did cover the letter. But only a small share of my ink stayed on it, so
> the exercise is not passed. Two measures, not one, is exactly why you can't cheat it."

- Change **Guide letter** to *Faded*, then *Hidden*, to show difficulty progression.

### 5. Numbers and words (45 s)

**Numbers → 5**: three strokes, all top-to-bottom or left-to-right, as taught.
**Words → milk**: point to the ruled lines showing letter height and spacing — the two things
the problem statement calls out.

### 6. Practice mode (45 s)

> "Here the child reproduces the letter with no path to follow. We record that they practised
> and let them say how it felt, but we deliberately do **not** score it — they choose where on
> the page to write, so there is nothing honest to measure against."

Write an `a`, tap **🙂 Okay**.

### 7. Accessibility (1 min)

Go to **Settings** and toggle live, showing the preview panel change:

- **Letter size** slider
- **High contrast**
- **Larger buttons**
- **Reduce visual distractions**

Then **reload the page** to prove the settings persist. Mention Atkinson Hyperlegible: a typeface
designed for maximum character distinction, relevant for children who confuse b/d/p/q.

### 8. Progress and review (1 min)

**Progress**: attempts, traces that met the target, practice sessions, 14-day activity, and the
per-character table — point out the rows that say *not measured*.

**Review**: saved samples, the practice log, flag a letter as needing more practice, and
**Export full log (CSV)** — open the CSV to show the real data.

### 9. Close (30 s)

> "Nine screens, all functional. 145 unit tests and 58 browser tests, all passing. No backend,
> no account, and no data about a child leaves the device."

Optionally resize the window narrow to show the mobile layout.

---

## If something goes wrong

| Problem | Fix |
| --- | --- |
| Port 4173 in use | `npm run preview -- --port 5000` |
| Drawing looks laggy on a projector | Lower the browser zoom; mirrored displays can halve the frame rate |
| A sample will not save | Private browsing blocks IndexedDB; use a normal window (the app shows a banner for this) |
| Speech does nothing | Not all browsers ship the Web Speech API; the option is hidden where it is missing |
| You demoed with data already present | Settings → Delete all data on this device |

---

## Explaining the system to evaluators

**The one-sentence version:** a browser-based writing pad that teaches letter formation through
guided tracing, adapts to the child's visual needs, and keeps an honest record of practice on
the device.

**The three design decisions worth defending:**

1. **A hand-authored stroke font instead of a real font.** Font outlines contain no stroke order.
   Storing each letter as ordered polylines gives the trace path, the start dot, the arrow and
   the stroke count from one source of truth — and makes the guide directly comparable to the
   child's ink.
2. **Two measures instead of one score.** Each is a defined geometric quantity that can be
   explained and tested, rather than an opaque "accuracy %".
3. **Local-first with no backend.** Nothing in the MVP needs a server, and a server would mean
   storing children's data. The absence of a backend is a design decision, not a shortcut.

---

## Likely viva questions and answers

**Q. Does the app recognise handwriting?**
No, and we are careful never to imply it does. It measures geometric overlap between the ink and
the printed guide. It cannot tell you *which* letter was written. Claiming recognition would
mean claiming an assessment we have not validated.

**Q. Then how does "Check my tracing" work?**
Both the guide and the ink are polylines in the same coordinate system. We resample both to a
fixed 4-unit spacing, then compute two ratios: the share of guide points with ink within the
tolerance (*coverage*), and the share of ink points within the tolerance of the guide
(*on-guide*). An attempt passes when coverage ≥ 75% and on-guide ≥ 60%.

**Q. Why two numbers rather than one?**
Because either alone is gameable. Coverage alone rewards scribbling over everything; on-guide
alone rewards drawing one tiny careful mark. We have a unit test that asserts a full-sheet
scribble scores above 0.9 coverage but below 0.3 on-guide and therefore fails.

**Q. Why resample?**
Otherwise the score would depend on drawing speed, because a slow drag generates far more pointer
samples than a quick one. There is a test pinning that the same path drawn with 4 samples and
with 400 samples scores the same.

**Q. Where is the data stored?**
On the device. Settings and the attempt log are in localStorage; writing samples are PNGs in
IndexedDB. No server, no account, no analytics, and no network requests at runtime.

**Q. What about children's privacy?**
We collect nothing. The only free-text field is an optional device nickname, and its helper text
asks users not to enter a child's real name. Settings → Delete all data removes everything.

**Q. Why no login system?**
It would require storing children's personal data and a backend to hold it, for no capability the
MVP needs. For a classroom deployment we would design it with consent and data-retention rules,
which is future scope.

**Q. Why hash routing (`/#/letters`)?**
The build is static files. Hash routing works on Vercel, Netlify, GitHub Pages and even from a
USB stick, with no server rewrite rules.

**Q. Why canvas for the ink but SVG for the guide?**
Canvas gives low-latency freehand ink. SVG keeps the guide crisp at any size, means the child can
never erase it, and keeps the ink separable for scoring and export.

**Q. How do you support stylus, touch and mouse?**
One Pointer Events code path for all three — there is no device-specific branch. We also use
`getCoalescedEvents()` to recover samples the browser batched between frames, which matters for
fast strokes.

**Q. How are strokes stored, and why does it matter?**
As polylines in *sheet units*, not pixels. The drawing therefore survives a window resize, looks
the same on a phone and a monitor, and can be compared with the guide without any conversion.

**Q. How is undo implemented?**
Snapshots of the stroke array on past/future stacks, capped at 60. Snapshots of a few hundred
small objects are cheap and much harder to get subtly wrong than inverse operations.

**Q. What did testing actually catch?**
Six real defects: four letters (`g`, `j`, `s`, `u`) whose curves dropped below the descender
line; stroke markers overlapping so "1" was invisible under "2"; the writing sheet rendering
taller than the viewport so the toolbar scrolled away; a nine-column review table that could not
be used on a phone; speed-dependent scoring before we added resampling; and the best one — a
sticky page header that sat over the top of the writing sheet and swallowed the pointer events
for any stroke drawn there, so part of a child's ink silently went missing. It showed up as a
tracing scoring 51% coverage but 100% on-guide, which is only possible if input is being lost
rather than misplaced.

**Q. What are the weaknesses?**
Coverage does not verify stroke order, so a child could trace correctly in the wrong sequence and
still pass. Storage is per-device with no sync or multiple profiles. We tested only in Chromium.
And we have not run a study with children, so we claim no educational outcome.

**Q. Where is the hardware the problem statement asks for?**
We built the software, and it already works with real styluses and graphics tablets through
Pointer Events. `docs/HARDWARE_EXTENSION.md` sets out a dedicated pen-and-pad design — sensing
options, protocol, calibration and costs — and states plainly that it is proposed, not built,
and that it would not currently beat commodity hardware.

**Q. How would you extend it with more time?**
Stroke-order verification first, since it is the clearest gap and the data to do it is already
captured. Then multiple profiles per device, then cursive guides.

**Q. How much did AI assist with this?**
It is documented in `docs/AI_DEVELOPMENT_LOG.md`, including which decisions were ours and which
defects the test suite caught. Be ready to explain any file you are asked about — the viva tests
whether you understand the system, not who typed it.
