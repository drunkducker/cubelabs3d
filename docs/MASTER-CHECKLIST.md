# Cube Labs 3D — Atomic Master Checklist

**Created:** 2026-07-26  
**Purpose:** Work through the project one item at a time without losing legal, security, product, payment, competition, or deployment requirements.

## How to use this checklist

- Work on only one numbered item at a time unless two items are inseparable.
- Change `[ ]` to `[~]` when implementation is merged but still awaits production or browser verification.
- Change `[~]` to `[x]` only after the required evidence is recorded.
- Record the commit, PR, migration, test, screenshot, or production verification in `DAILY-LOG.md` or a dated checkpoint.
- Do not skip legal, security, accessibility, privacy, or cancellation tasks to ship faster.

## Status key

- `[ ]` not started or incomplete
- `[~]` implemented but not fully production verified
- `[x]` verified complete
- `[?]` requires owner, counsel, tax, or policy decision

---

# Phase 1 — Business and legal identity

- [ ] **L-001 — Choose the legal operator.** Decide whether Cube Labs 3D is operated personally, through an LLC, or through another company.
- [ ] **L-002 — Record the legal business name.** Add the exact operator name used in contracts, billing, policies, and notices.
- [ ] **L-003 — Record the business address.** Choose the mailing or registered address that can legally appear in policies and notices.
- [ ] **L-004 — Create official contact addresses.** Establish support, privacy, legal, copyright, billing, and security email addresses.
- [ ] **L-005 — Choose governing law and venue.** Decide the state law and court venue that will govern the Terms.
- [ ] **L-006 — Decide dispute-resolution terms.** Counsel must decide whether to use arbitration, a class-action waiver, or ordinary court proceedings.
- [ ] **L-007 — Obtain legal review.** Have a qualified attorney review the launch Terms, Privacy Policy, subscription terms, refund policy, and social features.
- [ ] **L-008 — Decide launch countries.** List where accounts, payments, advertising, and competitions will initially be available.
- [ ] **L-009 — Choose the minimum account age.** Confirm the recommended 13+ account rule or design a parental-consent program.
- [ ] **L-010 — Decide under-13 handling.** Define what happens when a user identifies as under 13 or a parent requests deletion.

# Phase 2 — Legal pages and user policies

- [~] **P-001 — Privacy Policy foundation.** The page exists, but operator identity, contact information, and final legal review are missing.
- [ ] **P-002 — Finalize the Privacy Policy.** Replace all launch placeholders and ensure actual data practices match the text.
- [~] **P-003 — Terms of Service foundation.** The page exists, but legal identity, governing law, venue, and dispute terms remain unfinished.
- [ ] **P-004 — Finalize the Terms of Service.** Add counsel-approved legal and subscription language and remove all placeholders.
- [~] **P-005 — Cookie Policy foundation.** The page exists and now links Cookie Settings plus the first-party inventory; final legal review remains.
- [~] **P-006 — Create a production cookie inventory.** First-party keys (`cubelabs_access_token`, `cubelabs_refresh_token`, `cl_consent`) are catalogued in `lib/consent.ts` with provider, purpose, category, and duration, and published on `/cookies/settings`; extend it before enabling any new storage-writing provider.
- [~] **P-007 — Build Cookie Settings.** `components/CookieConsent.tsx` lets users grant, reject, or withdraw consent per category (preferences, analytics, advertising) via a reopenable modal; production/browser verification remains.
- [~] **P-008 — Add a consent banner.** A banner blocks nonessential storage until a choice is recorded, and ad-tracking beacons are gated on advertising consent; analytics has no provider wired yet.
- [~] **P-009 — Honor privacy preference signals.** Global Privacy Control is detected and pre-sets advertising/sharing to off; production verification against a GPC browser remains.
- [~] **P-010 — Affiliate Disclosure foundation.** The disclosure page and sponsored-link labels exist but require launch review.
- [ ] **P-011 — Add a Refund Policy.** Explain eligibility, timing, exceptions, and how users request refunds.
- [ ] **P-012 — Add Subscription Terms.** Clearly explain prices, billing periods, renewal, trials, cancellation, and access after cancellation.
- [ ] **P-013 — Add Your Privacy Choices.** Provide opt-outs for sale, sharing, and targeted advertising where applicable.
- [ ] **P-014 — Add a Data Rights page.** Explain access, correction, deletion, portability, appeal, and authorized-agent requests.
- [ ] **P-015 — Add Community Guidelines.** Define prohibited harassment, impersonation, cheating, spam, illegal content, and abusive conduct.
- [ ] **P-016 — Add a Moderation and Appeals Policy.** Explain reports, review, removals, suspensions, bans, and appeals.
- [ ] **P-017 — Add a Copyright/DMCA Policy.** Publish notice, counter-notice, repeat-infringer, and takedown procedures.
- [ ] **P-018 — Register a DMCA agent.** Register and publish the designated agent if user-hosted content requires safe-harbor protection.
- [ ] **P-019 — Add an Accessibility Statement.** State the accessibility goal, known limitations, and contact method.
- [ ] **P-020 — Add a Security Reporting page.** Give researchers a safe method for reporting vulnerabilities.
- [ ] **P-021 — Add a Child Safety/Parent page.** Explain age limits, parental requests, and child-data deletion procedures.
- [ ] **P-022 — Add a Data Retention schedule.** Define how long each data category is kept and when it is deleted.
- [ ] **P-023 — Add a law-enforcement request policy.** Define validation, scope, preservation, and disclosure handling before it becomes necessary.

# Phase 3 — Privacy operations

- [~] **PR-001 — Account data-export request queue.** Requests can be queued, but the fulfillment worker and delivery process are incomplete.
- [ ] **PR-002 — Build the export worker.** Generate a complete user-data package and deliver it securely.
- [~] **PR-003 — Account-closure request queue.** Requests can be queued and profiles can be hidden, but full deletion is incomplete.
- [ ] **PR-004 — Build the deletion worker.** Delete or anonymize application data and remove the Supabase Auth user after required checks.
- [ ] **PR-005 — Add correction requests.** Let users correct inaccurate personal data beyond ordinary profile editing.
- [ ] **PR-006 — Add privacy-request appeals.** Allow users to appeal a denied privacy request where required.
- [ ] **PR-007 — Add authorized-agent handling.** Verify agents and user authorization before processing requests.
- [ ] **PR-008 — Log privacy-request deadlines.** Track received, verified, due, completed, denied, and appealed dates.
- [ ] **PR-009 — Add identity-verification rules.** Verify requesters without collecting unnecessary additional data.
- [ ] **PR-010 — Prevent retaliation.** Ensure account features and pricing do not discriminate against users exercising privacy rights.
- [ ] **PR-011 — Add age screening.** Use a neutral birth-month/year or age-gate flow before account creation.
- [ ] **PR-012 — Add parent-request handling.** Create a documented process for parent access and deletion requests.

# Phase 4 — Production infrastructure

- [ ] **I-001 — Apply all Supabase migrations.** Run every dated migration in the production project and record the result.
- [ ] **I-002 — Verify migration order.** Confirm migrations were applied in the intended sequence without skipped dependencies.
- [ ] **I-003 — Configure `SUPABASE_SERVICE_ROLE_KEY`.** Store it only in server-side production variables.
- [ ] **I-004 — Create the private `admin-media` bucket.** Confirm uploads, signed previews, permissions, and deletion.
- [ ] **I-005 — Bootstrap the Owner account.** Run `public.bootstrap_owner(...)` for the correct user.
- [ ] **I-006 — Verify the last-owner guard.** Confirm the final active Owner cannot be removed or deactivated.
- [ ] **I-007 — Configure production email.** Finish SES or the chosen provider for password reset and Cube Labs Mail.
- [ ] **I-008 — Test email delivery.** Verify delivery, bounce, complaint, retry, and rollback behavior.
- [ ] **I-009 — Configure production domain DNS.** Confirm custom-domain routing, SSL, redirects, and canonical host behavior.
- [ ] **I-010 — Add a production status page.** Publish availability and incident information.
- [ ] **I-011 — Configure error reporting.** Capture server and client exceptions without leaking sensitive data.
- [ ] **I-012 — Configure privacy-aware analytics.** Enable analytics only after consent controls and data minimization are complete.
- [ ] **I-013 — Configure backups.** Schedule database and critical-content backups.
- [ ] **I-014 — Test database restore.** Restore a backup into an isolated environment and document the procedure.
- [ ] **I-015 — Create an incident-response plan.** Define detection, containment, recovery, communication, and postmortem steps.

# Phase 5 — Security and abuse prevention

- [ ] **S-001 — Complete the RLS checklist.** Verify every public, authenticated, owner, and denied access path in production.
- [ ] **S-002 — Run Supabase security advisors.** Resolve serious findings and document accepted low-risk warnings.
- [ ] **S-003 — Add authentication rate limits.** Protect sign-up, sign-in, password reset, and verification endpoints.
- [ ] **S-004 — Add friend-action rate limits.** Limit searches, requests, accepts, removals, and repeated targeting.
- [ ] **S-005 — Add challenge rate limits.** Prevent challenge spam, mass sends, and repeated abuse.
- [ ] **S-006 — Add privacy-request rate limits.** Prevent queue flooding without blocking legitimate legal requests.
- [ ] **S-007 — Add ad-tracking rate limits.** Reduce fake impression and click inflation.
- [ ] **S-008 — Add admin-action rate limits.** Protect destructive and high-impact admin operations.
- [ ] **S-009 — Add admin step-up authentication.** Require recent authentication or 2FA for owner-only actions.
- [ ] **S-010 — Add blocking.** Let users block accounts from friendship, search, messaging, and challenges.
- [ ] **S-011 — Add reporting.** Let users report accounts, names, avatars, challenges, scores, and content.
- [ ] **S-012 — Build a moderation queue.** Give authorized admins review, action, notes, evidence, and appeal controls.
- [ ] **S-013 — Add anti-spam controls.** Detect repeated invitations, duplicate messages, and automated behavior.
- [ ] **S-014 — Add dependency scanning.** Automatically detect vulnerable packages.
- [ ] **S-015 — Add secret scanning.** Detect committed tokens, private keys, and credentials.
- [ ] **S-016 — Remediate dependency findings.** Upgrade or replace vulnerable dependencies and document exceptions.
- [ ] **S-017 — Test authorization denial paths.** Confirm unauthorized users cannot reach admin, billing, private media, or private challenge data.
- [ ] **S-018 — Add account-session controls.** Let users review and revoke active sessions where supported.
- [ ] **S-019 — Add suspicious-login alerts.** Notify users when meaningful account-risk signals are detected.

# Phase 6 — Payments and subscriptions

- [?] **B-001 — Choose the Premium plan name.** Confirm the public product name shown in pricing and billing.
- [?] **B-002 — Choose the monthly price.** Set the initial U.S. monthly subscription amount.
- [?] **B-003 — Choose the annual price.** Set the annual amount and discount.
- [?] **B-004 — Decide whether to offer a trial.** Define duration, eligibility, conversion, reminders, and cancellation behavior.
- [?] **B-005 — Approve the free-versus-paid matrix.** Confirm exactly which benefits are Premium without restricting safety or basic access.
- [~] **B-006 — Premium plan database.** Plan and subscription tables exist but await production migration and verification.
- [~] **B-007 — Stripe Checkout endpoint.** Code exists but live keys and end-to-end verification are missing.
- [~] **B-008 — Stripe webhook endpoint.** Signature verification exists but live webhook registration and event testing are missing.
- [ ] **B-009 — Create Stripe Products and Prices.** Create approved monthly and annual recurring prices in Stripe.
- [ ] **B-010 — Configure Stripe secrets.** Set live secret and webhook-signing keys as server-only variables.
- [ ] **B-011 — Add Stripe Customer mapping.** Store a stable Stripe customer ID for each paying account.
- [ ] **B-012 — Make webhooks authoritative.** Grant or remove access only from verified subscription events.
- [ ] **B-013 — Add webhook idempotency.** Store processed event IDs so retries cannot duplicate changes.
- [ ] **B-014 — Add `/pricing`.** Show free and Premium features, prices, billing periods, and disclosures.
- [ ] **B-015 — Add `/profile/billing`.** Show plan, status, renewal date, invoices, cancellation, and support.
- [ ] **B-016 — Add checkout success page.** Confirm the order without falsely granting access before webhook confirmation.
- [ ] **B-017 — Add checkout canceled page.** Return the user safely without creating a subscription.
- [ ] **B-018 — Add Stripe Customer Portal.** Let users manage cards, invoices, and cancellation.
- [ ] **B-019 — Add cancellation flow.** Make cancellation easy and explain the effective date.
- [ ] **B-020 — Add reactivation flow.** Let eligible users undo a pending cancellation.
- [ ] **B-021 — Add failed-payment handling.** Notify users, allow payment updates, and apply a defined grace period.
- [ ] **B-022 — Add refund workflow.** Let support review and process eligible refunds consistently.
- [ ] **B-023 — Configure taxes.** Use Stripe Tax or an approved tax process for applicable jurisdictions.
- [ ] **B-024 — Store policy acceptance.** Record the Terms, Privacy, and subscription-policy versions accepted at purchase.
- [ ] **B-025 — Test duplicate and reordered webhooks.** Confirm entitlements remain correct under retries and out-of-order delivery.
- [ ] **B-026 — Test cancellation and renewal.** Verify every common subscription state transition.
- [ ] **B-027 — Add billing audit logs.** Record entitlement, refund, cancellation, and administrative billing changes.

# Phase 7 — Premium feature enforcement

- [ ] **PW-001 — Remove ads for Premium users.** Hide managed display ads while keeping legal disclosures and optional store content.
- [ ] **PW-002 — Set free memory limits.** Define a reasonable saved-scramble and saved-state limit per puzzle.
- [ ] **PW-003 — Add Premium memory limits.** Provide a high fair-use limit or effectively unlimited storage.
- [ ] **PW-004 — Add memory folders.** Let Premium users organize saved states and scrambles.
- [ ] **PW-005 — Add memory notes and tags.** Let Premium users label saved training material.
- [ ] **PW-006 — Add memory export.** Let Premium users download their saved puzzle library.
- [ ] **PW-007 — Add advanced statistics.** Provide trends, rolling averages, move efficiency, and filtered history.
- [ ] **PW-008 — Add training analytics.** Identify weak cases and recommend drills without creating competitive advantage.
- [ ] **PW-009 — Add Premium themes.** Offer visual customization that does not affect leaderboard fairness.
- [ ] **PW-010 — Add advanced training tools.** Build algorithm drills, spaced repetition, and personalized practice.
- [ ] **PW-011 — Add Premium private rooms.** Offer larger or longer-lived private rooms when multiplayer exists.
- [ ] **PW-012 — Protect non-paywalled rights.** Never restrict cancellation, privacy, safety, accessibility, account security, or legal pages.

# Phase 8 — Puzzle save and friend play

- [~] **PF-001 — Shared Save & Friend Play panel.** It is merged across supported puzzle routes and passed Vercel preview build.
- [~] **PF-002 — 3×3 save and friend play.** Shared controls exist; full two-account production verification remains.
- [~] **PF-003 — 4×4 save and friend play.** Shared controls exist; native automatic scramble loading and verification remain.
- [~] **PF-004 — 5×5 save and friend play.** Shared controls exist; native automatic scramble loading and verification remain.
- [~] **PF-005 — NxN save and friend play.** Shared controls exist; each supported size needs exact notation and browser testing.
- [~] **PF-006 — Pyraminx save and friend play.** Shared controls exist; native automatic loading and two-account testing remain.
- [~] **PF-007 — Kilominx save and friend play.** Memory exists and friend sending is merged; full production verification remains.
- [ ] **PF-008 — Add native load listeners to every engine.** Make saved or challenged scrambles automatically reset and apply.
- [ ] **PF-009 — Validate notation per puzzle.** Reject unsupported, malformed, or wrong-puzzle scrambles safely.
- [ ] **PF-010 — Add serialized-state support.** Save manual cube entries and non-scramble states with a versioned schema.
- [ ] **PF-011 — Test guest behavior.** Confirm guests receive clear sign-in prompts for account-backed features.
- [ ] **PF-012 — Run two-account tests.** Verify send, receive, open, play, submit, and result storage for every puzzle.
- [ ] **PF-013 — Verify memory database rows.** Check `solver_memories`, `scrambles`, and related ownership policies in production.
- [ ] **PF-014 — Add challenge result/rematch page.** Show both results and allow a new challenge on the same or new scramble.

# Phase 9 — Daily challenges

- [~] **D-001 — 3×3 daily challenge prototype.** A shared daily scramble and tracked attempt foundation exist.
- [ ] **D-002 — Create the daily-challenge table/service.** Store date, puzzle type, scramble, generator version, rules, and active window.
- [ ] **D-003 — Build the daily scheduler.** Generate and publish official scrambles at a fixed UTC time.
- [ ] **D-004 — Make daily records immutable.** Prevent official scrambles and rules from changing after publication.
- [ ] **D-005 — Add 3×3 production daily challenge.** Replace prototype behavior with the official scheduled service.
- [ ] **D-006 — Add 4×4 daily challenge.** Give every player the same official 4×4 scramble.
- [ ] **D-007 — Add 5×5 daily challenge.** Give every player the same official 5×5 scramble.
- [ ] **D-008 — Add Pyraminx daily challenge.** Use validated Pyraminx notation and exact shared state.
- [ ] **D-009 — Add Kilominx daily challenge.** Use validated Kilominx notation and exact shared state.
- [ ] **D-010 — Add supported NxN daily categories.** Keep each cube size separate.
- [ ] **D-011 — Enforce one ranked attempt.** Allow one official ranked attempt per account, puzzle, and day.
- [ ] **D-012 — Allow practice after ranking.** Let users replay without replacing the official result.
- [ ] **D-013 — Separate assisted attempts.** Track undo, solver help, and other assistance in distinct categories.
- [ ] **D-014 — Add guest play.** Let guests try the challenge but require sign-in to rank.
- [ ] **D-015 — Add reconnect protection.** Prevent duplicate official attempts after retries or connection loss.
- [ ] **D-016 — Add daily streaks.** Award deterministic participation/completion streaks without gambling mechanics.
- [ ] **D-017 — Add daily result page.** Show time, moves, rank, percentile, category, and friend comparisons.
- [ ] **D-018 — Add daily history.** Let users review previous daily attempts and missed days.

# Phase 10 — Leaderboards and anti-cheat

- [~] **LB-001 — Mobile leaderboard prototype.** The page exists but the production ranking service is incomplete.
- [~] **LB-002 — Tracked 3×3 leaderboard data.** Eligible attempt rows exist but require trusted validation and production QA.
- [ ] **LB-003 — Build the ranking service.** Query only eligible, non-test, non-overridden attempts.
- [ ] **LB-004 — Add 3×3 daily leaderboard.** Rank official daily 3×3 attempts.
- [ ] **LB-005 — Add 3×3 all-time leaderboard.** Rank trusted 3×3 results separately from daily events.
- [ ] **LB-006 — Add 4×4 leaderboards.** Create daily, monthly, all-time, friends, and personal views.
- [ ] **LB-007 — Add 5×5 leaderboards.** Create daily, monthly, all-time, friends, and personal views.
- [ ] **LB-008 — Add Pyraminx leaderboards.** Create puzzle-specific ranking categories.
- [ ] **LB-009 — Add Kilominx leaderboards.** Create puzzle-specific ranking categories.
- [ ] **LB-010 — Add NxN leaderboards by size.** Never combine different cube sizes.
- [ ] **LB-011 — Add friends leaderboards.** Limit results to accepted friends.
- [ ] **LB-012 — Add monthly leaderboards.** Reset display periods without deleting historical results.
- [ ] **LB-013 — Add personal rank and percentile.** Show a user’s placement without exposing unnecessary personal data.
- [ ] **LB-014 — Add opt-in regional leaderboards.** Use coarse, privacy-safe location only with user consent.
- [ ] **LB-015 — Add server-issued attempt tokens.** Bind an attempt to the official puzzle, scramble, user, and time window.
- [ ] **LB-016 — Add impossible-time detection.** Flag physically implausible or malformed results.
- [ ] **LB-017 — Add move-count plausibility checks.** Flag inconsistent or impossible move histories.
- [ ] **LB-018 — Add duplicate-attempt detection.** Prevent repeated official submissions for one ranked event.
- [ ] **LB-019 — Add assistance detection.** Separate undo, solver playback, manual entry, and other assisted runs.
- [ ] **LB-020 — Add suspicious-result review.** Let admins inspect evidence, uphold, reclassify, or remove a result.
- [ ] **LB-021 — Add result appeals.** Let users challenge moderation decisions.
- [ ] **LB-022 — Add verified-result badges.** Display verification only when evidence standards are met.

# Phase 11 — Puzzle quality and solver correctness

- [ ] **Q-001 — Add 3×3 solver regression fixtures.** Test known valid, invalid, edge, and random states.
- [ ] **Q-002 — Add 4×4 solver regression fixtures.** Verify reduction and playback against representative states.
- [ ] **Q-003 — Add 5×5 solver regression fixtures.** Verify the interim solver and future deterministic solver.
- [x] **Q-004 — Kilominx engine tests.** Geometry, invariants, round trips, and random solves are covered in the merged tests.
- [ ] **Q-005 — Add Pyraminx regression fixtures.** Verify scramble, inverse, solver, and playback behavior.
- [ ] **Q-006 — Finish deterministic 5×5 solver.** Complete and verify the current WIP implementation.
- [ ] **Q-007 — Add 5×5 manual-state parity.** Support arbitrary-state entry at the same quality level as smaller cubes.
- [ ] **Q-008 — Define the 6×6+ solver strategy.** Decide what can be solved locally, on a server, or through guided reduction.
- [ ] **Q-009 — Build camera scanning.** Capture puzzle state from photos or video with explicit privacy controls.
- [ ] **Q-010 — Set mobile performance budgets.** Define frame-rate, load-time, memory, and device-support targets.
- [ ] **Q-011 — Test low-end Android devices.** Verify rendering, touch, heat, memory, and responsiveness.
- [ ] **Q-012 — Test iPhone and iPad.** Verify Safari layout, canvas, touch, and form controls.
- [ ] **Q-013 — Test desktop browsers.** Cover current Chrome, Edge, Firefox, and Safari.

# Phase 12 — Missing product pages

- [ ] **MP-001 — Build `/pricing`.** Present Free and Premium features with honest billing disclosures.
- [ ] **MP-002 — Build `/profile/billing`.** Let users view and manage subscriptions.
- [ ] **MP-003 — Build checkout success page.** Explain that access is confirmed by the verified webhook.
- [ ] **MP-004 — Build checkout canceled page.** Return users safely after abandoning payment.
- [ ] **MP-005 — Build Privacy Choices page.** Provide legally required advertising and data-use opt-outs.
- [~] **MP-006 — Build Cookie Settings page or modal.** Both exist: a reopenable modal (`components/CookieConsent.tsx`) and a standing `/cookies/settings` page with the live inventory; production verification remains.
- [ ] **MP-007 — Build DMCA page.** Publish copyright reporting and counter-notice instructions.
- [ ] **MP-008 — Build Community Guidelines page.** Publish social and competitive conduct rules.
- [ ] **MP-009 — Build Accessibility page.** Publish accessibility status and feedback contact.
- [ ] **MP-010 — Build Security page.** Publish vulnerability-reporting expectations.
- [ ] **MP-011 — Build daily challenge hub.** Let users choose today’s puzzle challenge.
- [ ] **MP-012 — Build per-puzzle leaderboard pages.** Give each puzzle and NxN size its own rankings.
- [ ] **MP-013 — Build monthly leaderboard pages.** Show current and archived periods.
- [ ] **MP-014 — Build friends leaderboard pages.** Show rankings among accepted friends.
- [ ] **MP-015 — Build challenge results page.** Compare players and allow rematches.
- [ ] **MP-016 — Build saved-memory library.** Centralize all saved puzzle states, scrambles, folders, notes, and filters.
- [ ] **MP-017 — Build report/block interface.** Make safety actions available from profiles and challenges.
- [ ] **MP-018 — Build notifications center.** Show friend, challenge, moderation, billing, and system events.
- [ ] **MP-019 — Build collection editor.** Add, edit, and remove cubes from a user’s collection.
- [ ] **MP-020 — Build avatar upload.** Include moderation, file validation, cropping, and deletion.
- [ ] **MP-021 — Build complete Learn lessons.** Add beginner and advanced material beyond the landing page.
- [ ] **MP-022 — Build site search.** Search lessons, news, puzzles, and help content.
- [ ] **MP-023 — Build News CMS.** Let authorized staff draft, review, publish, edit, and archive posts.
- [ ] **MP-024 — Build arcade detail pages.** Give each original game rules, play, history, and leaderboard views.

# Phase 13 — Admin and operations gaps

- [~] **A-001 — Admin portal foundation.** The protected admin system is merged but awaits production activation and verification.
- [ ] **A-002 — Test all admin roles.** Verify Owner, Admin, Moderator, Analyst, and denied permissions.
- [ ] **A-003 — Test user suspension.** Confirm scope, notices, audit logs, and restoration.
- [ ] **A-004 — Complete moderation workflow.** Connect reports, evidence, actions, appeals, and history.
- [ ] **A-005 — Add copyright request queue.** Track notices, counter-notices, deadlines, and repeat infringers.
- [ ] **A-006 — Add privacy request dashboard.** Manage verification, deadlines, export, deletion, and appeals.
- [ ] **A-007 — Add refund administration.** Review, approve, process, and audit refunds.
- [ ] **A-008 — Add chargeback tracking.** Record disputes, evidence, outcomes, and account effects.
- [ ] **A-009 — Add consent audit view.** Show consent version, categories, timestamps, and withdrawal.
- [ ] **A-010 — Add anti-cheat case review.** Combine attempt evidence, flags, actions, and appeals.
- [ ] **A-011 — Add rate-limit dashboard.** Review abuse patterns and adjust thresholds safely.
- [ ] **A-012 — Complete carousel slide editor.** Create, reorder, schedule, preview, and archive slides.
- [ ] **A-013 — Complete affiliate activation controls.** Approve products, disclosures, links, and placement windows.
- [ ] **A-014 — Add content publication workflow.** Require draft, review, approval, publish, and rollback states.

# Phase 14 — Accessibility and quality assurance

- [ ] **AC-001 — Run keyboard audit.** Ensure every action is operable without touch or a mouse.
- [ ] **AC-002 — Run screen-reader audit.** Verify names, roles, states, headings, and announcements.
- [ ] **AC-003 — Run contrast audit.** Check text, controls, focus, charts, and status indicators.
- [ ] **AC-004 — Add reduced-motion behavior.** Reduce or disable nonessential animation when requested.
- [ ] **AC-005 — Add nonvisual puzzle alternatives.** Provide accessible controls or equivalent methods where practical.
- [ ] **AC-006 — Audit forms and errors.** Ensure labels, instructions, validation, and error recovery are accessible.
- [ ] **AC-007 — Caption and transcribe media.** Add captions, transcripts, and meaningful alternative text.
- [ ] **AC-008 — Test zoom and reflow.** Verify usability at high text zoom and narrow widths.
- [ ] **AC-009 — Add accessibility feedback workflow.** Track reports, severity, fixes, and responses.
- [ ] **AC-010 — Create the cross-device release checklist.** Require device, browser, account, payment, and accessibility proof before releases.

# Phase 15 — Content, SEO, and growth

- [ ] **G-001 — Finish the beginner 3×3 course.** Provide complete, tested, accessible lessons.
- [ ] **G-002 — Add 4×4 reduction lessons.** Teach centers, edge pairing, parity, and solving flow.
- [ ] **G-003 — Add 5×5 reduction lessons.** Teach centers, edge pairing, and parity handling.
- [ ] **G-004 — Add Pyraminx lessons.** Cover notation, beginner method, and practice.
- [ ] **G-005 — Add Kilominx lessons.** Cover puzzle structure, notation, reduction, and practice.
- [ ] **G-006 — Build the algorithm library.** Add searchable, animated, and accessible algorithms.
- [ ] **G-007 — Add structured metadata.** Improve search-engine understanding of lessons, games, and articles.
- [ ] **G-008 — Generate the sitemap.** Include canonical public pages and exclude private/admin pages.
- [ ] **G-009 — Verify Search Console.** Confirm ownership, indexing, sitemap submission, and major errors.
- [ ] **G-010 — Add first-party analytics.** Measure product usage after consent and privacy controls are ready.
- [ ] **G-011 — Choose approved ad placements.** Keep ads away from critical puzzle controls and child-sensitive areas.
- [ ] **G-012 — Curate approved affiliate products.** Verify claims, images, links, pricing language, and disclosure.
- [ ] **G-013 — Add conversion tracking.** Measure subscriptions and affiliate outcomes without unlawful tracking.

# Phase 16 — Advanced product roadmap

- [ ] **F-001 — Build ghost races.** Let players race a recorded performance with clear assistance labeling.
- [ ] **F-002 — Build private multiplayer rooms.** Add invitations, readiness, synchronized starts, and result validation.
- [ ] **F-003 — Build public matchmaking.** Add skill matching, abuse controls, disconnect rules, and moderation.
- [ ] **F-004 — Build clubs.** Add membership, roles, privacy, moderation, and club leaderboards.
- [ ] **F-005 — Build tournaments.** Add formats, brackets, rules, schedules, validation, and dispute handling.
- [ ] **F-006 — Add original arcade games.** Require rules, safety, persistence, accessibility, and leaderboard design.
- [ ] **F-007 — Expand PWA support.** Verify installation, offline behavior, updates, and push only with consent.
- [ ] **F-008 — Evaluate native apps.** Decide whether iOS/Android apps add enough value after the web product is stable.

---

# Recommended 1-by-1 execution order

Start here and do not move to the next item until the current one is completed or explicitly blocked:

1. **L-001 — Choose the legal operator.**
2. **L-002 — Record the legal business name.**
3. **L-003 — Record the business address.**
4. **L-004 — Create official contact addresses.**
5. **L-009 — Choose the minimum account age.**
6. **I-001 — Apply all Supabase migrations.**
7. **I-003 — Configure the service-role key.**
8. **I-004 — Create the private media bucket.**
9. **I-005 — Bootstrap the Owner account.**
10. **S-001 — Complete production RLS verification.**
11. **P-002 — Finalize the Privacy Policy.**
12. **P-004 — Finalize the Terms.**
13. **P-006 through P-009 — Complete cookie and consent controls.**
14. **S-010 through S-012 — Complete block, report, and moderation.**
15. **B-001 through B-005 — Approve the payment and paywall decisions.**
16. **B-009 through B-027 — Activate and test Stripe subscriptions.**
17. **PF-008 through PF-014 — Finish native save/friend-play behavior and testing.**
18. **D-002 through D-018 — Build the production daily-challenge system.**
19. **LB-003 through LB-022 — Build trustworthy per-puzzle leaderboards.**
20. **AC-001 through AC-010 — Complete accessibility and release QA.**

## Completion rule

The project is not considered paid-launch ready until every Phase 1–7 launch blocker is either `[x]` or formally marked not applicable with written legal or technical justification.
