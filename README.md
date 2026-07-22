# Cube Lab 3D — Homepage

Premium, mobile-first Rubik's Cube homepage. Ported from the single-file HTML prototype to **Next.js (App Router) + Tailwind CSS + Three.js**.

## Stack
- Next.js 14 (App Router, TypeScript)
- Tailwind CSS v3
- Three.js via `@react-three/fiber` + `@react-three/drei`

## Getting started
```bash
npm install
npm run dev
npm run build
```

## Project structure
- `app/layout.tsx` — metadata and Toast provider
- `app/page.tsx` — homepage composition
- `app/globals.css` — design tokens and global styles
- `components/` — header, hero, cube, solve controls, stepper, features, sign-in, toast, and icons

## Notes
- The solution stepper still uses demo moves.
- Solver input buttons still use placeholders.
- Do not connect the public domain until the Public Launch Gate is complete.
- Cube rendering/engine implementation notes live in `CUBE-PERSPECTIVE-NOTES.md`
  (visual framing) and `CUBE-ENGINE-NOTES.md` (engine internals/bugs).
