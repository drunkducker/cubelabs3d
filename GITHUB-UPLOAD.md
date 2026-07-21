# Publishing this source to GitHub

This folder is the GitHub-ready Cube Lab 3D source tree. It intentionally omits
generated build output, installed dependencies, local caches, and the live
hosting project's identifier.

## Repository target

`https://github.com/drunkducker/cubelabs3d`

## Recommended command-line upload

Run these commands after cloning the empty repository and copying this folder's
contents into the clone:

```bash
git add .
git commit -m "Add initial Cube Lab 3D website structure"
git push origin main
```

## Before running the site locally

1. Install Node.js 22.13 or newer.
2. Run `npm install`.
3. If using ChatGPT Sites hosting, copy
   `.openai/hosting.example.json` to `.openai/hosting.json` and replace the
   placeholder with the project identifier supplied by the hosting platform.
4. Run `npm run dev`.

The application routes are `/` for the puzzle catalog and `/play/3x3` for the
working interactive cube.

## Documentation policy

The required explanatory-comment standard is defined in
`docs/site-architecture.md`. Code changes should update their notes in the same
commit so the comments never drift away from actual behavior.
