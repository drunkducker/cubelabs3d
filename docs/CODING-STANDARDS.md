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
npm test
npm run build
```

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
