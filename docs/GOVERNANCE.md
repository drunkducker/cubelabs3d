# Cube Labs 3D Governance

**Consolidated:** 2026-07-27

This is the canonical contributor contract. Read this file before meaningful
repository work, then read `CURRENT_STATUS.md` and the reference document for
the system being changed.

The project constitution, contributor workflow, and coding standards are
preserved below with their former source filenames for provenance. Filing
instructions have been normalized to the consolidated structure. New
governance rules belong in this file instead of a new Markdown file.

---

## Project constitution

> Consolidated from `docs/CONSTITUTION.md` on 2026-07-27. The source path remains
> recorded here so repository history can recover the exact earlier file.

<!-- BEGIN CONSOLIDATED SOURCE: docs/CONSTITUTION.md -->
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

Any necessary structural change requires approval, an update to `ARCHITECTURE.md`, a numbered entry in `DECISIONS.md`, an evidence entry in `HISTORY.md`, migration notes, and rollback notes.

## 5. Documentation is part of the feature

A feature is not complete until its implementation, tests, permanent documentation, `HISTORY.md` evidence entry, and required `DECISIONS.md` record are complete.

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
- `HISTORY.md` is updated;
- a `DECISIONS.md` record exists when required;
- deployment state is recorded;
- rollback information exists for risky changes.
<!-- END CONSOLIDATED SOURCE: docs/CONSTITUTION.md -->

---

## AI and contributor workflow

> Consolidated from `docs/AI-INSTRUCTIONS.md` on 2026-07-27. The source path remains
> recorded here so repository history can recover the exact earlier file.

<!-- BEGIN CONSOLIDATED SOURCE: docs/AI-INSTRUCTIONS.md -->
# AI Instructions for Cube Labs 3D

Every AI agent working on this repository must follow these instructions before changing code.

## Required reading

Read, in order:

1. `docs/README.md`
2. `docs/GOVERNANCE.md`
3. `docs/CURRENT_STATUS.md`
4. the canonical reference related to the task
5. relevant entries in `docs/HISTORY.md` when prior evidence matters
6. relevant records in `docs/DECISIONS.md` for structural constraints

## Before coding

- Confirm the active branch and deployment target.
- Confirm the current remote PR head separately from the local commit; app-based
  publishing may preserve the tree while assigning a different commit SHA.
- Inspect existing shared components before creating new ones.
- Identify which permanent documents must change with the feature.
- Read the current status, relevant reference section, and latest applicable
  history entry before diagnosing a reported regression.
- Protect approved layouts and unrelated pages.
- Confirm whether the task affects authentication, security, user data, admin privileges, ads, rankings, migrations, or provider independence.

## Implementation rules

- Design and validate mobile first.
- Preserve the existing hero cube and approved homepage layout unless the owner explicitly requests a redesign.
- Reuse shared components and shared engine behavior.
- Keep provider-specific code out of visual page components.
- Never hard-code managed advertisements or affiliate campaigns.
- Never expose service-role keys, SMTP credentials, private tokens, or privileged APIs.
- Enforce authorization server-side.
- Clearly mark generated test data and exclude it from public results.
- Add useful comments explaining non-obvious decisions and behavior.

## Documentation and logging

Every meaningful change must be logged in the documented structure. Update the
canonical reference and append one evidence entry to `HISTORY.md`. Add a
numbered record to `DECISIONS.md` when the change affects:

- project structure;
- system boundaries;
- data ownership;
- database schema strategy;
- provider choice;
- security model;
- public identifiers;
- ranking rules;
- managed advertising behavior;
- test-data isolation;
- approved UX conventions.

The history entry must include the date, author/agent, branch, purpose,
affected systems, tests, deployment status, known issues, migration impact,
and rollback notes when applicable.

Do not postpone documentation until a later conversation. Before saying a task
is complete:

- update `CURRENT_STATUS.md` when the active head, PR, production baseline, or
  priorities changed;
- update `ROADMAP.md` without promoting branch-only work to `[x]`;
- update the canonical feature reference;
- append one checked/completed/unverified record to `HISTORY.md`;
- add a numbered `DECISIONS.md` entry when the decision boundary requires it;
- update the same records again after a push, deployment result, or merge.

Historical entries stay intact. Add a new superseding entry instead of
rewriting what was accurately known at the earlier time.

## Completion reporting

Do not say a change is complete unless it has been verified. Distinguish clearly between:

- planned;
- coded;
- committed;
- merged;
- deployed;
- tested on desktop;
- tested on a real or emulated mobile device;
- blocked.

## Prohibited behavior

An AI agent may not:

- silently reorganize the repository;
- replace approved designs while fixing unrelated code;
- duplicate an existing shared system;
- bypass the application data layer;
- place test records into real leaderboards;
- weaken RLS or admin authorization to fix an error;
- claim background work is occurring;
- claim a commit or deployment exists without checking.

## Handoff requirement

At the end of a substantial task, record:

- what changed;
- current branch and commit;
- deployment URL or deployment status;
- tests completed;
- remaining issues;
- next recommended action;
- documentation files updated.

If local and hosted commits differ, include both SHAs and the verified tree
relationship. If documentation is still uncommitted, say so explicitly.
<!-- END CONSOLIDATED SOURCE: docs/AI-INSTRUCTIONS.md -->

---

## Coding standards

> Consolidated from `docs/CODING-STANDARDS.md` on 2026-07-27. The source path remains
> recorded here so repository history can recover the exact earlier file.

<!-- BEGIN CONSOLIDATED SOURCE: docs/CODING-STANDARDS.md -->

> Consolidated from `docs/CODING-STANDARDS.md` (2026-07-27 expanded version) during the Skewb reconciliation merge. Links were flattened to plain text; the routing owners are listed in `README.md`.

# Cube Labs 3D Coding Standards

This is the authoritative implementation guide for Cube Labs 3D. It applies to
all public pages, puzzle pages, solvers, profiles, social features, managed
content, APIs, and administration.

The purpose of this document is to keep the site visually consistent, keep the
application plumbing hierarchical, protect the puzzle engines from UI churn,
and reduce context rot between developers, AI sessions, branches, and handoffs.

## 1. Non-negotiable principles

1. **One product, one system.** New pages extend the existing design and
   architecture; they do not invent a parallel mini-site.
2. **Pages compose; shared systems implement.** Route files should be thin and
   assemble reusable shells, sections, controls, and feature components.
3. **Dependencies flow downward.** UI calls application services; services call
   provider adapters; adapters call Supabase or another external provider.
4. **Puzzle truth lives in engines.** Renderers and controls display and request
   moves; they do not become alternate sources of puzzle state.
5. **Mobile is the primary viewport.** Desktop enhances the mobile experience;
   it does not replace or hide broken mobile behavior.
6. **Proof beats assumption.** A green build proves compilation, not working
   navigation, correct gestures, successful persistence, or production readiness.
7. **Improve the canonical path.** Reuse or refactor the approved component
   instead of copying it and allowing two versions to drift.

## 2. Required hierarchy

### Public application flow

```text
app/**/page.tsx and public UI components
        ↓
feature/application services in lib/*
        ↓
provider adapters and server-only clients
        ↓
Supabase / PostgreSQL / Auth / Storage / Email / Realtime
```

### Puzzle flow

```text
page or feature controller
        ↓
shared puzzle experience / controls
        ↓
engine API and canonical puzzle state
        ↓
notation, serialization, validation, solver integration

canonical puzzle state
        ↓
Three.js renderer / net renderer / status UI
```

### Admin flow

```text
components/admin/* and app/admin/**
        ↓
app/admin/actions/* and app/api/admin/*
        ↓
lib/admin/* services
        ↓
lib/admin/service-client.ts
        ↓
Supabase / PostgreSQL / Auth / Storage
```

### Dependency rules

- A page may import components, types, and public application services.
- A visual component must not import a privileged provider client.
- A provider adapter must not import React or a page component.
- An engine must not import page layouts, toasts, navigation, account state,
  advertisements, or database clients.
- Shared components must not import route-specific page modules.
- Cross-feature imports must go through an intentional shared module, not a
  deep relative path into another feature's internals.
- Use the `@/` alias for project imports. Avoid brittle `../../../` paths.

If a dependency would point upward or sideways across these boundaries, move
shared behavior down into a service, engine helper, shared hook, or component.

## 3. Page construction contract

Every public page should follow the same top-level order unless the product
experience requires a documented exception:

```text
root layout providers
  site/page shell
    header or page heading
    primary content
    supporting sections
    managed content placements
    footer or mobile navigation
  global feedback and puzzle actions
```

### Route files

`app/**/page.tsx` files should normally:

- define route metadata when needed;
- load server data or call a feature-level loader;
- select the correct shared shell;
- compose named sections in reading order;
- provide route-specific copy and configuration;
- avoid containing a second design system or a large engine implementation.

When a route file becomes difficult to scan, extract feature components by
responsibility. Do not split code merely to reduce line count; split it when a
name creates a useful boundary.

### Page states

Every data-backed page must intentionally implement:

- loading or pending state;
- empty state;
- recoverable error state;
- unavailable/permission state where applicable;
- success feedback after mutations.

Do not leave users with a blank area, raw exception, silent failed button, or a
control that appears to work but does nothing.

### Navigation integrity

- Every visible internal link must resolve to a real route.
- Incomplete destinations must be hidden, disabled with an explanation, or
  backed by an intentional placeholder page.
- Do not create duplicate routes for the same product concept without an ADR.
- Puzzle names, sizes, and route slugs must be generated from a shared registry
  when the same information appears in navigation, play pages, and solvers.
- Preserve query parameters only when they are part of the documented flow.

## 4. Theme and visual consistency

The theme is a system of tokens and reusable patterns, not a collection of
page-specific hex values.

### Source of truth

- Global colors, surfaces, text levels, borders, shadows, radii, spacing, and
  motion values belong in `app/globals.css` as CSS custom properties or in the
  approved Tailwind configuration.
- Components consume semantic tokens such as background, panel, muted text,
  accent, success, warning, and danger.
- Do not hard-code a new color because it looks close to an existing one.
- When a new token is necessary, name it by purpose rather than by appearance.

### Shared visual primitives

Prefer shared implementations for:

- site header and mobile bottom navigation;
- page shell and content-width containers;
- headings and section introductions;
- buttons, icon buttons, links, tabs, and segmented controls;
- cards, panels, dialogs, drawers, and popovers;
- inputs, selects, textareas, validation messages, and form actions;
- toast/status feedback;
- puzzle action bars, timer displays, move controls, and save/resume controls;
- managed ad slots, carousels, and affiliate cards;
- loading, empty, error, and locked states.

Before creating a component, search for an existing component that owns the
same behavior. Extend it with a small, typed variant when the difference is
legitimate. Do not copy its markup and styles into a new file.

### Responsive behavior

- Start at the narrow mobile layout and progressively enhance.
- Primary touch targets must be at least 44 by 44 CSS pixels.
- Respect safe-area insets for fixed top or bottom controls.
- Do not rely on hover for required information or actions.
- Avoid horizontal page scrolling. Puzzle viewports may pan only when that is an
  intentional part of the puzzle interaction.
- Test long labels, large numbers, validation text, and signed-in user content.
- Desktop layouts must preserve the same task order and terminology as mobile.

### Accessibility

- Use semantic elements before adding ARIA.
- All interactive controls must be keyboard reachable and visibly focused.
- Icon-only buttons require accessible names.
- Form fields require labels and useful error relationships.
- Status must never be communicated by color alone.
- Respect reduced-motion preferences for nonessential animation.
- Canvas-based puzzle experiences need adjacent textual status and controls.

## 5. Components and state ownership

### Component responsibilities

A component should have one clear reason to change. Prefer these categories:

- **primitive:** reusable visual control with no product data;
- **layout:** spacing and composition only;
- **feature component:** presents one product capability;
- **controller:** coordinates state, services, and feature components;
- **renderer:** displays canonical state without owning a second model.

### Server and client boundaries

- Default to server components.
- Add `"use client"` only at the smallest boundary that needs browser state,
  effects, event handlers, Canvas, or client-only APIs.
- Do not turn an entire page into a client component because one button needs an
  event handler.
- Pass serializable data across the server/client boundary.
- Mark privileged modules with `import "server-only"`.

### State rules

- Keep transient visual state local.
- Lift state only to the nearest common owner.
- Persisted or shared product state belongs behind an application service or API.
- URL state is appropriate for shareable navigation state, not secret or large
  puzzle snapshots.
- Do not mirror the same source of truth in React state, renderer objects, and
  engine state without an explicit synchronization contract.

## 6. Puzzle engines and renderers

The working 3x3 interaction is the reference experience. Other puzzles may
extend it, but must not silently change approved 3x3 behavior.

### Engine contract

Each puzzle engine should expose a small, typed API for the capabilities it
supports, such as:

- create solved state;
- create or load validated state;
- apply a move;
- apply a sequence;
- generate a scramble;
- test solved state;
- serialize and deserialize;
- validate notation and state;
- return history or undo information where supported.

Engine operations should be deterministic unless randomness is explicitly
injected. A move followed by its inverse must restore the prior state. Four
quarter turns of the same face or equivalent full rotation must restore state
where the puzzle's notation defines that behavior.

### Renderer contract

- Renderers receive canonical state and render it.
- Gesture resolvers translate user intent into engine moves.
- Renderers must not directly mutate a hidden alternate puzzle model.
- Camera, zoom, pan, selection, animation, and viewport state are rendering
  concerns; piece permutation and solved truth are engine concerns.
- Animation completion must reconcile to canonical engine state.
- Switching between 3D and net views must not alter puzzle state.

### Save and resume

- Save controls belong inside the site/puzzle experience, never as detached
  browser chrome or a visually unrelated element outside the page shell.
- Save the versioned canonical serialized state, puzzle type, size, orientation
  contract, move history metadata, and timestamps required to resume safely.
- Validate saved state server-side before persistence and again when loading.
- Signed-out users receive a clear sign-in requirement or local-only behavior;
  they do not receive a silent failure.
- Old save formats require a migration path or an explicit unsupported message.

### Adding a puzzle

Do not create a new puzzle page by copying a complete existing game file. Add or
extend:

1. the puzzle registry;
2. the engine and tests;
3. the renderer/geometry adapter;
4. shared puzzle controls or explicitly justified puzzle-specific controls;
5. play and solver route configuration;
6. serialization/version handling;
7. mobile interaction tests and documentation.

## 7. Services, providers, and data

### Application services

Pages and components should call intent-based functions such as:

- `getCurrentUser()`;
- `getProfile()`;
- `saveSolve()`;
- `savePuzzleState()`;
- `createChallenge()`;
- `getLeaderboard()`;
- `getActiveAds()`;
- `deleteUser()`.

Avoid exposing provider-shaped operations like raw table names and query chains
to the UI. Return domain objects and user-safe errors.

### Provider isolation

- Supabase URLs, keys, table calls, storage calls, and auth details remain in
  provider/server boundaries.
- Never expose service-role credentials through `NEXT_PUBLIC_*` variables.
- External provider responses are normalized before reaching UI code.
- Timeouts, missing configuration, and provider failures fail safely.
- Provider replacement should affect the adapter layer, not every page.

### Data integrity

- Validate all input server-side.
- Distinguish actual metrics from reported/test overrides.
- Test records require an explicit marker and are excluded from public rankings
  and production analytics by default.
- Public leaderboard eligibility is decided server-side.
- Database migrations are additive, idempotent, indexed, RLS-enabled, and include
  rollback guidance.
- Never rewrite existing gameplay rows to make a new feature easier.

## 8. Mutations, security, and errors

Every privileged mutation follows this shape:

1. `assertSameOrigin()` where applicable;
2. authenticate the active session;
3. authorize the requested permission server-side;
4. validate and normalize input;
5. call the application service/provider boundary;
6. write a redacted audit/security record where required;
7. revalidate affected paths or caches;
8. return or redirect with a user-safe result.

Additional rules:

- The browser is never trusted for role, ownership, leaderboard eligibility, or
  solved-state claims.
- Do not weaken RLS to make a feature work.
- URLs go through the shared safe URL validator. Text and arrays are length-capped.
- Raw database or provider errors must not be shown to users.
- Expected failures use typed results or known error classes; unexpected failures
  are logged with sensitive information redacted.
- Destructive actions require an intentional confirmation pattern.

## 9. TypeScript and naming

- Keep TypeScript strict and avoid `any`. Use `unknown` plus validation at
  external boundaries.
- Prefer domain types over anonymous object shapes repeated across files.
- Use discriminated unions for meaningful UI or operation states.
- Component and type names use PascalCase; functions and variables use camelCase;
  constants use UPPER_SNAKE_CASE only when they are truly constant configuration.
- Name booleans as predicates: `isSolved`, `canSave`, `hasPermission`.
- Name handlers by the event or intent: `handleSave`, `submitChallenge`.
- Avoid vague modules named `helpers`, `utils2`, `new`, `temp`, or `final`.
- Remove dead alternatives after the canonical implementation is approved.

## 10. Comments and documentation

Comments explain **why**, invariants, coordinate systems, security boundaries,
serialization formats, or non-obvious tradeoffs. They should not narrate code
that is already clear.

When behavior changes, update the smallest authoritative set:

- `docs/CURRENT_STATUS.md` for what is true now;
- `docs/ARCHITECTURE.md` for structural boundaries;
- this file for implementation rules;
- `docs/decisions/` for significant irreversible choices;
- `docs/CHANGELOG.md` for user/developer-visible changes;
- a dated checkpoint for complex handoff state;
- engine or feature docs for specialized contracts.

Do not create another status, standards, or architecture document when an
existing canonical document can be updated.

## 11. Context-rot prevention

Before changing code:

1. confirm the repository and branch;
2. read the newest current-status/checkpoint material relevant to the feature;
3. identify the canonical component, service, engine, and test files;
4. search for duplicate or older implementations;
5. define what must remain unchanged.

During the change:

- keep scope narrow;
- prefer a vertical feature slice over broad speculative infrastructure;
- update shared plumbing before patching many pages individually;
- record assumptions that cannot be verified;
- do not describe preview/test behavior as production behavior.

At handoff:

- list exact files changed;
- state what was run and what passed;
- state what was visually/browser tested;
- state what remains unverified;
- include database or deployment evidence when making those claims;
- update canonical docs instead of relying on chat history.

## 12. Testing and proof ladder

The project uses Vitest for pure logic and engine tests under `tests/`.

### Required automated coverage

Add or update tests for:

- engine moves, inverses, sequences, solved detection, and serialization;
- validation and normalization;
- permissions and redaction;
- campaign/managed-content selection;
- leaderboard eligibility and test-row exclusion;
- service transformations and error mapping;
- regressions found during browser testing.

Tests should assert observable contracts, not private implementation details.
Every bug fix should receive a regression test when the behavior can be tested
reliably outside the browser.

### Proof levels

Use this evidence ladder when reporting completion:

1. **Type/build proof:** `npm run build` succeeds.
2. **Unit proof:** `npm test` succeeds with relevant new coverage.
3. **Static route proof:** every visible internal link has a destination.
4. **Browser proof:** the feature works in a real browser at mobile and desktop
   sizes, including loading, empty, error, and success states.
5. **Integration proof:** persistence, auth, ownership, and multi-account flows
   create/read the expected provider records.
6. **Production proof:** deployed behavior and configuration are verified in the
   target environment.

Do not claim a higher proof level based on a lower one. A green build is not
browser proof. A browser demo with mock data is not production proof.

### Commands

```bash
npm run docs:check
npm run cc:check   # puzzles:check + modules:check
npm test
npm run build
```

`npm run cc:check` enforces the cookie-cutter. `puzzles:check` verifies, for
every puzzle in `lib/puzzles.mjs`, each feature of its three engines — solve
(solver, scramble, manual input, 3D solution playback, save/share), play
(playable, save result, leaderboard, achievements), and learn (interactive demo,
algorithms). `modules:check` verifies the site modules in `lib/modules.mjs`
(affiliate carousel, ad window, banner, YouTube carousel, footer). Both fail only
on a required item that is neither present nor waived. When you are still building
or A/B-testing, record a waiver with a reason (or mark it `experimental`) instead
of leaving an accidental gap — see ADR 0008 and the cookie-cutter contract in
`CUBE-ENGINE.md`.

The **site dictionary** in `lib/glossary.mjs` (`npm run glossary`, or
`npm run glossary -- "<word>"`) defines the project vocabulary — engine, module,
cookie-cutter, waiver, freedom hatch, and the rest — and maps each idea to the
real functions/variables/files it points at. Keep it current when we coin a word
or add a load-bearing symbol.

`npm run lint` is required only after the repository lint command is configured
to run non-interactively and reliably in CI. Until then, do not claim lint proof.

## 13. Definition of done for a page

A page is complete only when:

- it uses the approved shell, tokens, navigation, and shared primitives;
- its route and every visible destination resolve;
- mobile layout and touch targets are usable;
- loading, empty, error, permission, and success states are intentional;
- data access follows the service/provider hierarchy;
- puzzle pages preserve canonical engine ownership;
- accessibility basics are present;
- relevant unit tests pass;
- `npm run build` passes;
- browser behavior is verified and recorded;
- canonical documentation is updated when behavior or structure changed.

## 14. Prohibited patterns

Do not:

- copy a page to create a new theme variant;
- build page-specific headers, button systems, or card systems without a documented
  product requirement;
- hard-code managed ads, leaderboards, roles, puzzle catalogs, or provider URLs;
- access privileged Supabase operations from visual components;
- store authorization in client-controlled fields;
- mutate puzzle truth inside a renderer;
- maintain two active engines for the same puzzle without an ADR and migration plan;
- place core save/navigation controls outside the site shell;
- ship a clickable route that 404s;
- mark mocked, preview, test, or override data as live production truth;
- claim deployment or verification without checking it;
- solve repeated inconsistencies with repeated local patches when a shared
  component, token, registry, or service is the correct fix.

## 15. Review checklist

Review every change from the top of the hierarchy downward:

- **Product:** Is this consistent with the approved experience?
- **Route:** Does navigation flow and resolve correctly?
- **Page:** Is the route thin and composed from shared systems?
- **Component:** Is state owned once and behavior reusable?
- **Theme:** Are semantic tokens and approved primitives used?
- **Engine:** Is canonical puzzle truth preserved?
- **Service:** Is business behavior outside visual code?
- **Provider:** Are external details isolated and server-safe?
- **Data/security:** Are validation, ownership, RLS, and audit rules intact?
- **Tests:** Is the contract covered and the regression prevented?
- **Proof:** Are completion claims matched to actual evidence?
- **Docs:** Will the next developer understand the current truth without reading
  the chat that produced it?

<!-- END CONSOLIDATED SOURCE: docs/CODING-STANDARDS.md -->


<!-- BEGIN CONSOLIDATED SOURCE: docs/SOFTWARE-ENGINEERING-BEST-PRACTICES.md -->

> Consolidated from `docs/SOFTWARE-ENGINEERING-BEST-PRACTICES.md` on 2026-07-27 during the Skewb reconciliation merge. This textbook engineering reference is owned by GOVERNANCE. Links were flattened to plain text.

# Cube Labs 3D Software Engineering Best Practices

This document is the textbook software-engineering companion to
`docs/CODING-STANDARDS.md`.

- `CODING-STANDARDS.md` defines the project-specific architecture and required
  Cube Labs 3D conventions.
- This document defines the general programming principles used to judge code
  quality inside those boundaries.

When the two documents overlap, the more specific Cube Labs 3D rule wins.

## 1. Optimize for correctness, clarity, and change

Good code must:

1. produce the correct observable behavior;
2. communicate its intent to the next developer;
3. be testable without depending on unrelated systems;
4. allow likely changes without requiring a rewrite;
5. fail predictably and safely.

Do not optimize first for cleverness, minimum line count, abstraction count, or
personal style.

## 2. KISS: Keep It Simple

Choose the simplest design that fully satisfies the current requirement.

Prefer:

- direct control flow over hidden magic;
- a small named function over a configurable framework;
- standard language and React patterns over custom mechanisms;
- explicit data transformation over mutation spread across callbacks;
- one obvious execution path over several equivalent paths.

Complexity is justified only when it removes greater verified complexity.

Bad:

```ts
const result = pipe(input, normalize, hydrate, decorate, finalize);
```

when the pipeline is used once and hides important failure behavior.

Better:

```ts
const normalized = normalizePuzzleState(input);
const validated = validatePuzzleState(normalized);
return buildSavedPuzzle(validated);
```

## 3. YAGNI: You Aren't Gonna Need It

Do not build speculative flexibility.

Avoid:

- unused configuration flags;
- interfaces with only one implementation and no real replacement need;
- generic plugin systems for one feature;
- future puzzle modes that have no approved product requirement;
- database columns added only because they might be useful;
- abstractions designed around imagined providers.

Build the current vertical slice well. Extract a general mechanism after the
second real use reveals what is actually shared.

## 4. DRY: Don't Repeat Knowledge

DRY means one authoritative representation of a rule or fact. It does not mean
that every similar-looking line must be combined.

Centralize repeated knowledge such as:

- puzzle identifiers, names, sizes, and routes;
- theme tokens;
- permission names;
- validation limits;
- serialization versions;
- leaderboard eligibility rules;
- error-to-message mappings.

Do not combine code merely because its current syntax looks similar. Two pieces
of code that change for different reasons may remain separate.

A useful test is: **When this rule changes, how many places must be edited?**

## 5. SOLID principles

### Single Responsibility Principle

A module should have one primary reason to change.

Examples:

- an engine applies puzzle rules;
- a renderer displays puzzle state;
- a service performs a product operation;
- a provider adapter communicates with Supabase;
- a component presents one UI responsibility.

A file is not automatically wrong because it is long. It is wrong when unrelated
reasons for change are mixed together.

### Open/Closed Principle

Prefer extending stable contracts instead of editing many consumers.

Examples:

- add a typed puzzle-registry entry instead of adding puzzle-specific conditionals
  to every navigation component;
- add a button variant instead of duplicating button markup;
- add an engine adapter that satisfies an existing contract instead of changing
  every puzzle controller.

Do not force extension through inheritance. Composition and typed configuration
are usually safer in React and TypeScript.

### Liskov Substitution Principle

Any implementation of a shared contract must preserve that contract's promises.

A puzzle engine advertised as supporting undo must restore the exact previous
canonical state. A storage adapter advertised as saving state must not silently
omit fields required for resume.

Do not use a shared interface when implementations have fundamentally different
behavior. Split the capability into smaller explicit interfaces.

### Interface Segregation Principle

Consumers should depend only on capabilities they use.

Prefer:

```ts
interface SolvablePuzzle {
  isSolved(): boolean;
}

interface ScramblablePuzzle {
  createScramble(): Move[];
}
```

instead of one large interface that forces every puzzle to implement unsupported
features.

### Dependency Inversion Principle

High-level product behavior should depend on domain contracts, not provider
implementation details.

UI code requests `saveSolve(input)`. It should not know a Supabase table name,
query builder, storage bucket, or provider error format.

## 6. Separation of concerns

Keep these concerns distinct:

- presentation;
- interaction/controller state;
- domain rules;
- persistence;
- authentication and authorization;
- provider communication;
- logging and analytics;
- rendering and animation.

Separation does not require one file per concern. It requires clear boundaries
and dependency direction.

## 7. Cohesion and coupling

### High cohesion

Keep behavior and data that belong to the same concept together.

A puzzle-state serializer should contain the format version, validation, and
conversion rules needed for that format.

### Low coupling

Modules should know as little as possible about one another's internals.

Prefer passing a domain value or calling a public function instead of importing
another feature's internal state, constants, or private helper.

Avoid temporal coupling where functions must be called in an undocumented order.
When order matters, expose one operation that enforces it.

## 8. Composition over inheritance

Use small components and functions that are combined explicitly.

Prefer:

```tsx
<PageShell>
  <PageHeader />
  <PuzzleWorkspace />
  <PuzzleActions />
</PageShell>
```

instead of deep component class hierarchies or large components controlled by
many unrelated boolean props.

When a component accumulates flags such as `isCompact`, `isSolver`, `isAdmin`,
`isPuzzle`, and `isProfile`, reconsider its responsibility. Use named variants,
slots, or separate composed feature components.

## 9. Pure functions and controlled side effects

Pure functions are easier to reason about and test. Use them for:

- puzzle moves;
- validation;
- normalization;
- ranking eligibility;
- derived statistics;
- serialization transformations;
- permission decisions.

Keep side effects at explicit boundaries:

- network calls;
- database writes;
- browser storage;
- timers;
- analytics;
- DOM or Three.js mutation.

Do not hide side effects in functions named like simple getters or converters.

Bad:

```ts
function getProfile(userId: string) {
  analytics.track("profile_loaded");
  return database.loadProfile(userId);
}
```

The name hides both I/O and analytics behavior.

## 10. Immutability and state transitions

Prefer producing a new value instead of mutating shared state in place.

This is especially important for:

- canonical puzzle state;
- React state;
- cached data;
- undo history;
- server request data.

When mutation is required for performance or Three.js integration, isolate it
behind a clear adapter and reconcile it with the canonical immutable state.

Represent important transitions explicitly:

```ts
type SaveState =
  | { status: "idle" }
  | { status: "saving" }
  | { status: "saved"; savedAt: string }
  | { status: "error"; message: string };
```

This is safer than several booleans that can contradict each other.

## 11. Command-query separation

A query returns information and should not unexpectedly modify state.
A command changes state and should make that intent obvious.

Prefer:

- `getLeaderboard()` for reading;
- `submitSolve()` for writing;
- `isSolved(state)` for checking;
- `applyMove(state, move)` for transition.

Avoid functions that both answer a question and silently persist, navigate, or
mutate unrelated state.

## 12. Law of Demeter

A module should communicate with its direct collaborators, not reach through a
chain of internal objects.

Avoid:

```ts
session.user.profile.settings.theme.value
```

when the caller should receive a normalized `theme` value or call a domain
function. Deep chains expose internal structure and make changes ripple.

## 13. Defensive programming at boundaries

Trust internal invariants only after external data has been validated.

Validate and normalize:

- request bodies;
- route parameters;
- query strings;
- database records from older schemas;
- local-storage values;
- saved puzzle snapshots;
- provider responses;
- environment variables.

Use `unknown` at untrusted boundaries. Convert it once into a validated domain
type. Do not spread repeated defensive checks throughout trusted internal code.

## 14. Design by contract and invariants

Document and test conditions that must always remain true.

Puzzle examples:

- a valid move preserves the number and identity of pieces;
- applying a move and its inverse restores state;
- serialization followed by deserialization preserves canonical state;
- rendering does not alter solved truth;
- save/resume preserves puzzle type and version.

Service examples:

- users may modify only records they own unless explicitly authorized;
- test solves never enter public rankings;
- a successful challenge attempt references an existing challenge and scramble;
- privileged actions produce an audit record where required.

## 15. Fail fast, fail safely

Detect invalid assumptions near their source.

- Developer/configuration errors may throw with actionable internal detail.
- Expected user or domain failures should return typed, user-safe results.
- Security checks fail closed.
- Provider failure must not be reported as success.
- Partial writes require a transaction, compensation strategy, or explicit
  recoverable state.

Never catch an error only to ignore it.

Bad:

```ts
try {
  await saveSolve(input);
} catch {}
```

At minimum, log safely and return visible failure feedback.

## 16. Idempotency and retry safety

Operations that may be retried should not create accidental duplicates or
corrupt state.

Use stable identifiers, uniqueness constraints, upserts only where semantically
correct, and transaction boundaries where several writes form one operation.

Examples include:

- challenge creation;
- solve submission;
- save-state updates;
- webhook or scheduled processing;
- migrations.

Do not assume a network timeout means the provider did not complete the write.

## 17. Least privilege and secure defaults

Grant only the access required for the operation.

- privileged credentials remain server-only;
- authorization is checked for every protected action;
- ownership is verified server-side;
- responses contain only required fields;
- logs and audits redact secrets and sensitive personal data;
- new database tables use RLS and deny access until policies are intentional;
- missing configuration fails closed for privileged features.

Security is a correctness requirement, not a later hardening phase.

## 18. Naming and readability

Names should reveal intent and use the product vocabulary.

Prefer:

- `eligibleLeaderboardSolves` over `filteredData`;
- `deserializePuzzleState` over `parseThing`;
- `hasAdminPermission` over `check`;
- `scrambleAttempt` over `item`.

Functions should usually describe an action. Values and types should usually
describe a thing or condition.

Avoid abbreviations unless they are established project vocabulary. Avoid names
that encode temporary implementation history such as `newSolver`, `oldCube`,
`finalFinal`, or `fixedVersion`.

## 19. Function design

A good function:

- performs one coherent operation;
- has a name that states that operation;
- has explicit inputs and outputs;
- avoids hidden global dependencies;
- handles one abstraction level at a time;
- makes important failure behavior visible;
- is small enough to understand without excessive scrolling.

Do not enforce an arbitrary line limit. Extract when the new function creates a
meaningful name, reusable contract, test boundary, or separation of concerns.

Prefer an options object when several parameters have the same type or when call
sites become unclear:

```ts
submitSolve({ puzzleType, scrambleId, elapsedMs, moveCount });
```

## 20. Boolean and conditional design

Avoid boolean blindness.

Bad:

```ts
savePuzzle(state, true, false);
```

Better:

```ts
savePuzzle(state, {
  visibility: "private",
  includeHistory: false,
});
```

Use guard clauses to handle invalid or exceptional cases early. Avoid deeply
nested conditionals. Extract complex predicates into named functions and test
them directly.

## 21. Avoid premature optimization

Write correct, readable code first. Measure before optimizing.

Optimization is justified when there is evidence from profiling, user-visible
latency, memory pressure, frame-rate problems, or known algorithmic scale.

When optimization introduces mutation, caching, memoization, or lower-level
code, document:

- the measured problem;
- the invariant that must remain true;
- the tradeoff;
- the benchmark or test that prevents regression.

For puzzle rendering, keep performance optimizations outside the canonical
engine rules whenever practical.

## 22. React and Next.js practices

- Default to server components.
- Keep client boundaries small.
- Do not copy props into state unless the state intentionally diverges.
- Derive values during render when inexpensive instead of synchronizing them in
  an effect.
- Use effects for synchronization with external systems, not general control flow.
- Keep effect dependencies correct; do not silence dependency warnings without a
  documented reason.
- Use stable keys based on identity, not array index when order can change.
- Keep forms accessible and preserve pending/error/success states.
- Do not perform provider or privileged operations directly from visual code.
- Avoid unnecessary memoization. Use it after measuring or where identity is part
  of a required child/API contract.
- Handle route-level loading, error, and not-found behavior intentionally.

## 23. TypeScript practices

- Keep strict mode enabled.
- Prefer narrow domain types over `string` and `number` everywhere.
- Avoid `any`; use `unknown` and validate.
- Prefer discriminated unions for state machines and operation results.
- Do not use type assertions to bypass uncertainty unless an invariant is proved
  immediately beside the assertion.
- Avoid non-null assertions when absence is possible.
- Use exhaustive checks for important unions.
- Keep runtime validation at external boundaries because TypeScript types do not
  validate network, database, URL, or storage data.

Example exhaustive check:

```ts
function assertNever(value: never): never {
  throw new Error(`Unhandled state: ${String(value)}`);
}
```

## 24. API and service design

- Name operations by product intent.
- Accept validated domain-oriented input.
- Return normalized domain objects, not raw provider responses.
- Make authorization and ownership requirements explicit.
- Use consistent result and error shapes.
- Support pagination for potentially unbounded collections.
- Define ordering explicitly.
- Version persisted formats that may outlive a deployment.
- Avoid leaking database table structure into UI code.
- Keep read and write behavior independently testable.

## 25. Database practices

- Use constraints to protect invariants, not application code alone.
- Use foreign keys where relationships are real.
- Add indexes for verified query patterns.
- Avoid `select *` at durable service boundaries.
- Use transactions when several writes form one logical operation.
- Make migrations additive and reversible where practical.
- Never edit an already-applied migration to change production history; add a new
  migration.
- Preserve existing data unless a documented migration transforms it.
- Separate test/preview records from production analytics and ranking truth.

## 26. Testing principles

Follow the test pyramid:

1. many fast unit tests for pure rules;
2. focused integration tests for service/provider and database boundaries;
3. fewer browser tests for critical user journeys;
4. manual production verification for environment-specific behavior.

Tests should be:

- deterministic;
- isolated;
- readable as behavior specifications;
- focused on public contracts;
- independent of execution order;
- explicit about fixtures and test data;
- resistant to harmless implementation refactors.

Use Arrange, Act, Assert when it improves readability.

Test behavior, not private implementation:

```ts
it("restores state after a move and its inverse", () => {
  const start = createSolvedState();
  const moved = applyMove(start, "R");
  const restored = applyMove(moved, "R'");

  expect(restored).toEqual(start);
});
```

Every reproducible bug should receive a regression test at the lowest reliable
level.

## 27. Refactoring practices

Refactoring changes structure without intentionally changing observable
behavior.

Before refactoring:

- establish passing tests or characterization tests;
- identify the behavior that must remain unchanged;
- keep the scope separate from unrelated feature work when practical.

During refactoring:

- make small reversible steps;
- remove duplication only after identifying the shared rule;
- preserve public contracts or document migrations;
- run focused tests frequently;
- delete the replaced path after the canonical path is proven.

Do not leave `old`, `new`, and `backup` implementations active indefinitely.

## 28. Code review principles

Review code in this order:

1. correctness and user behavior;
2. security and data integrity;
3. architecture and dependency direction;
4. state ownership and side effects;
5. tests and failure cases;
6. readability and naming;
7. performance when evidence makes it relevant;
8. formatting and minor style.

A review should ask:

- What invariant does this rely on?
- What happens when input is missing, stale, duplicated, or malicious?
- Is there one source of truth?
- Can this be tested without rendering the entire site?
- Is a shared rule being duplicated?
- Does this make the next likely change easier or harder?
- Is completion supported by the claimed proof level?

## 29. Technical-debt rules

Technical debt is an intentional tradeoff, not a synonym for unfinished or
careless code.

When debt is accepted, record:

- the compromise;
- why it is acceptable now;
- the risk;
- the removal trigger;
- the owner or tracking issue when appropriate.

Do not use a TODO as a substitute for a design decision. TODOs must be specific
and actionable.

Bad:

```ts
// TODO fix this later
```

Better:

```ts
// TODO(#123): replace preview ranking after verified solve validation ships.
```

## 30. Boy Scout Rule

Leave the code you touch slightly better than you found it, while keeping the
change focused.

Appropriate improvements include:

- clearer names;
- removing dead imports;
- replacing a duplicated constant with the canonical one;
- adding a missing regression test;
- correcting a misleading comment.

Do not turn a small bug fix into an unreviewable rewrite.

## 31. Practical definition of clean code

For Cube Labs 3D, clean code means:

- the behavior is correct and proven at the appropriate level;
- the name and file location make the responsibility easy to find;
- dependencies point in the approved direction;
- domain rules are independent of visual and provider code;
- state has one authoritative owner;
- errors and edge cases are intentional;
- tests describe important contracts;
- future developers do not need chat history to understand why the code exists.

<!-- END CONSOLIDATED SOURCE: docs/SOFTWARE-ENGINEERING-BEST-PRACTICES.md -->
