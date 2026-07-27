# Deploy Trigger History — 2026-07-22

**Historical status:** preserved deployment history, not a current deployment instruction. Current authentication and deployment status belong in [`../AUTHENTICATION.md`](../AUTHENTICATION.md) and [`../CURRENT_STATUS.md`](../CURRENT_STATUS.md).

These one-shot Vercel deploy-trigger stubs previously lived in `docs/deploy-triggers/`. They contained no runtime behavior; each existed only to force a fresh Vercel build for a branch. They are consolidated here so the `deploy-triggers/` folder no longer competes with the permanent documentation, while the record is preserved and searchable. The password-reset preview trigger is also captured in [`2026-07-22-password-reset-preview.md`](./2026-07-22-password-reset-preview.md).

## `gpt-current-site-state` — GPT current site state

Created to trigger a Vercel preview deployment for the `gpt/current-site-state` branch. Timestamp: 2026-07-22 06:27 America/New_York. Did not change app layout or runtime behavior.

## `password-reset-live-20260722` — password reset live

- Date: 2026-07-22
- Target commit for production: `0753f57` (and its parent `e25edba`)

Purpose: force a fresh Vercel production build. The previous production deployment was `a3f41c8` (docs refresh), which was two commits behind `main` and therefore missing the password-reset work:

- `e25edba` — fix password-reset / signup email links to use the real site origin
- `0753f57` — add the reachable "Forgot your password?" entry point on `/auth`

After that deploy was Ready, `cubelabs3d.vercel.app/auth` was expected to show the "Forgot your password?" disclosure under the Sign In button.

## `password-reset-preview-20260722-0336` — password reset preview

Branch: `gpt/cube-id-platform`. Purpose: trigger a fresh Vercel preview deployment containing the password-reset flow and password-visibility controls. Timestamp: 2026-07-22 03:36 America/New_York. Also preserved in [`2026-07-22-password-reset-preview.md`](./2026-07-22-password-reset-preview.md).
