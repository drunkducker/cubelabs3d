# Privacy and Account Lifecycle — 2026-07-30

Branch: `gpt/privacy-account-lifecycle`

## Implemented

- Moderated avatar upload with browser square crop, static image validation, private review storage, approval publishing, rejection, replacement, and deletion.
- User-data export worker that assembles account, profile, solves, scrambles, memories, collection, achievements, stats, friendships, challenges, notifications, mail history, privacy history, and avatar moderation history into a private JSON package with SHA-256 metadata and an expiring signed URL.
- Full account deletion that enforces export-before-delete, a deletion hold, Storage cleanup, and Supabase Auth deletion.
- Anonymization mode that removes identity/social data while retaining de-identified solve history.
- Correction, appeal, authorized-agent, parent/guardian, identity-verification, evidence, due-date, extension, approval, denial, and audit-event workflows.
- Neutral age screening using age bands only. Under-13 users are routed to the parent process without account creation; teen accounts default to private.
- Admin privacy and avatar queue with owner-only destructive approvals and manual worker execution.
- Protected scheduled worker endpoint at `/api/internal/privacy-worker` using `CRON_SECRET` or `PRIVACY_WORKER_SECRET`.

## Required deployment environment

- `SUPABASE_SERVICE_ROLE_KEY`
- `CRON_SECRET` or `PRIVACY_WORKER_SECRET`
- `AWS_ACCESS_KEY_ID`
- `AWS_SECRET_ACCESS_KEY`
- `AWS_REGION`
- `SES_FROM_EMAIL`
- `NEXT_PUBLIC_SITE_URL`

Optional when using temporary AWS credentials:

- `AWS_SESSION_TOKEN`

## Applied Supabase migrations

The following migrations were applied to project `fvcjufbyjkjyorrmpgrm`:

- `privacy_account_lifecycle`
- `privacy_storage_ownership_rpc`
- `age_screening_write_policy`

## Safety boundaries

- Private review, export, and evidence buckets have no normal client access policies.
- Approved avatars alone are copied to the public `avatars` bucket.
- Destructive case approval and manual worker execution require the Owner role.
- The worker pauses deletion when export delivery has not succeeded.
- Birth dates are not collected or stored by the age-screening workflow.
