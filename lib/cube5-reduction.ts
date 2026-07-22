/**
 * Deterministic 5x5 solver core: no blind search.
 *
 * The old reduction searched for improving move sequences and had an unbounded
 * worst case (>90s on every full scramble sampled). This replaces it with a
 * deterministic three-stage direct solve:
 *
 *  1. Centers — a precomputed bank of slice x outer commutator 3-cycles
 *     (plus setup conjugates). Each step picks a cycle that places one
 *     unsolved center without breaking a solved one, so progress is strictly
 *     monotonic and bounded by the piece count.
 *  2. Corners + midges — with centers solved, the 5x5's corners and middle
 *     edge pieces always form a LEGAL 3x3 (corner and midge permutation
 *     parities flip together under every outer/wide turn, midge orientation
 *     sum stays even, slices touch neither), so a single cubejs solve applied
 *     as outer turns places them all while preserving centers.
 *  3. Wings — 3-cycles built as [slice, outer-sequence] commutators. The
 *     commutator structure makes them exactly identity on corners and midges
 *     (the slice never touches those, so the outer part cancels with itself),
 *     and they are filtered to keep every center on its own face. Wing
 *     permutation parity is measured up front by reconstructing the wing
 *     permutation from sticker colors; an odd permutation is fixed by one
 *     slice quarter turn followed by a cheap center re-solve (commutators are
 *     even, a slice quarter turn is odd on wings), so no external parity
 *     algorithm is ever needed.
 *
 * After stage 3 the cube is fully solved — there is no separate 3x3 phase on
 * a "reduced" cube and no OLL/PLL parity handling at all.
 */
import {
  buildFastModel,
  applyFast,
  centerProgressFast,
  sequencePerm,
} from "./nxn-fast";
import { faceGridCoordinate, FACES as GEO_FACES, type Face } from "./nxn-cube";

const SIZE = 5;
export const MODEL_5 = buildFastModel(SIZE);
const FACES = ["U", "R", "F", "D", "L", "B"] as const;
type FaceLetter = (typeof FACES)[number];

// ---- move labels ------------------------------------------------------
// Search/emit vocabulary: outer, wide and inner-slice turns in quarter and
// half amounts. Inner slices (`Rs` = Rw R') are first-class labels with a
// precomposed permutation but expand back to standard tokens for the emitted
// solution, so playback and verification never see a non-standard move.

type MoveDef = { label: string; perm: Int32Array; expand: string[]; base: string; inv: string };
const MOVES = new Map<string, MoveDef>();
const define = (d: MoveDef) => MOVES.set(d.label, d);

for (const f of FACES) {
  define({ label: f, perm: MODEL_5.movePerm[f], expand: [f], base: f, inv: `${f}'` });
  define({ label: `${f}'`, perm: MODEL_5.movePerm[`${f}'`], expand: [`${f}'`], base: f, inv: f });
  define({ label: `${f}2`, perm: MODEL_5.movePerm[`${f}2`], expand: [`${f}2`], base: f, inv: `${f}2` });
  define({ label: `${f}w`, perm: MODEL_5.movePerm[`${f}w`], expand: [`${f}w`], base: `${f}w`, inv: `${f}w'` });
  define({ label: `${f}w'`, perm: MODEL_5.movePerm[`${f}w'`], expand: [`${f}w'`], base: `${f}w`, inv: `${f}w` });
  define({ label: `${f}w2`, perm: MODEL_5.movePerm[`${f}w2`], expand: [`${f}w2`], base: `${f}w`, inv: `${f}w2` });
  define({ label: `${f}s`, perm: sequencePerm(MODEL_5, [`${f}w`, `${f}'`]), expand: [`${f}w`, `${f}'`], base: `${f}s`, inv: `${f}s'` });
  define({ label: `${f}s'`, perm: sequencePerm(MODEL_5, [`${f}w'`, f]), expand: [`${f}w'`, f], base: `${f}s`, inv: `${f}s` });
  define({ label: `${f}s2`, perm: sequencePerm(MODEL_5, [`${f}w2`, `${f}2`]), expand: [`${f}w2`, `${f}2`], base: `${f}s`, inv: `${f}s2` });
}

const ALL_LABELS = Array.from(MOVES.keys());
const OUTER_LABELS = FACES.flatMap((f) => [f as string, `${f}'`, `${f}2`]);
const SLICE_LABELS = FACES.flatMap((f) => [`${f}s`, `${f}s'`, `${f}s2`]);

const inv = (label: string) => MOVES.get(label)!.inv;
const invSeq = (labels: string[]) => [...labels].reverse().map(inv);
const baseOf = (label: string) => MOVES.get(label)!.base;
export const expandLabels = (labels: string[]) => labels.flatMap((l) => MOVES.get(l)!.expand);
const applyLabels = (state: Uint8Array, labels: string[]) =>
  labels.reduce((s, l) => applyFast(s, MOVES.get(l)!.perm), state);

// ---- slot geometry ----------------------------------------------------
// Classify every facelet by the cubie it sits on, via the geometric engine's
// coordinates: corners have three max coordinates, midges two max + one zero,
// wings two max + one +/-1, centers one max coordinate.

const N2 = SIZE * SIZE;
const FACELETS = 6 * N2;
const faceOf = (slot: number) => Math.floor(slot / N2);
const EXPECTED = new Uint8Array(FACELETS);
for (let i = 0; i < FACELETS; i++) EXPECTED[i] = faceOf(i);

type SlotKind = "corner" | "midge" | "wing" | "center";
const slotKind: SlotKind[] = [];
const slotGrid: string[] = [];
for (let f = 0; f < 6; f++) {
  const face = GEO_FACES[f] as Face;
  for (let r = 0; r < SIZE; r++) {
    for (let c = 0; c < SIZE; c++) {
      const g = faceGridCoordinate(SIZE, face, r, c);
      const maxes = g.filter((v) => Math.abs(v) === 2).length;
      const zeros = g.filter((v) => v === 0).length;
      const kind: SlotKind =
        maxes === 3 ? "corner" : maxes === 2 && zeros === 1 ? "midge" : maxes === 2 ? "wing" : "center";
      slotKind.push(kind);
      slotGrid.push(g.join(","));
    }
  }
}

const CENTER_FACELETS: number[] = [];
const CM_FACELETS: number[] = []; // corners + midges
const WING_FACELETS: number[] = [];
for (let i = 0; i < FACELETS; i++) {
  if (slotKind[i] === "center") CENTER_FACELETS.push(i);
  else if (slotKind[i] === "wing") WING_FACELETS.push(i);
  else CM_FACELETS.push(i);
}

// Wing pieces: two wing facelets on the same cubie (same grid coordinate).
const wingByGrid = new Map<string, number[]>();
for (const i of WING_FACELETS) {
  const g = slotGrid[i];
  if (!wingByGrid.has(g)) wingByGrid.set(g, []);
  wingByGrid.get(g)!.push(i);
}
/** 24 wing slots, each an ordered pair of facelet indices. */
const WING_SLOTS: [number, number][] = Array.from(wingByGrid.values())
  .map((pair) => [Math.min(pair[0], pair[1]), Math.max(pair[0], pair[1])] as [number, number])
  .sort((a, b) => a[0] - b[0]);
const WING_SLOT_OF_FACELET = new Int32Array(FACELETS).fill(-1);
WING_SLOTS.forEach(([a, b], idx) => { WING_SLOT_OF_FACELET[a] = idx; WING_SLOT_OF_FACELET[b] = idx; });

// Center orbits: "+" centers (adjacent to the fixed center) and "x" centers
// (diagonal). Orbit membership is by (row, col) shape; cycles from real move
// sequences can never mix the two.
const centerOrbit = new Int8Array(FACELETS).fill(-1);
for (const i of CENTER_FACELETS) {
  const r = Math.floor((i % N2) / SIZE), c = i % SIZE;
  if (r === 2 && c === 2) centerOrbit[i] = 2; // fixed, never moves under outer/wide turns
  else centerOrbit[i] = (r === 2 || c === 2) ? 0 : 1;
}

// ---- restricted permutations -----------------------------------------
// All bank math runs on permutations restricted to a slot subset (every move
// maps centers to centers, wings to wings, corners+midges to corners+midges).

function restrictedPerm(slots: number[], fullPerm: Int32Array): Int32Array {
  const pos = new Map<number, number>();
  slots.forEach((s, i) => pos.set(s, i));
  const out = new Int32Array(slots.length);
  for (let i = 0; i < slots.length; i++) out[i] = pos.get(fullPerm[slots[i]])!;
  return out;
}

function makeRestrictedTable(slots: number[]): Map<string, Int32Array> {
  const table = new Map<string, Int32Array>();
  for (const label of ALL_LABELS) table.set(label, restrictedPerm(slots, MOVES.get(label)!.perm));
  return table;
}

/** Compose labels into one restricted perm: next[i] = prev[perm[i]]. */
function composeRestricted(table: Map<string, Int32Array>, labels: string[]): Int32Array {
  const n = table.get(labels[0])!.length;
  let cur = Int32Array.from({ length: n }, (_, i) => i);
  for (const label of labels) {
    const p = table.get(label)!;
    const next = new Int32Array(n);
    for (let i = 0; i < n; i++) next[i] = cur[p[i]];
    cur = next;
  }
  return cur;
}

/** Conjugate q = setup . p . setup^-1 on restricted perms. */
function conjugateRestricted(p: Int32Array, setup: Int32Array, setupInv: Int32Array): Int32Array {
  const n = p.length;
  const out = new Int32Array(n);
  // applying [S, P, S'] with next[i] = prev[perm[i]] composition:
  // total[i] = S[P[S'[i]]]
  for (let i = 0; i < n; i++) out[i] = setup[p[setupInv[i]]];
  return out;
}

const CENTER_TABLE = makeRestrictedTable(CENTER_FACELETS);
const WING_TABLE = makeRestrictedTable(WING_FACELETS);
const CM_TABLE = makeRestrictedTable(CM_FACELETS);

// ---- cycle bank -------------------------------------------------------

type CycleEntry = {
  labels: string[];
  /** state'[dst[k]] = state[src[k]] over the entry's support (global facelets). */
  dst: Int32Array;
  src: Int32Array;
};

function entryFromRestricted(slots: number[], perm: Int32Array, labels: string[]): CycleEntry | null {
  const dst: number[] = [], src: number[] = [];
  for (let i = 0; i < perm.length; i++) {
    if (perm[i] !== i) { dst.push(slots[i]); src.push(slots[perm[i]]); }
  }
  if (dst.length === 0) return null;
  return { labels, dst: Int32Array.from(dst), src: Int32Array.from(src) };
}

const identityOn = (perm: Int32Array) => perm.every((v, i) => v === i);

/** Setups used to conjugate base cycles into full coverage. */
const SETUP_LABELS = ALL_LABELS;

type Bank = {
  /** entries indexed by target slot id (center facelet, or wing slot index). */
  byTarget: Map<number, CycleEntry[]>;
};

// ---- center bank ------------------------------------------------------

function centerCycleSlots(perm: Int32Array): number[] | null {
  const support: number[] = [];
  for (let i = 0; i < perm.length; i++) if (perm[i] !== i) support.push(i);
  return support.length === 3 ? support : null;
}

function buildCenterBank(): Bank {
  const byTarget = new Map<number, CycleEntry[]>();
  // coverage[s*54+t] = distinct third slots seen, capped
  const coverage = new Map<number, Set<number>>();
  const CAP = 6;

  const record = (perm: Int32Array, labels: string[]) => {
    const support = centerCycleSlots(perm);
    if (!support) return false;
    let added = false;
    for (const d of support) {
      const s = perm[d];
      const third = support.find((x) => x !== d && x !== s)!;
      const key = s * 64 + d;
      let seen = coverage.get(key);
      if (!seen) { seen = new Set(); coverage.set(key, seen); }
      if (seen.size >= CAP || seen.has(third)) continue;
      seen.add(third);
      added = true;
    }
    if (!added) return false;
    const entry = entryFromRestricted(CENTER_FACELETS, perm, labels)!;
    for (const d of support) {
      const t = CENTER_FACELETS[d];
      if (!byTarget.has(t)) byTarget.set(t, []);
      byTarget.get(t)!.push(entry);
    }
    return true;
  };

  // Base commutators [A, B]: A an inner slice, B a single move or a
  // conjugated single (s m s'). A plain [slice, outer] commutator moves the
  // whole 3-piece column, never 3 pieces — the clean center 3-cycles are the
  // conjugated forms (e.g. Rs · U Ls' U' · Rs' · U Ls U').
  const bSeqs: string[][] = ALL_LABELS.map((b) => [b]);
  for (const s of ALL_LABELS) {
    for (const m of ALL_LABELS) {
      if (baseOf(s) === baseOf(m)) continue;
      bSeqs.push([s, m, inv(s)]);
    }
  }
  const bases: { perm: Int32Array; labels: string[] }[] = [];
  const seenSig = new Map<string, number>();
  for (const a of SLICE_LABELS) {
    for (const bSeq of bSeqs) {
      const seq = [a, ...bSeq, inv(a), ...invSeq(bSeq)];
      const perm = composeRestricted(CENTER_TABLE, seq);
      const support = centerCycleSlots(perm);
      if (!support) continue;
      const sig = support.map((d) => `${perm[d]}>${d}`).sort().join(",");
      const prior = seenSig.get(sig);
      if (prior !== undefined && prior <= seq.length) continue;
      seenSig.set(sig, seq.length);
      bases.push({ perm, labels: seq });
    }
  }
  for (const b of bases) record(b.perm, b.labels);

  // Full ordered in-orbit (source, target) coverage is required; conjugate
  // tiers fill whatever the bases missed, stopping as soon as it's complete.
  const movable: number[] = [];
  for (let i = 0; i < CENTER_FACELETS.length; i++) {
    if (centerOrbit[CENTER_FACELETS[i]] !== 2) movable.push(i);
  }
  const sameOrbit = (i: number, j: number) =>
    centerOrbit[CENTER_FACELETS[i]] === centerOrbit[CENTER_FACELETS[j]];
  const needMore = () => {
    for (const s of movable) for (const t of movable) {
      if (s !== t && sameOrbit(s, t) && !coverage.get(s * 64 + t)?.size) return true;
    }
    return false;
  };

  if (needMore()) {
    for (const s of SETUP_LABELS) {
      const sp = CENTER_TABLE.get(s)!, spi = CENTER_TABLE.get(inv(s))!;
      for (const b of bases) {
        record(conjugateRestricted(b.perm, sp, spi), [s, ...b.labels, inv(s)]);
      }
      if (!needMore()) break;
    }
  }
  if (needMore()) {
    outer: for (const s1 of SETUP_LABELS) {
      for (const s2 of SETUP_LABELS) {
        if (baseOf(s1) === baseOf(s2)) continue;
        const sp = composeRestricted(CENTER_TABLE, [s1, s2]);
        const spi = composeRestricted(CENTER_TABLE, [inv(s2), inv(s1)]);
        for (const b of bases) {
          record(conjugateRestricted(b.perm, sp, spi), [s1, s2, ...b.labels, inv(s2), inv(s1)]);
        }
        if (!needMore()) break outer;
      }
    }
  }
  if (needMore()) throw new Error("5x5 center bank: coverage incomplete");
  return { byTarget };
}

// ---- wing bank --------------------------------------------------------

/** A wing-restricted perm is a clean 3-cycle of wing pieces if its support is
 * exactly 6 facelets forming 3 whole wing slots. */
function wingCycleSlots(perm: Int32Array): number[] | null {
  const support: number[] = [];
  for (let i = 0; i < perm.length; i++) if (perm[i] !== i) support.push(i);
  if (support.length !== 6) return null;
  const slots = new Set<number>();
  for (const i of support) slots.add(WING_SLOT_OF_FACELET[WING_FACELETS[i]]);
  return slots.size === 3 ? Array.from(slots) : null;
}

/** Centers must stay on their own face (color-invisible once centers are
 * solved). This is checked per entry because conjugation by slice-bearing
 * setups does not preserve the property automatically. */
function centerFacePreserving(perm: Int32Array): boolean {
  for (let i = 0; i < perm.length; i++) {
    if (faceOf(CENTER_FACELETS[perm[i]]) !== faceOf(CENTER_FACELETS[i])) return false;
  }
  return true;
}

function buildWingBank(): Bank {
  const byTarget = new Map<number, CycleEntry[]>();
  const coverage = new Map<number, Set<number>>();
  const CAP = 6;

  const wingSlotOfLocal = (local: number) => WING_SLOT_OF_FACELET[WING_FACELETS[local]];

  const record = (perm: Int32Array, labels: string[]) => {
    const slots = wingCycleSlots(perm);
    if (!slots) return false;
    // piece-level mapping: slot t receives from slot s
    let added = false;
    const pairs: [number, number][] = [];
    for (const t of slots) {
      const [f1] = WING_SLOTS[t];
      const localT = WING_FACELETS.indexOf(f1); // small array, fine at build time
      const s = wingSlotOfLocal(perm[localT]);
      pairs.push([s, t]);
    }
    for (const [s, t] of pairs) {
      const third = slots.find((x) => x !== s && x !== t)!;
      const key = s * 32 + t;
      let seen = coverage.get(key);
      if (!seen) { seen = new Set(); coverage.set(key, seen); }
      if (seen.size >= CAP || seen.has(third)) continue;
      seen.add(third);
      added = true;
    }
    if (!added) return false;
    const entry = entryFromRestricted(WING_FACELETS, perm, labels)!;
    for (const t of slots) {
      if (!byTarget.has(t)) byTarget.set(t, []);
      byTarget.get(t)!.push(entry);
    }
    return true;
  };

  // base commutators [slice A, outer sequence B] (and reversed), B length 1..3.
  const outerSeqs: string[][] = [];
  for (const a of OUTER_LABELS) outerSeqs.push([a]);
  for (const a of OUTER_LABELS) for (const b of OUTER_LABELS) {
    if (baseOf(a) === baseOf(b)) continue;
    outerSeqs.push([a, b]);
  }
  for (const a of OUTER_LABELS) for (const b of OUTER_LABELS) for (const c of OUTER_LABELS) {
    if (baseOf(a) === baseOf(b) || baseOf(b) === baseOf(c)) continue;
    outerSeqs.push([a, b, c]);
  }

  const bases: { perm: Int32Array; labels: string[] }[] = [];
  for (const a of SLICE_LABELS) {
    for (const bSeq of outerSeqs) {
      const seq = [a, ...bSeq, inv(a), ...invSeq(bSeq)];
      const wperm = composeRestricted(WING_TABLE, seq);
      if (!wingCycleSlots(wperm)) continue;
      if (!centerFacePreserving(composeRestricted(CENTER_TABLE, seq))) continue;
      bases.push({ perm: wperm, labels: seq });
    }
  }
  // safety: the commutator structure guarantees identity on corners+midges;
  // assert it on a sample so a regression cannot slip through silently.
  for (const b of bases.slice(0, 8)) {
    if (!identityOn(composeRestricted(CM_TABLE, b.labels))) {
      throw new Error("wing base cycle moved a corner or midge");
    }
  }
  for (const b of bases) record(b.perm, b.labels);

  // conjugates: single setups, then pairs, re-checking center face-preservation
  const needMore = () => {
    for (let s = 0; s < 24; s++) for (let t = 0; t < 24; t++) {
      if (s !== t && !(coverage.get(s * 32 + t)?.size)) return true;
    }
    return false;
  };
  for (const s of SETUP_LABELS) {
    const sp = WING_TABLE.get(s)!, spi = WING_TABLE.get(inv(s))!;
    const cp = CENTER_TABLE.get(s)!, cpi = CENTER_TABLE.get(inv(s))!;
    for (const b of bases) {
      const labels = [s, ...b.labels, inv(s)];
      const cq = conjugateRestricted(composeRestricted(CENTER_TABLE, b.labels), cp, cpi);
      if (!centerFacePreserving(cq)) continue;
      record(conjugateRestricted(b.perm, sp, spi), labels);
    }
  }
  if (needMore()) {
    outer: for (const s1 of SETUP_LABELS) {
      for (const s2 of SETUP_LABELS) {
        if (baseOf(s1) === baseOf(s2)) continue;
        const sp = composeRestricted(WING_TABLE, [s1, s2]);
        const spi = composeRestricted(WING_TABLE, [inv(s2), inv(s1)]);
        const cp = composeRestricted(CENTER_TABLE, [s1, s2]);
        const cpi = composeRestricted(CENTER_TABLE, [inv(s2), inv(s1)]);
        for (const b of bases) {
          const cq = conjugateRestricted(composeRestricted(CENTER_TABLE, b.labels), cp, cpi);
          if (!centerFacePreserving(cq)) continue;
          record(conjugateRestricted(b.perm, sp, spi), [s1, s2, ...b.labels, inv(s2), inv(s1)]);
        }
        if (!needMore()) break outer;
      }
    }
  }
  return { byTarget };
}

let centerBank: Bank | null = null;
let wingBank: Bank | null = null;
function banks(): { centers: Bank; wings: Bank } {
  if (!centerBank) centerBank = buildCenterBank();
  if (!wingBank) wingBank = buildWingBank();
  return { centers: centerBank, wings: wingBank };
}

// ---- generic group solver --------------------------------------------

type Group = { id: number; facelets: number[] };

function solveGroupsWithBank(
  start: Uint8Array,
  groups: Group[],
  entriesForTarget: (state: Uint8Array, group: Group) => CycleEntry[],
  groupOfFacelet: (facelet: number) => number,
): { state: Uint8Array; moves: string[] } {
  let state = start;
  const moves: string[] = [];
  const isGroupSolved = (st: Uint8Array, g: Group) => g.facelets.every((f) => st[f] === EXPECTED[f]);

  const solvedCount = (st: Uint8Array) => groups.reduce((n, g) => n + (isGroupSolved(st, g) ? 1 : 0), 0);

  let guard = groups.length * 3 + 8;
  for (;;) {
    if (guard-- <= 0) throw new Error("5x5 group solver exceeded its move budget");
    const unsolved = groups.filter((g) => !isGroupSolved(state, g));
    if (unsolved.length === 0) break;
    const before = solvedCount(state);

    let best: { entry: CycleEntry; score: number } | null = null;
    for (const g of unsolved) {
      for (const entry of entriesForTarget(state, g)) {
        // simulate on the entry's support
        const touched = new Set<number>();
        for (let k = 0; k < entry.dst.length; k++) {
          touched.add(groupOfFacelet(entry.dst[k]));
          touched.add(groupOfFacelet(entry.src[k]));
        }
        const newVal = new Map<number, number>();
        for (let k = 0; k < entry.dst.length; k++) newVal.set(entry.dst[k], state[entry.src[k]]);
        const at = (f: number) => (newVal.has(f) ? newVal.get(f)! : state[f]);
        const solvedAfter = (gid: number) => {
          const grp = groups[gid];
          return grp.facelets.every((f) => at(f) === EXPECTED[f]);
        };
        if (!solvedAfter(g.id)) continue;
        let delta = 0, broke = false;
        for (const gid of Array.from(touched)) {
          const wasSolved = isGroupSolved(state, groups[gid]);
          const nowSolved = solvedAfter(gid);
          if (wasSolved && !nowSolved) { broke = true; break; }
          if (!wasSolved && nowSolved) delta++;
        }
        if (broke || delta === 0) continue;
        const score = delta * 1000 - entry.labels.length;
        if (!best || score > best.score) best = { entry, score };
      }
      if (best) break; // solve groups in order; first solvable target wins
    }
    if (!best) throw new Error("5x5 deterministic solver: no applicable cycle (bank coverage gap)");
    state = applyLabels(state, best.entry.labels);
    moves.push(...best.entry.labels);
    if (solvedCount(state) <= before) throw new Error("5x5 deterministic solver: non-improving step");
  }
  return { state, moves };
}

// ---- stage 1: centers -------------------------------------------------

export function solveCenters(start: Uint8Array): { state: Uint8Array; moves: string[] } {
  const { centers } = banks();
  const movable = CENTER_FACELETS.filter((f) => centerOrbit[f] !== 2);
  const groups: Group[] = movable.map((f, i) => ({ id: i, facelets: [f] }));
  const groupOf = new Map<number, number>();
  groups.forEach((g) => groupOf.set(g.facelets[0], g.id));
  return solveGroupsWithBank(
    start,
    groups,
    (state, g) => centers.byTarget.get(g.facelets[0]) ?? [],
    (f) => groupOf.get(f)!,
  );
}

// ---- wing permutation parity -----------------------------------------
// Wings cannot flip in place: (slot, shown color order) determines the piece.
// The orientation table is built empirically from random move-sequence
// permutations, whose sources are exact piece movements; the build asserts
// path-independence, which is precisely the no-flip fact.

let wingOrientTable: Int8Array | null = null; // [slot*24+homeSlot] -> 0/1/-1
function buildWingOrientTable(): Int8Array {
  const table = new Int8Array(24 * 24).fill(-1);
  const slotOfFacelet = WING_SLOT_OF_FACELET;
  let filled = 0;
  let perm = Int32Array.from({ length: FACELETS }, (_, i) => i);
  let steps = 0;
  while (filled < 24 * 24 && steps < 20000) {
    steps++;
    const label = ALL_LABELS[Math.floor(Math.random() * ALL_LABELS.length)];
    const p = MOVES.get(label)!.perm;
    const next = new Int32Array(FACELETS);
    for (let i = 0; i < FACELETS; i++) next[i] = perm[p[i]];
    perm = next;
    for (let slot = 0; slot < 24; slot++) {
      const [f1] = WING_SLOTS[slot];
      const srcFacelet = perm[f1];
      const home = slotOfFacelet[srcFacelet];
      const bit = srcFacelet === WING_SLOTS[home][0] ? 0 : 1;
      const key = slot * 24 + home;
      if (table[key] === -1) { table[key] = bit; filled++; }
      else if (table[key] !== bit) throw new Error("wing orientation is not path-independent");
    }
  }
  if (filled < 24 * 24) throw new Error("wing orientation table incomplete");
  return table;
}

/** Reconstruct which wing piece sits in each slot, or null if the sticker
 * colors do not describe a valid wing arrangement. */
export function wingPermutation(state: Uint8Array): number[] | null {
  if (!wingOrientTable) wingOrientTable = buildWingOrientTable();
  const table = wingOrientTable;
  // class lookup: expected ordered color pair per slot
  const perm: number[] = [];
  const used = new Set<number>();
  for (let slot = 0; slot < 24; slot++) {
    const [f1, f2] = WING_SLOTS[slot];
    const c1 = state[f1], c2 = state[f2];
    let found = -1;
    for (let home = 0; home < 24; home++) {
      const [h1, h2] = WING_SLOTS[home];
      const e1 = EXPECTED[h1], e2 = EXPECTED[h2];
      const bit = table[slot * 24 + home];
      const shown1 = bit === 0 ? e1 : e2;
      const shown2 = bit === 0 ? e2 : e1;
      if (shown1 === c1 && shown2 === c2) {
        if (found !== -1) return null; // ambiguous: invalid state
        found = home;
      }
    }
    if (found === -1 || used.has(found)) return null;
    used.add(found);
    perm.push(found);
  }
  return perm;
}

function permutationParity(perm: number[]): number {
  const seen = new Array(perm.length).fill(false);
  let parity = 0;
  for (let i = 0; i < perm.length; i++) {
    if (seen[i]) continue;
    let j = i, len = 0;
    while (!seen[j]) { seen[j] = true; j = perm[j]; len++; }
    parity += len - 1;
  }
  return parity % 2;
}

export function wingParityOdd(state: Uint8Array): boolean {
  const perm = wingPermutation(state);
  if (!perm) throw new Error("Invalid wing arrangement");
  return permutationParity(perm) === 1;
}

// ---- stage 3: wings ---------------------------------------------------

export function solveWings(start: Uint8Array): { state: Uint8Array; moves: string[] } {
  const { wings } = banks();
  const groups: Group[] = WING_SLOTS.map((pair, i) => ({ id: i, facelets: [pair[0], pair[1]] }));
  return solveGroupsWithBank(
    start,
    groups,
    (state, g) => wings.byTarget.get(g.id) ?? [],
    (f) => WING_SLOT_OF_FACELET[f],
  );
}

// ---- validation -------------------------------------------------------

/** Sticker-count and arrangement checks that give clear errors for manual
 * entry. Corner/midge legality is left to cubejs, which rejects illegal 3x3
 * states when the pipeline hands the corners+midges substate over. */
export function validateCenterAndWingState(state: Uint8Array): string | null {
  for (let f = 0; f < 6; f++) {
    const fixedSlot = f * N2 + 2 * SIZE + 2;
    if (state[fixedSlot] !== f) return "Fixed face centers do not match the standard color scheme";
  }
  for (const orbit of [0, 1]) {
    const counts = new Array(6).fill(0);
    for (const i of CENTER_FACELETS) if (centerOrbit[i] === orbit) counts[state[i]]++;
    if (counts.some((n) => n !== 4)) return "Center stickers are not a valid arrangement";
  }
  if (!wingPermutation(state)) return "Edge wing stickers are not a valid arrangement";
  return null;
}

export function centersSolved(state: Uint8Array): boolean {
  return centerProgressFast(MODEL_5, state) === 54;
}
