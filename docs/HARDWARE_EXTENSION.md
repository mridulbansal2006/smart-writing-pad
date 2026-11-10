# Hardware Extension — Proposed, Not Implemented

> **Status: design proposal only.** Nothing in this document has been built, prototyped or
> tested. The delivered project is software: a web application that works with the pointing
> devices a computer or tablet already has. This document sets out how a physical writing pen
> and pad *could* be connected to it, and is clearly separated from the working system so the
> two are never confused.

| | Implemented | Proposed here |
| --- | --- | --- |
| Writing surface | Browser canvas on any screen | Dedicated physical pad |
| Input device | Mouse, finger, or any stylus the OS already supports | Instrumented pen |
| Stroke capture | Pointer Events (x, y, time) | Same, plus pressure, tilt, grip |
| Connection | None needed | USB HID, Bluetooth LE, or Web Serial |

---

## 1. What the software already supports

The application reads input through the browser's **Pointer Events** API. That matters for a
hardware path, because any device the operating system presents as a pointing device already
works today with no code changes:

- A Wacom or XP-Pen graphics tablet connected by USB.
- An Apple Pencil on iPad, or an S Pen on Android.
- A Surface Pen, or any Windows Ink compatible stylus.

In other words, "a writing pen and a writing pad" in the commodity sense is already a supported
configuration. The pen's position is used; the fields below are read by the browser but not yet
used by this application:

| Pointer Event field | Available today | Used by the app |
| --- | --- | --- |
| `clientX` / `clientY` | Yes | Yes |
| `pointerType` (`mouse` / `touch` / `pen`) | Yes | No |
| `pressure` (0–1) | On supporting hardware | No |
| `tiltX` / `tiltY`, `twist` | On supporting hardware | No |
| `getCoalescedEvents()` | Yes | Yes |

**The smallest credible hardware-facing increment** is therefore not new hardware at all: it is
using `pressure` to vary stroke width and `pointerType` to show a "pen detected" indicator and
ignore accidental palm touches. That is a software change of perhaps a day, and it would make a
commodity stylus visibly better supported.

## 2. Candidate technologies for a dedicated pad

| Technology | How it works | Strengths | Weaknesses |
| --- | --- | --- | --- |
| **Electromagnetic resonance (EMR)** — as used by Wacom | A grid under the surface powers and senses a passive pen | No battery in the pen; excellent accuracy; pressure and tilt | Proprietary sensor boards; difficult to source for a student build |
| **Resistive / capacitive touch panel + passive stylus** | A standard touch panel reports contact position | Cheap; modules widely available | Low precision; poor palm rejection; no true pressure |
| **Force-sensitive resistor (FSR) in the pen tip** | A resistor under the nib changes resistance with force | Simple; a real pressure signal; inexpensive | Needs separate position sensing; non-linear, needs calibration |
| **Inertial pen (IMU: accelerometer + gyroscope)** | Dead-reckoning from motion | Writes on ordinary paper; no pad electronics | Drift accumulates in seconds; absolute position is unreliable |
| **Optical pen on dot-patterned paper** — the Anoto approach | A tip camera reads a printed micro-pattern | Genuinely accurate on paper | Patented pattern; special paper; costly |
| **Ultrasonic / infrared clip-on receiver** | A clip measures time-of-flight from the pen | Works with ordinary paper and clips to any pad | Sensitive to obstruction, and to the hand covering the pen |

**For a student-scale prototype,** the realistic combination is a **capacitive touch panel for
position plus an FSR in the pen tip for pressure**, with a microcontroller merging the two
streams. It is affordable, uses stock components, and produces exactly the data the application
already models (x, y, time, pressure).

## 3. Proposed sensor integration

```
┌──────────────────────┐        ┌──────────────────────┐        ┌───────────────────┐
│  Pen                 │        │  Pad                 │        │  Host (browser)   │
│  • FSR at nib        │ BLE /  │  • Touch panel       │ USB /  │  • Driver shim    │
│  • IMU (tilt, grip)  ├───────▶│  • MCU (ESP32/RP2040)├───────▶│  • WritingCanvas  │
│  • Battery           │  wire  │  • Sample + merge    │  BLE   │  • Same scoring   │
└──────────────────────┘        └──────────────────────┘        └───────────────────┘
```

**Sampling.** 100–200 Hz is the target. Below about 60 Hz, fast strokes visibly polygonise; the
existing use of `getCoalescedEvents()` shows the application is already built to consume
higher-rate input than the display refresh.

**On-device processing.** The microcontroller should timestamp, de-bounce and merge the position
and pressure streams and emit one ordered sample list. It should not attempt smoothing: the
application already smooths for rendering and deliberately scores the raw geometry.

**Wire format.** A compact line-oriented protocol keeps the host shim trivial:

```
S                        // stroke start
P <t_ms> <x> <y> <p>     // sample: time, position in pad units, pressure 0–1023
E                        // stroke end
```

**Getting it into the browser.** Three options, in increasing order of effort:

1. **Present as a USB HID digitizer.** The operating system then treats it as a stylus, and the
   application works unchanged — this is by far the best path, and the one that makes the
   existing Pointer Events design pay off.
2. **Web Serial / Web HID.** The page talks to the device directly over USB. Requires a browser
   that supports those APIs, a user gesture to grant access, and a secure context.
3. **Web Bluetooth over BLE.** Wireless, but the least consistent support across browsers.

**Where it would plug in.** `WritingCanvas` would gain an alternative input source that feeds
the same `{x, y}` sheet-unit points its pointer handlers already produce. Everything downstream —
smoothing, undo, export, scoring, storage — needs no change, because strokes are stored in
device-independent sheet units rather than pixels. The clean seam already exists.

## 4. Calibration

An affine map from pad coordinates to sheet coordinates would be fitted from a four-corner
touch routine (x′ = ax + by + c, y′ = dx + ey + f), solved by least squares and stored in
localStorage alongside the other settings. Pressure would need a per-pen two-point calibration
(rest and firm press) because FSR response is non-linear and varies between units.

## 5. Feasibility

| Aspect | Assessment |
| --- | --- |
| Technical feasibility | **High** for a position-and-pressure prototype using stock parts |
| Cost | Roughly ₹3,000–6,000 for a touch panel, microcontroller, FSR and enclosure |
| Build time | Several weeks, most of it on mechanical design and calibration rather than code |
| Software change needed | Small — an input adapter plus a calibration screen |
| Accuracy versus a commercial tablet | **Clearly worse.** A ₹5,000 graphics tablet will outperform a hand-built pad on precision, latency and palm rejection |

## 6. Limitations and honest assessment

- **A prototype would be worse than what already works.** Any commodity stylus and tablet
  outperforms a hand-built pad today, through the same code path. The honest reason to build
  hardware is to learn, or to target something commodity hardware does not do — not to improve
  the writing experience.
- **IMU-only pens do not work for handwriting.** Drift makes absolute position unusable within
  seconds; demonstrations that appear to work are typically reconstructing shapes, not positions.
- **Pressure data would not change what the app can claim.** It would allow pressure-varying
  stroke width and a record of grip force, but it would not enable handwriting assessment, and
  reporting a "pressure score" as an indicator of learning difficulty would not be defensible.
- **Palm rejection is the hard part.** It is the main reason cheap pads feel unusable, and it is
  largely solved in commercial hardware by sensing technology rather than by software.
- **Safety and ergonomics** for a device handled by children — battery, enclosure, small parts,
  cable strain — would need proper attention before classroom use, and are outside this project.

## 7. Summary

The delivered software already works with real pens and real tablets through Pointer Events, and
stores strokes in a device-independent form that a hardware input source could feed directly.
A dedicated pad is feasible as a learning exercise and a clear integration path exists, but it is
proposed work, not delivered work, and it would not currently improve on commodity hardware.
