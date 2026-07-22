# Cube Perspective Notes

Last updated: 2026-07-22, America/New_York

For engine-internals bugs (not visual framing) — animation-frame cleanup,
scramble behavior — see `CUBE-ENGINE-NOTES.md`.

## Goal

Future playable cube blocks should open with the same visual feel as the good 3x3 hero cube: a real object sitting in the card, not a flat solver panel and not a giant cropped wall.

The best-looking reference is the view where the cube's lower point sits near the lower center of the viewport. The cube should feel slightly above and behind that point, with the front/right/top faces visible and enough room around the object to read the full shape.

## Current 4x4 Focus Recipe

Use this as the baseline when recreating the current 4x4 perspective:

- Keep the cube at the scene origin and keep the orbit target at the origin,
  the same as the hero/3x3/2x2 cubes. Do not translate the cube's root group
  away from `(0,0,0)` to fake an off-center composition — that decouples the
  visual position from the orbit pivot, so the cube swings away from camera
  center as soon as it's rotated, and any camera-distance error gets read as
  "stuck in a corner" instead of "too small/too far".
- Pick the camera distance from the cube's actual half-extent so it fills the
  frame at the same ratio as the hero cube: `distance = 5.02 * (edge + 0.468)`
  where `edge = (size - 1) / 2`. A flat `size * constant` multiplier drifts
  out of proportion as `size` changes.
- Keep the canvas transparent so the cube card background does the visual framing.
- Do not add a platform ring or decorative circle under the cube.

## High-DPI Canvas Overflow (root cause of the 2026-07-22 centering bug)

The manual three.js cubes (`app/NxNCubeGame.tsx`, `components/NotationCube.tsx`)
build their own `THREE.WebGLRenderer` instead of using `@react-three/fiber`'s
`<Canvas>`. Their resize handler called:

```
renderer.setSize(w, h, false);
```

The third argument (`updateStyle`) is `false`, so three.js sets the canvas's
`width`/`height` HTML attributes to the drawing-buffer resolution
(`container size * devicePixelRatio`) but never touches `canvas.style.width` /
`canvas.style.height`. A `<canvas>` with no CSS constraining it renders its
box at those attribute values interpreted as CSS pixels.

On desktop testing (`devicePixelRatio` 1) the attribute values equal the
container size, so the bug is invisible — the cube looks centered. On a real
phone (`devicePixelRatio` ~2-2.75), the canvas box balloons to 1.5-2.75x the
card size, overflows it, and gets clipped by the card's `overflow-hidden`
rounded corner. Because that clip anchors top-left, the visible slice shows
the cube pushed toward the bottom-right and cropped, even though the camera
math underneath is centering it correctly.

This is why the first centering fix (removing the `focusOffset` root-position
hack, see below) looked right in desktop screenshots but the user still saw a
cropped, bottom-right-shifted cube on their actual Android phone — two
separate bugs stacked on the same symptom description ("won't center").

**Diagnosis method:** desktop Playwright screenshots didn't reproduce it;
emulating a real phone's pixel ratio did — `newPage({ deviceScaleFactor: 2.75,
viewport: { width: 412, height: 892 } })` reproduced the exact bottom-right
crop from the user's phone screenshots, confirming the theory before touching
code.

**Fix:** explicitly set the canvas's CSS box right after creating the
renderer, independent of `setSize`'s `updateStyle` flag:

```
renderer.domElement.style.display = "block";
renderer.domElement.style.width = "100%";
renderer.domElement.style.height = "100%";
```

`@react-three/fiber`'s `<Canvas>` (used by `RubiksCube.tsx`, `PocketCube3D.tsx`,
`SolverCube3D.tsx`, `InteractiveHeroCube.tsx`) does this internally, which is
why those cubes never showed the bug. Any future hand-rolled three.js cube in
this repo needs the same explicit canvas sizing, or should just use
`@react-three/fiber` instead.

## Visual Anchor

When checking the view by eye:

- The cube should not default to the far lower-right corner.
- The cube should not be cropped by the card.
- The bottom point/corner of the cube should sit near the lower center of the card.
- The top face should be clearly visible, but not so dominant that the front face feels short.
- The side face should show depth without turning the cube into a side-view tool.

## Sticker Look

The preferred cube style is the 3D sticker look from the good 3x3:

- Cubies use a dark/black body.
- Stickers are separate raised pieces, not just flat face colors painted onto the cubie.
- Stickers should have small gaps between them so each mini square is readable.
- Stickers should be slightly rounded or beveled when possible.
- Highlight effects should hit the raised stickers, not the black cubie body.

## Controls

For public-facing solver/play pages:

- Touch/swipe should be the main interaction.
- Buttons should be hidden, collapsed, or treated as backup controls.
- Avoid playback-style controls on playable cube pages unless the page is specifically a replay/demo view.
- Avoid large control panels above the cube. The first read should be the cube itself.

## Reuse Guidance

For future cube blocks, start from this order:

1. Use the playable cube engine.
2. Apply the hero/focus camera framing.
3. Apply the lower-center cube-point anchor.
4. Use raised sticker geometry.
5. Hide backup controls until needed.
6. Check the first default view before tuning touch mechanics.

This note exists because the correct feel was found visually: the cube needs to look like the clean 3x3/hero card first, then become playable underneath.
