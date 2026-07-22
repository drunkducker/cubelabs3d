# Context-Resilient Build Plan for Cube Labs 3D

**Status:** authoritative working method. Complements `AI-INSTRUCTIONS.md`
(rules) with a *build strategy* designed to keep AI agents effective across long
sessions and hand-offs.

## The problem: context rot

AI agents lose working context two ways: **gradually** inside a long session
(early decisions get buried and re-derived or contradicted) and **completely**
between sessions (a new agent starts from zero). Symptoms seen in this project:

- branch sprawl and two unrelated histories nobody tracked;
- features claimed "done" that were only on an unmerged branch;
- the same facts re-discovered every session;
- reset/email links pinned to a dead preview URL because state wasn't written down.

The fix is not "remember more." It is **externalize state into the repo and
build in slices small enough to finish before context degrades.** The docs are
the agent's long-term memory; working memory is a cache that will be wiped.

## Principle 1 — Bounded session-start reload

Every session begins by reading a **small, fixed** set, and nothing more until a
task is chosen:

1. `README.md` (index) and `CONSTITUTION.md`
2. `CURRENT_STATUS.md` — including the **branch registry**
3. `ROADMAP.md` — the **Status & tracking rules** and the relevant section
4. The **last 2–3 entries** of `CHANGELOG.md` and `DAILY-LOG.md`
5. Only the **one** feature doc + ADR for the task at hand

Keep this set small on purpose — it must fit comfortably in context and be read
every time. Do not bulk-read the whole codebase; that burns the budget that the
actual task needs.

## Principle 2 — Vertical slices that finish in one session

Build **one section end-to-end** per slice: migration → server action → UI →
docs → changelog → `npm run build` verify. A slice is scoped so it can be
completed and committed before context degrades. Reference cadence already used:
admin foundation → Ads Manager, each self-contained.

A slice is too big if it cannot be committed with a green build in one sitting.
Split it.

## Principle 3 — Write-through memory (externalize decisions immediately)

The moment a decision is made, write it down — do not carry it in working
memory:

- architecture/security/provider/public-behavior decision → **ADR** in `docs/decisions/`
- any meaningful change → **`CHANGELOG.md`**
- status change → one line in **`DAILY-LOG.md`** (item, old→new, commit)
- new or changed branch → the **branch registry** in `CURRENT_STATUS.md`

If it isn't written down, assume it will be lost.

## Principle 4 — Evidence anchoring

Every status claim names its evidence: a file/route, a commit/PR, a migration,
or a recorded test. A future agent trusts evidence, not narrative. `[x]` only
when it is on `main` and verified (see ROADMAP tracking rules). Build ≠ verified.

## Principle 5 — Handoff-first for anything unfinished

If a slice is not finished when the session ends, write a handoff **before
stopping**: what changed, branch + commit, deploy status, tests done, remaining
work, next action, docs touched (see `AI-INSTRUCTIONS.md` › Handoff). Treat the
handoff as more important than the last few lines of code.

## Principle 6 — One canonical branch + a live registry

`main` is truth. Do active work on the single designated working branch and keep
the **branch registry** current so branches never sprawl again. Never `git
merge` a RootB-history branch — port by hand.

## Principle 7 — Deterministic conventions (so agents don't explore)

Predictable structure means an agent finds things without spending context
searching:

- admin sections: `app/admin/<section>/page.tsx` (+ `actions.ts` for mutations)
- server-only access + audit: `app/lib/admin.ts` (`requireAdmin`, `writeAudit`)
- data access: `app/lib/supabase-rest.ts`; never call the provider from a visual component
- migrations: `supabase/migrations/YYYYMMDD_<name>.sql`, dated, additive
- one permanent doc per concern in `/docs`; link, don't inline.

## Principle 8 — Keep docs short and layered

Small single-purpose docs that link to each other cost less context than a few
giant ones. When a doc grows past its purpose, split it and update the index.
Fold checkpoint/handoff detail into permanent docs, then archive the checkpoint.

## Per-slice checklist

Copy this into the daily log for each slice:

- [ ] Read the bounded start set (Principle 1)
- [ ] Scope confirmed as a single-session vertical slice
- [ ] Migration written (dated, additive) and noted as "run required"
- [ ] Server-side authorization + audit for any privileged action
- [ ] Mobile-first UI, reusing shared components/tokens
- [ ] `npm run build` green
- [ ] Docs updated: feature doc, ROADMAP status (with evidence), CHANGELOG, DAILY-LOG
- [ ] ADR added if the change is architectural
- [ ] Branch registry updated if branches changed
- [ ] Committed + pushed; handoff written if unfinished

## Build order (each slice on a stable, documented base)

Sequence work so every slice builds on already-merged, already-documented
foundations rather than in-flight assumptions:

1. Security/auth foundations (done: admin gate, roles, audit)
2. Owner-priority monetization: Ads (done) → YouTube Videos → Banners/Carousels + affiliate links
3. Public render layer + click/impression tracking for the above
4. User Manager, Test Lab, Leaderboard/Challenge moderation
5. Security Center, Settings/migration tools
6. Solver correctness fixtures, learn content, social production systems

Do not start a later slice by destabilizing an earlier one.
