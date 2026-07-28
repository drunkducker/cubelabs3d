# Kilominx Gesture Physics Experiment

**Status:** parked experiment — not active in production or the Kilominx Learn preview

**Preserved implementation branch:** `experiment/kilominx-gesture-physics`

**Preserved implementation commit:** `b7699c9e996c24e70f26fafc30159a4087ad3fec`

## Why this is parked

The experiment introduced direct-manipulation gesture physics that may be useful later, but it did not match the approved Cube Labs 3×3 and 4×4 touch contract. The active Kilominx Learn work must first reach parity with the shared interaction behavior before any alternate gesture model is evaluated.

The active baseline remains:

- touch a sticker;
- drag far enough to select and highlight a legal move;
- release beyond the commit threshold to perform one turn;
- release below the threshold to cancel;
- use the existing camera gesture contract.

## Preserved ideas

The parked branch contains or explores:

- pointer velocity sampling;
- flick-to-commit behavior;
- partial layer movement under the finger;
- snap-forward completion;
- spring-back cancellation;
- configurable drag resistance;
- configurable completion and cancellation thresholds;
- a compact touch-origin guide and live movement progress.

These ideas are intentionally unavailable to ordinary users while the canonical gesture remains the product default.

## Possible future product shape

If revived, the physics model should be implemented as one shared, opt-in interaction profile rather than puzzle-specific code.

Suggested profiles:

- `classic` — current Cube Labs 3×3/4×4 selection-and-release behavior;
- `direct` — layer follows the pointer and snaps on release;
- `flick` — direct behavior plus velocity-based commit;
- `accessibility` — lower thresholds and reduced resistance without velocity dependence.

The canonical move resolver must still decide the legal layer and move. Gesture physics may only change how intent is measured and previewed.

## Future administrator controls

Any future controls should be server-authorized site settings or feature flags, not browser-only values. Candidate settings:

- enabled interaction profiles;
- default profile by puzzle type;
- drag-selection threshold in CSS pixels;
- commit-distance threshold in CSS pixels;
- flick velocity threshold in CSS pixels per millisecond;
- drag-to-angle sensitivity;
- resistance curve strength;
- maximum partial-turn preview angle;
- snap-forward duration;
- spring-back duration;
- reduced-motion overrides;
- device-class overrides for touch, mouse, and stylus;
- experiment cohort percentage;
- kill switch.

Administrators should not be able to create physically invalid moves or bypass the canonical engine. Values must be bounded and validated server-side.

## Required evidence before revival

Do not enable this model in production until all of the following exist:

- parity tests proving the same drag selects the same legal move as `classic`;
- real-device testing across Android and iOS;
- tests for slow drags, fast flicks, reversals, pointer cancellation, and multi-touch;
- camera-control recovery after every cancellation path;
- accessibility and reduced-motion review;
- telemetry comparing accidental turns, canceled gestures, completion time, and undo rate;
- an immediate administrator kill switch;
- owner approval.

## Re-entry rule

Revival begins from the preserved experiment branch or commit. Do not copy isolated pieces back into a puzzle renderer. First extract a shared interaction-profile boundary, then integrate it behind a disabled-by-default feature flag and compare it against the canonical 3×3/4×4 behavior.
