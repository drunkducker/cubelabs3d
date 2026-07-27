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
