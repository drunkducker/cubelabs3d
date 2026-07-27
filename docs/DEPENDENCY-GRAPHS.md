# Cube Labs 3D Dependency Graphs

This is the canonical visual map of Cube Labs 3D dependencies, data flow, state ownership, and documentation relationships.

It complements, but does not replace:

- [README.md](./README.md) — documentation index and workflow;
- [CONSTITUTION.md](./CONSTITUTION.md) — non-negotiable project rules;
- [VISION.md](./VISION.md) — product direction;
- [ARCHITECTURE.md](./ARCHITECTURE.md) — authoritative system boundaries;
- [CODING-STANDARDS.md](./CODING-STANDARDS.md) — project implementation rules;
- [SOFTWARE-ENGINEERING-BEST-PRACTICES.md](./SOFTWARE-ENGINEERING-BEST-PRACTICES.md) — general engineering principles;
- [AI-INSTRUCTIONS.md](./AI-INSTRUCTIONS.md) — required AI contributor workflow;
- [CURRENT_STATUS.md](./CURRENT_STATUS.md), [PROJECT-HEALTH.md](./PROJECT-HEALTH.md), [ROADMAP.md](./ROADMAP.md), [DAILY-LOG.md](./DAILY-LOG.md), and [CHANGELOG.md](./CHANGELOG.md) — current truth, evidence, priorities, and history.

Specialized contracts remain authoritative in [CUBE-ENGINE.md](./CUBE-ENGINE.md), [AUTHENTICATION.md](./AUTHENTICATION.md), [SOCIAL-AND-MULTIPLAYER.md](./SOCIAL-AND-MULTIPLAYER.md), [ADS-AFFILIATES.md](./ADS-AFFILIATES.md), [ADMIN-PORTAL.md](./ADMIN-PORTAL.md), [ADMIN-GUIDE.md](./ADMIN-GUIDE.md), [SECURITY.md](./SECURITY.md), [BACKUP-AND-MIGRATION.md](./BACKUP-AND-MIGRATION.md), and [decisions/](./decisions/).

Historical checkpoints and root-level handoff notes are evidence, not competing architecture. Fold durable conclusions into permanent documents and preserve the originals for history.

## 1. Documentation dependency graph

```mermaid
flowchart TD
  Constitution[CONSTITUTION.md] --> Architecture[ARCHITECTURE.md]
  Vision[VISION.md] --> Roadmap[ROADMAP.md]
  Architecture --> Graphs[DEPENDENCY-GRAPHS.md]
  BestPractices[SOFTWARE-ENGINEERING-BEST-PRACTICES.md] --> Standards[CODING-STANDARDS.md]
  Architecture --> Standards
  Graphs --> Standards
  Standards --> Implementation[Code and tests]
  EngineDoc[CUBE-ENGINE.md] --> Implementation
  AuthDoc[AUTHENTICATION.md] --> Implementation
  SocialDoc[SOCIAL-AND-MULTIPLAYER.md] --> Implementation
  AdsDoc[ADS-AFFILIATES.md] --> Implementation
  AdminDoc[ADMIN-PORTAL.md] --> Implementation
  SecurityDoc[SECURITY.md] --> Implementation
  MigrationDoc[BACKUP-AND-MIGRATION.md] --> Implementation
  ADRs[decisions/] --> Architecture
  Implementation --> Current[CURRENT_STATUS.md]
  Implementation --> Daily[DAILY-LOG.md]
  Implementation --> Changelog[CHANGELOG.md]
  Current --> Health[PROJECT-HEALTH.md]
  Roadmap --> Current
  Checkpoints[checkpoints and handoffs] -. historical evidence .-> Current
```

**Rule:** when two documents disagree, resolve the conflict immediately. The permanent specialized document owns its subject; `CURRENT_STATUS.md` owns what is true now.

## 2. Whole-system dependency graph

```mermaid
flowchart TD
  User[User] --> Routes[Next.js routes and layouts]
  Routes --> Pages[Server pages and feature controllers]
  Pages --> Components[Shared and feature components]
  Components --> Services[Application services]
  Pages --> Services
  Services --> Engines[Puzzle engines and domain logic]
  Services --> Providers[Provider adapters and server-only clients]
  Providers --> Supabase[(Supabase / PostgreSQL / Auth / Storage / Realtime)]
  Engines --> Renderers[Three.js and net renderers]
  Components --> Renderers
  Services --> Managed[Managed content selection]
  Managed --> Providers
  AdminUI[Protected admin UI] --> AdminActions[Server actions and routes]
  AdminActions --> AdminServices[Admin services]
  AdminServices --> ServiceRole[Server-only service-role adapter]
  ServiceRole --> Supabase
```

Dependencies flow downward. UI must not bypass services to reach privileged providers. Engines must not import React, navigation, advertising, account state, or database clients. See [ARCHITECTURE.md](./ARCHITECTURE.md) and [CODING-STANDARDS.md](./CODING-STANDARDS.md).

## 3. Public page composition graph

```mermaid
flowchart TD
  Root[app/layout.tsx providers] --> Shell[Shared site or page shell]
  Shell --> Header[Header or page heading]
  Shell --> Primary[Primary feature content]
  Shell --> Supporting[Supporting sections]
  Shell --> Placements[Managed content placements]
  Shell --> Navigation[Footer and mobile navigation]
  Root --> Feedback[Toast and global feedback]
  Root --> PuzzleActions[Universal puzzle actions]
  Primary --> Loading[Loading state]
  Primary --> Empty[Empty state]
  Primary --> Error[Recoverable error state]
  Primary --> Permission[Unavailable or permission state]
  Primary --> Success[Mutation success feedback]
```

Every visible route and CTA must resolve. Shared shells, tokens, controls, and states are defined in [CODING-STANDARDS.md](./CODING-STANDARDS.md).

## 4. Puzzle dependency graph

```mermaid
flowchart TD
  PuzzleRoute[Play or solver route] --> Controller[Puzzle experience controller]
  Controller --> Controls[Shared puzzle controls]
  Controller --> EngineAPI[Typed engine API]
  Controls --> Gesture[Gesture and input resolver]
  Gesture --> EngineAPI
  EngineAPI --> State[Canonical puzzle state]
  EngineAPI --> Notation[Move notation]
  EngineAPI --> Validation[State and move validation]
  EngineAPI --> Serialization[Versioned serialization]
  EngineAPI --> History[History, undo, scramble]
  EngineAPI --> Solver[Solver integration]
  State --> Renderer3D[Three.js renderer]
  State --> RendererNet[Net renderer]
  State --> Status[Timer, solved status, move count]
  Serialization --> Memory[Save and resume service]
  Status --> SolveReport[Solve reporting service]
```

The engine is the source of puzzle truth. Renderers display state; they do not maintain a competing permutation model. The approved 3×3 interaction is the reference behavior. See [CUBE-ENGINE.md](./CUBE-ENGINE.md), engine-specific notes, and engine tests under `tests/`.

## 5. Puzzle family and reuse graph

```mermaid
flowchart TD
  Registry[Shared puzzle registry] --> Routes[Play and solver route configuration]
  Registry --> Metadata[Names, sizes, capabilities, slugs]
  Metadata --> SharedExperience[Shared puzzle experience]
  SharedExperience --> CubeEngine[Cube / NxN engine family]
  SharedExperience --> PyraminxEngine[Pyraminx engine]
  SharedExperience --> KilominxEngine[Kilominx engine]
  CubeEngine --> CubeRenderer[Cube renderer adapters]
  PyraminxEngine --> PyraminxRenderer[Pyraminx renderer adapter]
  KilominxEngine --> KilominxRenderer[Kilominx renderer adapter]
  SharedExperience --> SharedControls[Timer, scramble, reset, undo, save, challenge]
```

New puzzles extend the registry, engine contract, renderer adapter, tests, and route configuration. Do not clone a complete game page. Cross-reference [CUBE-ENGINE.md](./CUBE-ENGINE.md), `lib/cube-engine.ts`, `lib/nxn-cube.ts`, `lib/nxn-fast.ts`, `lib/pyraminx-engine.ts`, `lib/kilominx-engine.ts`, and related tests.

## 6. Authentication and Cube ID flow

```mermaid
sequenceDiagram
  participant U as User
  participant UI as Auth UI
  participant S as Server action/route
  participant A as Auth service/adapter
  participant P as Supabase Auth
  participant DB as Profiles/Cube ID data

  U->>UI: Sign up, sign in, recover, or sign out
  UI->>S: Validated request
  S->>A: Intent-based auth operation
  A->>P: Provider-specific call
  P-->>A: Session or safe error
  A->>DB: Read/create linked profile when required
  A-->>S: Normalized domain result
  S-->>UI: HTTP-only session and user-safe response
```

Provider details stay isolated and recovery redirects must be allowlisted. See [AUTHENTICATION.md](./AUTHENTICATION.md), [SECURITY.md](./SECURITY.md), and [BACKUP-AND-MIGRATION.md](./BACKUP-AND-MIGRATION.md).

## 7. Solve, scramble, challenge, and leaderboard flow

```mermaid
flowchart LR
  Player[Player] --> Puzzle[Tracked puzzle experience]
  Puzzle --> Engine[Canonical engine state]
  Puzzle --> Metrics[Actual interaction metrics]
  Engine --> Validation[Server-side state validation]
  Metrics --> SaveSolve[saveSolve service]
  Validation --> SaveSolve
  SaveSolve --> SolveResults[(solve_results)]
  Puzzle --> ScrambleService[Scramble service]
  ScrambleService --> Scrambles[(scrambles)]
  SolveResults --> Attempts[(scramble_attempts)]
  Scrambles --> Attempts
  Scrambles --> ChallengeService[Challenge service]
  ChallengeService --> Challenges[(challenges)]
  Attempts --> ChallengeAttempts[(challenge_attempts)]
  Challenges --> ChallengeAttempts
  Attempts --> Eligibility[Leaderboard eligibility service]
  Eligibility --> Leaderboard[Public leaderboard]
  TestData[Test and override records] -. excluded by default .-> Eligibility
```

Actual and reported/test metrics remain separate. Public ranking eligibility is a server decision. See [SOCIAL-AND-MULTIPLAYER.md](./SOCIAL-AND-MULTIPLAYER.md), [SECURITY.md](./SECURITY.md), current checkpoints, and leaderboard handoff material.

## 8. Managed ads and affiliate content flow

```mermaid
flowchart TD
  Page[Page] --> Placement[Named placement]
  Placement --> AdSlot[AdSlot or ManagedCarousel]
  AdSlot --> Selection[getActiveAds / campaign selection]
  Selection --> Rules[Status, schedule, priority, audience, placement]
  Rules --> Provider[Managed-content provider adapter]
  Provider --> Tables[(campaigns, placements, slides, affiliate products)]
  Admin[Admin content controls] --> AdminAction[Protected action]
  AdminAction --> Provider
```

Pages reference placements; they do not hard-code campaign content. See [ADS-AFFILIATES.md](./ADS-AFFILIATES.md), [ADMIN-PORTAL.md](./ADMIN-PORTAL.md), and campaign selection tests.

## 9. Admin security dependency graph

```mermaid
flowchart TD
  Browser[Admin browser UI] --> LayoutGate[app/admin/layout.tsx requireAdmin]
  LayoutGate --> PagePermission[Page requirePermission]
  PagePermission --> Action[Server action or API route]
  Action --> SameOrigin[assertSameOrigin]
  SameOrigin --> Authorization[authorizeAction]
  Authorization --> Validation[Server validation and normalization]
  Validation --> Service[lib/admin service]
  Service --> Adapter[service-client.ts server-only]
  Adapter --> Data[(Supabase / PostgreSQL / Auth / Storage)]
  Service --> Audit[Redacted append-only audit log]
  Action --> Revalidate[Path/cache revalidation]
  Action --> SafeResult[User-safe response]
```

The browser is never trusted for privilege. Authorization lives in `admin_members`, service-role credentials are server-only, and failures close safely. See [ADMIN-PORTAL.md](./ADMIN-PORTAL.md), [ADMIN-GUIDE.md](./ADMIN-GUIDE.md), [SECURITY.md](./SECURITY.md), and ADR 0003.

## 10. State ownership graph

```mermaid
flowchart TD
  URL[URL state] --> Shareable[Shareable navigation and filters]
  Local[Local React state] --> Transient[Transient visual interaction]
  Controller[Feature controller state] --> Coordinated[Nearest shared UI owner]
  Engine[Engine state] --> PuzzleTruth[Puzzle truth]
  Service[Application service] --> Persisted[Persisted domain state]
  Database[(Database)] --> Durable[Durable records]
  Renderer[Renderer objects] --> VisualOnly[Camera, animation, selection, viewport]
  PuzzleTruth --> Renderer
  Durable --> Service
  Service --> Controller
```

Do not mirror one source of truth across React state, render objects, engine state, and persistence without a documented synchronization contract.

## 11. Testing and proof dependency graph

```mermaid
flowchart LR
  Types[TypeScript/build] --> Unit[Unit tests]
  Unit --> Static[Static route and import checks]
  Static --> Browser[Mobile and desktop browser proof]
  Browser --> Integration[Auth, persistence, ownership, multi-account proof]
  Integration --> Production[Deployed production proof]
  Engines[Engine contracts] --> Unit
  Validation[Validation, permissions, redaction] --> Unit
  Services[Service transformations] --> Unit
  Bugs[Browser-discovered regressions] --> Unit
```

A lower proof level never establishes a higher one. See [CODING-STANDARDS.md](./CODING-STANDARDS.md), [PROJECT-HEALTH.md](./PROJECT-HEALTH.md), [DAILY-LOG.md](./DAILY-LOG.md), and `tests/`.

## 12. Change and context-rot control graph

```mermaid
flowchart TD
  Request[Feature or structural request] --> Read[Read documentation index and current truth]
  Read --> Find[Find canonical route, component, service, engine, provider, and tests]
  Find --> Preserve[Record behavior that must remain unchanged]
  Preserve --> Implement[Implement narrow vertical slice]
  Implement --> Verify[Run appropriate proof levels]
  Verify --> Docs[Update permanent specialized documents]
  Docs --> Status[Update current status, roadmap, health, daily log, changelog as applicable]
  Status --> ADR{Architecture or ownership changed?}
  ADR -->|Yes| Decision[Add/update ADR and rollback notes]
  ADR -->|No| Handoff[Record exact evidence and remaining unknowns]
  Decision --> Handoff
  Handoff --> Next[Next developer or AI reads repository truth, not chat history]
```

See [AI-INSTRUCTIONS.md](./AI-INSTRUCTIONS.md), [README.md](./README.md), [CODING-STANDARDS.md](./CODING-STANDARDS.md), and [checkpoints/](./checkpoints/).

## 13. Import-direction rules

Allowed direction:

```text
app routes/layouts
  -> feature controllers/components
    -> shared components/hooks/types
      -> application/domain services
        -> engines and pure domain modules
        -> provider adapters/server-only clients
          -> external systems
```

Forbidden examples:

- provider adapter importing a page or React component;
- engine importing UI, auth, ads, database, or navigation;
- shared component importing a route-specific page module;
- visual component importing service-role or privileged Supabase code;
- feature A deep-importing feature B internals;
- renderer mutating canonical puzzle state independently;
- route file becoming a second service, engine, or design system.

## 14. Living-graph maintenance rules

Update this document when any of these change:

- a new architectural layer, provider, engine family, major data domain, or shared state owner is introduced;
- an existing dependency direction changes;
- a route family or feature flow becomes canonical;
- authentication, authorization, persistence, managed content, or public ranking flow changes;
- a diagram no longer matches the code.

For every graph change:

1. update the specialized permanent document first;
2. update this visual map;
3. add an ADR when the change is structural or difficult to reverse;
4. update current-status and evidence documents as required by [README.md](./README.md);
5. preserve historical checkpoints rather than rewriting them as current truth.

## 15. Automated graph generation target

The Mermaid diagrams above are curated architectural intent. They should eventually be supplemented by generated evidence:

- TypeScript import graph with circular-dependency detection;
- route inventory and broken-link check;
- package dependency audit;
- database relationship diagram generated from migrations/schema;
- test-to-module coverage map;
- client/server boundary check;
- forbidden-import boundary check.

Generated graphs report what the code currently does. This document reports what the architecture permits. A mismatch is a defect to investigate, not a reason to silently edit the intended architecture.
