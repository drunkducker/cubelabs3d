# Cube Perspective Notes

Last updated: 2026-07-21, America/New_York

## Goal

Future playable cube blocks should open with the same visual feel as the good 3x3 hero cube: a real object sitting in the card, not a flat solver panel and not a giant cropped wall.

The best-looking reference is the view where the cube's lower point sits near the lower center of the viewport. The cube should feel slightly above and behind that point, with the front/right/top faces visible and enough room around the object to read the full shape.

## Current 4x4 Focus Recipe

Use this as the baseline when recreating the current 4x4 perspective:

- Start zoomed out enough that the full cube is visible.
- Use the focus camera distance around `size * 4.8`.
- Offset the cube so the lower point lands near the lower-center anchor.
- The latest tuned 4x4 offset is approximately:
  - `x: -2.5`
  - `y: 2`
  - `z: 0`
- Keep the canvas transparent so the cube card background does the visual framing.
- Do not add a platform ring or decorative circle under the cube.

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
