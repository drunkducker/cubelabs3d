# Deploy trigger — password reset live

**Date:** 2026-07-22
**Target commit for production:** `0753f57` (and its parent `e25edba`)

Purpose: force a fresh Vercel production build. The previous production
deployment was `a3f41c8` (docs refresh), which is two commits behind `main`
and therefore missing the password-reset work:

- `e25edba` — fix password-reset / signup email links to use the real site origin
- `0753f57` — add the reachable "Forgot your password?" entry point on `/auth`

After this deploy is **Ready**, `cubelabs3d.vercel.app/auth` should show the
"Forgot your password?" disclosure under the Sign In button.
