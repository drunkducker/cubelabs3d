# Cube Labs 3D Project Constitution

Status: authoritative

This document defines the non-negotiable rules for Cube Labs 3D. Human contributors and AI agents must follow it.

## 1. Mobile first

Every page and interaction is designed and validated for phones before desktop. Desktop layouts may enhance the mobile experience but may not replace or degrade it.

## 2. Preserve approved experiences

Approved layouts and interactions must not be redesigned without explicit approval. The homepage and hero cube experience are especially protected. The hero cube must remain touchable, responsive, and central to the product identity.

## 3. The playable cube is the core value

Cube interactions should feel like handling a physical puzzle digitally. Touch accuracy, clear highlighting, camera control, undo, reliable animation, and mobile performance take priority over decorative features.

## 4. Follow the documented structure

The repository structure, component boundaries, data layer, documentation layout, and naming rules defined in `/docs` must be followed.

No contributor may:

- create a parallel architecture without approval;
- move or rename major folders casually;
- bypass shared components for quick fixes;
- place provider-specific database calls throughout visual components;
- hard-code ads, affiliate campaigns, leaderboard results, or admin-only behavior into pages;
- alter an approved page while working on an unrelated feature.

Any necessary structural change requires approval, an update to `ARCHITECTURE.md`, an architecture decision record, changelog entry, migration notes, and rollback notes.

## 5. Documentation is part of the feature

A feature is not complete until its implementation, tests, permanent documentation, changelog entry, and required decision record are complete.

Every meaningful change must log:

- date and time;
- author or agent;
- branch;
- commit when available;
- purpose;
- files and systems affected;
- tests performed;
- deployment status;
- known issues;
- migration impact;
- rollback path.

Documentation must be filed in the correct location. Temporary progress notes do not replace permanent documentation.

## 6. Reusable systems over duplication

Shared navigation, layouts, cube controls, ad slots, carousels, profile cards, leaderboard views, challenge cards, and admin controls must be reusable components. Fixes belong in the shared source whenever the behavior is shared.

## 7. Database independence

Supabase is the current provider, not the permanent application architecture. Pages must use a Cube Labs data/service layer. Provider-specific logic stays isolated so PostgreSQL, authentication, storage, and realtime services can be replaced without rebuilding the UI.

Database migrations and schema definitions must be committed to the repository.

## 8. Security by default

Authorization is enforced server-side. Admin access, user deletion, role changes, challenge overrides, premium grants, ad publishing, and leaderboard corrections require protected server actions and audit logs.

Secrets and service-role credentials may never be exposed to the browser or committed to the repository.

## 9. Test data isolation

Admin-generated solves, wins, losses, friendships, challenges, achievements, and leaderboard entries must be marked as test data. Test data is excluded from public statistics and rankings unless an owner explicitly enables a test display mode.

## 10. Managed ads and affiliates

Ads, banners, carousel slides, sponsorships, and affiliate products are database-driven managed content. Pages render named placements through reusable components. Campaign content must not require code changes or deployments.

Sponsored and affiliate content must be clearly disclosed.

## 11. Clear code documentation

New code must explain purpose, inputs, outputs, dependencies, security assumptions, and the reason the code exists. Comments should clarify decisions and non-obvious behavior rather than restating syntax.

## 12. Honest status reporting

Contributors must not claim work is complete, deployed, tested, or committed unless it has been verified. Failures and uncertainty must be recorded directly.

## 13. Definition of done

A change is complete only when:

- implementation is finished;
- mobile behavior is verified;
- existing approved behavior is protected;
- security and data access are reviewed;
- tests are completed and recorded;
- documentation is updated in the proper structure;
- changelog is updated;
- an architecture decision record exists when required;
- deployment state is recorded;
- rollback information exists for risky changes.