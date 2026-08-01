/**
 * Deterministic 5x5 reduction on the fast facelet model.
 *
 * Reduce an arbitrary 5x5 to a state that behaves as a 3x3 under outer turns
 * (all six 3x3 centers solved, all twelve edge triplets paired), so it can be
 * handed to cubejs. The earlier blind-search reduction timed out on the
 * endgame "last centers / last edges" insertions; this replaces it with
 * commutator 3-cycles applied by direct index lookup, which has no search tail.
 *
 * Method
 * ------
 * Center pieces split into two independent orbits — the four X-centers (corner
 * of each 3x3 face) and the four T-centers (edge of each 3x3 face). A pure
 * 3-cycle of one orbit never touches the other, so the two orbits are solved in
 * separate phases. For each orbit we precompute the complete set of pure
 * 3-cycles (one per ordered triple of same-orbit slots) as short move
 * sequences, indexed by the triple they move. Solving a face is then a
 * sequence of O(1) index lookups: to place a piece, pick the target slot, a
 * donor slot of the right colour, and an unused helper slot, and apply the
 * 3-cycle on that triple. Because a conjugate of a pure 3-cycle is still a pure
 * 3-cycle, every insertion preserves already-solved centers automatically.
 *
 * Edge wings are paired the same way: pure wing 3-cycles (which preserve all
 * centers and midges) are enriched to full coverage and used to pair one edge
 * at a time; the single-swap "last two edges" case is resolved with a verified
 * wing-parity algorithm. Midges are left to the cubejs 3x3 tail.
 */
import {
  buildFastModel,
  applyFast,
  centerProgressFast,
  edgeProgressFast,
  sequencePerm,
} from "./nxn-fast";
import { faceGridCoordinate, type Face } from "./nxn-cube";

const SIZE = 5;
export const MODEL_5 = buildFastModel(SIZE);
const FACES = ["U", "R", "F", "D", "L", "B"] as const;
type FaceLetter = (typeof FACES)[number];
const FACE_INDEX: Record<FaceLetter, number> = { U: 0, R: 1, F: 2, D: 3, L: 4, B: 5 };
const N = SIZE;
const FACELETS = 6 * N * N;

// ---- move library ----------------------------------------------------
// Outer and 2-layer wide turns come straight from the fast model. Inner-slice
// moves (`Rs = Rw R'`, the single layer next to a face) are search primitives
// that expand back to standard tokens in the emitted solution.
type MoveDef = { perm: Int32Array; expand: string[]; base: string; inv: string };
const MOVES = new Map<string, MoveDef>();
const define = (label: string, d: MoveDef) => MOVES.set(label, d);
for (const f of FACES) {
  define(f, { perm: MODEL_5.movePerm[f], expand: [f], base: f, inv: `${f}'` });
  define(`${f}'`, { perm: MODEL_5.movePerm[`${f}'`], expand: [`${f}'`], base: f, inv: f });
  define(`${f}w`, { perm: MODEL_5.movePerm[`${f}w`], expand: [`${f}w`], base: `${f}w`, inv: `${f}w'` });
  define(`${f}w'`, { perm: MODEL_5.movePerm[`${f}w'`], expand: [`${f}w'`], base: `${f}w`, inv: `${f}w` });
  define(`${f}s`, { perm: sequencePerm(MODEL_5, [`${f}w`, `${f}'`]), expand: [`${f}w`, `${f}'`], base: `${f}s`, inv: `${f}s'` });
  define(`${f}s'`, { perm: sequencePerm(MODEL_5, [`${f}w'`, f]), expand: [`${f}w'`, f], base: `${f}s`, inv: `${f}s` });
  // double turns (needed by the OLL parity algorithm)
  define(`${f}2`, { perm: MODEL_5.movePerm[`${f}2`], expand: [`${f}2`], base: f, inv: `${f}2` });
  define(`${f}w2`, { perm: MODEL_5.movePerm[`${f}w2`], expand: [`${f}w2`], base: `${f}w`, inv: `${f}w2` });
}
const inv = (l: string) => MOVES.get(l)!.inv;
const baseOf = (l: string) => MOVES.get(l)!.base;
const invSeq = (ls: string[]) => [...ls].reverse().map(inv);
const apply1 = (s: Uint8Array, l: string) => applyFast(s, MOVES.get(l)!.perm);
const applyLabels = (s: Uint8Array, ls: string[]) => ls.reduce(apply1, s);
export const expandLabels = (labels: string[]) => labels.flatMap((l) => MOVES.get(l)!.expand);
const composePerm = (labels: string[]) => sequencePerm(MODEL_5, expandLabels(labels));
const compose2 = (p: Int32Array, q: Int32Array) => {
  const r = new Int32Array(p.length);
  for (let i = 0; i < p.length; i++) r[i] = p[q[i]];
  return r;
};

const OUTER = FACES.flatMap((f) => [f as string, `${f}'`]);
const WIDE = FACES.flatMap((f) => [`${f}w`, `${f}w'`]);
const SLICE = FACES.flatMap((f) => [`${f}s`, `${f}s'`]);

// ---- slot geometry ---------------------------------------------------
const rowOf = (sl: number) => Math.floor((sl % (N * N)) / N);
const colOf = (sl: number) => sl % N;
const faceOf = (sl: number) => Math.floor(sl / (N * N));
const isCorner = (sl: number) => (rowOf(sl) === 0 || rowOf(sl) === N - 1) && (colOf(sl) === 0 || colOf(sl) === N - 1);
const isCenter = (sl: number) => rowOf(sl) >= 1 && rowOf(sl) <= 3 && colOf(sl) >= 1 && colOf(sl) <= 3;
const isTrueCenter = (sl: number) => rowOf(sl) === 2 && colOf(sl) === 2;
const isMidge = (sl: number) => (rowOf(sl) === 2 && (colOf(sl) === 0 || colOf(sl) === N - 1)) || (colOf(sl) === 2 && (rowOf(sl) === 0 || rowOf(sl) === N - 1));
const isWing = (sl: number) => !isCorner(sl) && !isCenter(sl) && !isMidge(sl);
type Orbit = "X" | "T";
const centerOrbit = (sl: number): Orbit => (rowOf(sl) === 1 || rowOf(sl) === 3) && (colOf(sl) === 1 || colOf(sl) === 3) ? "X" : "T";

const ALL_SLOTS = Array.from({ length: FACELETS }, (_, i) => i);
const CENTER_SLOTS = ALL_SLOTS.filter((s) => isCenter(s) && !isTrueCenter(s));
const WING_SLOTS = ALL_SLOTS.filter(isWing);
const MIDGE_SLOTS = ALL_SLOTS.filter(isMidge);
const TRUE_CENTERS = ALL_SLOTS.filter(isTrueCenter);
const centerSlotsOf = (f: number, orbit: Orbit) =>
  orbit === "X" ? [f * 25 + 6, f * 25 + 8, f * 25 + 16, f * 25 + 18] : [f * 25 + 7, f * 25 + 11, f * 25 + 13, f * 25 + 17];
const orbitCountOnFace = (state: Uint8Array, f: number, orbit: Orbit) =>
  centerSlotsOf(f, orbit).reduce((n, sl) => n + (state[sl] === f ? 1 : 0), 0);

// ---- 3-cycle bank type ----------------------------------------------
type Cyc = { labels: string[]; perm: Int32Array };
type CycleIndex = Map<string, Cyc[]>; // sorted-triple -> cycles moving exactly those three slots

const tripleKey = (a: number, b: number, c: number) => [a, b, c].sort((x, y) => x - y).join(",");

// ---- center 3-cycle banks -------------------------------------------
/** Commutator seeds that pure-3-cycle X-centers (conjugated-slice form). */
function xSeedLabels(): string[][] {
  const out: string[][] = [];
  for (const s of SLICE) {
    const As: string[][] = [[s]];
    for (const q of OUTER) As.push([q, s, inv(q)]);
    const Bs: string[][] = [];
    for (const b of [...OUTER, ...WIDE, ...SLICE]) { Bs.push([b]); Bs.push([b, b]); }
    for (const a of As) for (const bb of Bs) {
      if (baseOf(a[Math.floor(a.length / 2)]) === baseOf(bb[0])) continue;
      out.push([...a, ...bb, ...invSeq(a), ...invSeq(bb)]);
    }
  }
  return out;
}

/** True iff `perm` is a pure 3-cycle of X-centers (nothing else in centers). */
function pureCenter3(perm: Int32Array, orbit: Orbit): number[] | null {
  if (TRUE_CENTERS.some((tc) => perm[tc] !== tc)) return null;
  const moved = CENTER_SLOTS.filter((sl) => perm[sl] !== sl);
  if (moved.length !== 3 || moved.some((sl) => centerOrbit(sl) !== orbit)) return null;
  const cyc = new Set(moved.map((sl) => perm[sl])).size === 3 && moved.every((sl) => moved.includes(perm[sl]));
  return cyc ? moved : null;
}

/** Enrich a set of X-seed cycles to complete coverage by conjugating with
 * setups, indexed by the triple of slots moved. */
function buildXIndex(): CycleIndex {
  const byKey = new Map<string, Cyc>();
  const add = (moved: number[], labels: string[], perm: Int32Array) => {
    const m = moved.slice().sort((a, b) => a - b);
    const k = m.join(",") + "|" + m.map((sl) => perm[sl]).join(",");
    const e = byKey.get(k);
    if (!e || e.labels.length > labels.length) byKey.set(k, { labels, perm });
  };
  const seeds: Cyc[] = [];
  for (const labels of xSeedLabels()) {
    const perm = composePerm(labels);
    const moved = pureCenter3(perm, "X");
    if (moved) { add(moved, labels, perm); }
  }
  for (const c of Array.from(byKey.values())) seeds.push(c);
  enrichConjugates(seeds, (perm) => pureCenter3(perm, "X"), add);
  return groupByTriple(byKey);
}

/** Generic conjugation enrichment: BFS over setups, conjugate each seed, keep
 * results that still satisfy `accept` (returning the moved triple). */
function enrichConjugates(
  seeds: Cyc[],
  accept: (perm: Int32Array) => number[] | null,
  add: (moved: number[], labels: string[], perm: Int32Array) => void,
  maxDepth = 2,
  targetTriples = Infinity,
) {
  const setupVocab = [...OUTER, ...WIDE];
  const idP = Int32Array.from({ length: FACELETS }, (_, i) => i);
  type Node = { setup: string[]; perm: Int32Array; invPerm: Int32Array };
  let frontier: Node[] = [{ setup: [], perm: idP, invPerm: idP }];
  const seen = new Set<string>([""]);
  const triples = new Set<string>();
  for (let d = 0; d <= maxDepth; d++) {
    for (const node of frontier) for (const seed of seeds) {
      const perm = compose2(compose2(node.perm, seed.perm), node.invPerm);
      const moved = accept(perm);
      if (!moved) continue;
      add(moved, [...node.setup, ...seed.labels, ...invSeq(node.setup)], perm);
      triples.add(moved.slice().sort((a, b) => a - b).join(","));
    }
    if (triples.size >= targetTriples || d === maxDepth) break;
    const next: Node[] = [];
    for (const node of frontier) for (const mv of setupVocab) {
      const last = node.setup[node.setup.length - 1];
      if (last && baseOf(last) === baseOf(mv) && last !== mv) continue;
      const setup = [...node.setup, mv];
      const key = setup.join(",");
      if (seen.has(key)) continue;
      seen.add(key);
      next.push({ setup, perm: compose2(node.perm, MOVES.get(mv)!.perm), invPerm: compose2(MOVES.get(inv(mv))!.perm, node.invPerm) });
    }
    frontier = next;
  }
}

function groupByTriple(byKey: Map<string, Cyc>): CycleIndex {
  const index: CycleIndex = new Map();
  for (const c of Array.from(byKey.values())) {
    const moved: number[] = [];
    for (let i = 0; i < c.perm.length && moved.length < 4; i++) if (c.perm[i] !== i && isCenter(i) && !isTrueCenter(i)) moved.push(i);
    const k = moved.sort((a, b) => a - b).join(",");
    if (!index.has(k)) index.set(k, []);
    index.get(k)!.push(c);
  }
  return index;
}

/** T-centers admit no short slot-pure 3-cycle, but many algorithms 3-cycle
 * three T-centers while only permuting same-colour X-centers within their
 * faces (harmless once X is solved). Build such algorithms by conjugating a
 * T-base to cover every T triple (ignoring the X mess), then appending an
 * X-restoration (pure-X cycles never touch T). */
function tPure3(perm: Int32Array): number[] | null {
  if (TRUE_CENTERS.some((tc) => perm[tc] !== tc)) return null;
  const moved = CENTER_SLOTS.filter((sl) => centerOrbit(sl) === "T" && perm[sl] !== sl);
  if (moved.length !== 3) return null;
  const cyc = new Set(moved.map((sl) => perm[sl])).size === 3 && moved.every((sl) => moved.includes(perm[sl]));
  return cyc ? moved : null;
}

function buildTIndex(xIndex: CycleIndex): CycleIndex {
  // bases whose T-part is a single 3-cycle
  const tbases: string[][] = [];
  for (const s of SLICE) for (const o of OUTER) { tbases.push([s, o, o, inv(s), o, o]); tbases.push([s, o, inv(s), inv(o)]); }
  const baseCycs: Cyc[] = [];
  for (const b of tbases) { const perm = composePerm(b); if (tPure3(perm)) baseCycs.push({ labels: b, perm }); }
  // conjugate bases to cover all T triples (X arbitrary)
  const covered = new Map<string, { labels: string[] }>();
  const addBase = (moved: number[], labels: string[], perm: Int32Array) => {
    const m = moved.slice().sort((a, b) => a - b);
    const k = m.join(",") + "|" + m.map((sl) => perm[sl]).join(",");
    const e = covered.get(k);
    if (!e || e.labels.length > labels.length) covered.set(k, { labels });
  };
  enrichConjugates(baseCycs, tPure3, addBase, 3, 2024);
  // make each X-preserving via X-restoration, index by T triple
  const index: CycleIndex = new Map();
  for (const { labels } of Array.from(covered.values())) {
    const afterBase = applyLabels(MODEL_5.solvedState.slice(), labels);
    let restore: string[];
    try { restore = solveOrbitPhase(afterBase, "X", xIndex).moves; } catch { continue; }
    const full = [...labels, ...restore];
    const perm = composePerm(full);
    const moved = tPure3(perm);
    if (!moved) continue;
    // must keep every X-center colour solved
    const after = applyLabels(MODEL_5.solvedState.slice(), full);
    let xok = true;
    for (let f = 0; f < 6 && xok; f++) if (orbitCountOnFace(after, f, "X") !== 4) xok = false;
    if (!xok) continue;
    const k = moved.slice().sort((a, b) => a - b).join(",");
    if (!index.has(k)) index.set(k, []);
    index.get(k)!.push({ labels: full, perm });
  }
  return index;
}

// ---- center solve ----------------------------------------------------
const CENTER_ORDER = [FACE_INDEX.U, FACE_INDEX.D, FACE_INDEX.F, FACE_INDEX.B, FACE_INDEX.R]; // 6th auto-completes

/** Place one piece of `orbit` onto face `f`, preserving locked faces. */
function placeCenter(state: Uint8Array, f: number, orbit: Orbit, locked: Set<number>, index: CycleIndex): string[] | null {
  const lockedSlots: number[] = [];
  locked.forEach((lf) => centerSlotsOf(lf, orbit).forEach((s) => lockedSlots.push(s)));
  const t = centerSlotsOf(f, orbit).find((sl) => state[sl] !== f);
  if (t === undefined) return null;
  const donors = CENTER_SLOTS.filter((sl) => centerOrbit(sl) === orbit && state[sl] === f && faceOf(sl) !== f && !lockedSlots.includes(sl));
  for (const d of donors) {
    const helpers = CENTER_SLOTS.filter((sl) => centerOrbit(sl) === orbit && faceOf(sl) !== f && sl !== d && !lockedSlots.includes(sl));
    for (const h of helpers) {
      const cands = index.get(tripleKey(t, d, h));
      if (!cands) continue;
      for (const c of cands) {
        if (c.perm[t] !== d) continue;
        const after = applyFast(state, c.perm);
        if (orbitCountOnFace(after, f, orbit) > orbitCountOnFace(state, f, orbit) && lockedSlots.every((sl) => after[sl] === faceOf(sl))) return c.labels;
      }
    }
  }
  return null;
}

function solveOrbitPhase(state: Uint8Array, orbit: Orbit, index: CycleIndex): { state: Uint8Array; moves: string[] } {
  let cur = state;
  const moves: string[] = [];
  const locked = new Set<number>();
  for (const f of CENTER_ORDER) {
    let guard = 0;
    while (orbitCountOnFace(cur, f, orbit) < 4) {
      if (guard++ > 16) throw new Error(`5x5 ${orbit}-center reduction stuck on face ${f}`);
      const found = placeCenter(cur, f, orbit, locked, index);
      if (!found) throw new Error(`5x5 ${orbit}-center reduction stuck on face ${f}`);
      cur = applyLabels(cur, found);
      moves.push(...found);
    }
    locked.add(f);
  }
  return { state: cur, moves };
}

// Lazily-built banks (heavy to construct; built once per process).
let _xIndex: CycleIndex | null = null;
let _tIndex: CycleIndex | null = null;
function xIndex(): CycleIndex { return (_xIndex ??= buildXIndex()); }
function tIndex(): CycleIndex { return (_tIndex ??= buildTIndex(xIndex())); }

export function solveCenters(state: Uint8Array): { state: Uint8Array; moves: string[] } {
  const rx = solveOrbitPhase(state, "X", xIndex());
  const rt = solveOrbitPhase(rx.state, "T", tIndex());
  return { state: rt.state, moves: [...rx.moves, ...rt.moves] };
}

// ---- edge (wing) pairing --------------------------------------------
// A pure wing 3-cycle preserves all centers and all midges (so the midges stay
// a fixed reference), and moves exactly three wing pieces. Enriched to broad
// coverage, these pair the wings to their midges one piece at a time, exactly
// like the center orbits. The one thing 3-cycles cannot reach is an odd wing
// permutation (two wings left swapped); a single application of the verified
// centre-preserving OLL-parity algorithm toggles that parity so the 3-cycles
// can finish. Midges themselves are left to the cubejs 3x3 tail.
const OLL_PARITY_EDGE = "Rw2 B2 U2 Lw U2 Rw' U2 Rw U2 F2 Rw F2 Lw' B2 Rw2".split(/\s+/);

/** Wing pieces: the two wing slots that share one physical cubie. */
const WING_PIECES: [number, number][] = (() => {
  const byGrid = new Map<string, number[]>();
  for (const s of WING_SLOTS) {
    const g = faceGridCoordinate(N, FACES[faceOf(s)] as Face, rowOf(s), colOf(s)).join(",");
    if (!byGrid.has(g)) byGrid.set(g, []);
    byGrid.get(g)!.push(s);
  }
  return Array.from(byGrid.values()).filter((v) => v.length === 2).map((v) => [v[0], v[1]] as [number, number]);
})();

function pureWing3(perm: Int32Array): number[] | null {
  if (CENTER_SLOTS.some((s) => perm[s] !== s) || TRUE_CENTERS.some((s) => perm[s] !== s)) return null;
  if (MIDGE_SLOTS.some((s) => perm[s] !== s)) return null;
  const moved = WING_SLOTS.filter((s) => perm[s] !== s);
  return moved.length === 6 ? moved : null;
}

function buildWingBank(): Cyc[] {
  const byKey = new Map<string, Cyc & { moved: number[] }>();
  const add = (labels: string[], perm: Int32Array, moved: number[]) => {
    const m = moved.slice().sort((a, b) => a - b);
    const k = m.join(",") + "|" + m.map((s) => perm[s]).join(",");
    const e = byKey.get(k);
    if (!e || e.labels.length > labels.length) byKey.set(k, { labels, perm, moved: m });
  };
  const As: string[][] = [];
  for (const w of [...WIDE, ...SLICE]) { As.push([w]); for (const q of OUTER) As.push([q, w, inv(q)]); }
  const Bs: string[][] = [];
  for (const b of [...OUTER, ...WIDE, ...SLICE]) { Bs.push([b]); Bs.push([b, b]); }
  const seeds: Cyc[] = [];
  for (const A of As) for (const B of Bs) {
    if (baseOf(A[Math.floor(A.length / 2)]) === baseOf(B[0])) continue;
    const labels = [...A, ...B, ...invSeq(A), ...invSeq(B)];
    const perm = composePerm(labels);
    const moved = pureWing3(perm);
    if (moved) add(labels, perm, moved);
  }
  for (const c of Array.from(byKey.values())) seeds.push({ labels: c.labels, perm: c.perm });
  const setupVocab = [...OUTER, ...WIDE, ...SLICE];
  const idP = Int32Array.from({ length: FACELETS }, (_, i) => i);
  type Node = { setup: string[]; perm: Int32Array; invPerm: Int32Array };
  let frontier: Node[] = [{ setup: [], perm: idP, invPerm: idP }];
  const seen = new Set<string>([""]);
  for (let d = 0; d <= 2; d++) {
    for (const node of frontier) for (const seed of seeds) {
      const perm = compose2(compose2(node.perm, seed.perm), node.invPerm);
      const moved = pureWing3(perm);
      if (moved) add([...node.setup, ...seed.labels, ...invSeq(node.setup)], perm, moved);
    }
    if (d === 2) break;
    const next: Node[] = [];
    for (const node of frontier) for (const mv of setupVocab) {
      const last = node.setup[node.setup.length - 1];
      if (last && baseOf(last) === baseOf(mv) && last !== mv) continue;
      const setup = [...node.setup, mv];
      const key = setup.join(",");
      if (seen.has(key)) continue;
      seen.add(key);
      next.push({ setup, perm: compose2(node.perm, MOVES.get(mv)!.perm), invPerm: compose2(MOVES.get(inv(mv))!.perm, node.invPerm) });
    }
    frontier = next;
  }
  return Array.from(byKey.values()).map((c) => ({ labels: c.labels, perm: c.perm }));
}

let _wingBank: (Cyc & { moved?: number[] })[] | null = null;
function wingBank() {
  if (!_wingBank) _wingBank = buildWingBank().map((c) => ({ ...c, moved: WING_SLOTS.filter((s) => c.perm[s] !== s) }));
  return _wingBank;
}

/** Target colour for each wing slot = colour of the midge on the same face at
 * its edge location. Midges never move during pairing, so this is stable. */
function wingTargets(state: Uint8Array): Map<number, number> {
  const tgt = new Map<number, number>();
  for (const loc of MODEL_5.edgeGroups) for (const slots of loc) {
    const midge = slots.find((s) => isMidge(s));
    if (midge === undefined) continue;
    const color = state[midge];
    for (const s of slots) if (isWing(s)) tgt.set(s, color);
  }
  return tgt;
}
const piecePlaced = (state: Uint8Array, tgt: Map<number, number>, p: [number, number]) =>
  state[p[0]] === tgt.get(p[0]) && state[p[1]] === tgt.get(p[1]);
const piecesPlaced = (state: Uint8Array, tgt: Map<number, number>) =>
  WING_PIECES.reduce((n, p) => n + (piecePlaced(state, tgt, p) ? 1 : 0), 0);

/** Endgame fallback: conjugate a bank cycle by a short setup so a wing 3-cycle
 * the bank does not carry directly still becomes reachable. Rare — only the
 * last few pieces occasionally need it — so a small bounded search is cheap. */
function placeWingConjugate(
  state: Uint8Array, tgt: Map<number, number>, placed: number, locked: Set<number>, bank: Cyc[],
): string[] | null {
  const setupVocab = [...OUTER, ...WIDE, ...SLICE];
  let frontier: { setup: string[]; state: Uint8Array }[] = [{ setup: [], state }];
  const seen = new Set<string>([""]);
  for (let d = 0; d <= 1; d++) {
    for (const node of frontier) {
      const undo = invSeq(node.setup);
      for (const c of bank) {
        const cand = applyLabels(applyFast(node.state, c.perm), undo);
        if (piecesPlaced(cand, tgt) > placed && WING_PIECES.every((p) => !((locked.has(p[0]) || locked.has(p[1])) && !piecePlaced(cand, tgt, p)))) {
          return [...node.setup, ...c.labels, ...undo];
        }
      }
    }
    if (d === 2) break;
    const next: { setup: string[]; state: Uint8Array }[] = [];
    for (const node of frontier) for (const mv of setupVocab) {
      const last = node.setup[node.setup.length - 1];
      if (last && baseOf(last) === baseOf(mv) && last !== mv) continue;
      const setup = [...node.setup, mv];
      const key = setup.join(",");
      if (seen.has(key)) continue;
      seen.add(key);
      next.push({ setup, state: apply1(node.state, mv) });
    }
    frontier = next;
  }
  return null;
}

/** Pair wings one piece at a time with pure 3-cycles (midges fixed, so the
 * target colouring is stable). Returns done=false if it stalls — which happens
 * only on an odd wing permutation the even 3-cycles cannot reach. */
function pairPure(state: Uint8Array): { state: Uint8Array; moves: string[]; done: boolean } {
  const bank = wingBank();
  const tgt = wingTargets(state);
  let cur = state;
  const moves: string[] = [];
  let placed = piecesPlaced(cur, tgt);
  let guard = 0;
  while (placed < WING_PIECES.length) {
    if (guard++ > 120) return { state: cur, moves, done: false };
    const locked = new Set<number>();
    for (const p of WING_PIECES) if (piecePlaced(cur, tgt, p)) { locked.add(p[0]); locked.add(p[1]); }
    let found: string[] | null = null;
    for (const c of bank) {
      if (c.moved!.some((s) => locked.has(s))) continue;
      if (piecesPlaced(applyFast(cur, c.perm), tgt) > placed) { found = c.labels; break; }
    }
    if (!found) found = placeWingConjugate(cur, tgt, placed, locked, bank);
    if (!found) return { state: cur, moves, done: false };
    cur = applyLabels(cur, found);
    moves.push(...found);
    placed = piecesPlaced(cur, tgt);
  }
  return { state: cur, moves, done: true };
}

export function solveEdgePairs(state: Uint8Array): { state: Uint8Array; moves: string[] } {
  const first = pairPure(state);
  if (first.done) return { state: first.state, moves: first.moves };
  // Odd wing permutation: one centre-preserving OLL parity turn toggles it,
  // after which pure 3-cycles complete. Apply it once, up front.
  const afterParity = applyLabels(state, OLL_PARITY_EDGE);
  const second = pairPure(afterParity);
  if (!second.done) {
    const m1 = WING_PIECES.filter((p) => !piecePlaced(first.state, wingTargets(first.state), p)).length;
    const m2 = WING_PIECES.filter((p) => !piecePlaced(second.state, wingTargets(second.state), p)).length;
    throw new Error(`5x5 edge parity unresolved (first misplaced=${m1}, second misplaced=${m2})`);
  }
  return { state: second.state, moves: [...OLL_PARITY_EDGE, ...second.moves] };
}

/** Reduce an arbitrary 5x5 (fast state) to centers-solved, edges-paired. */
export function reduce5(state: Uint8Array): { state: Uint8Array; moves: string[] } {
  const centers = solveCenters(state);
  const edges = solveEdgePairs(centers.state);
  return { state: edges.state, moves: expandLabels([...centers.moves, ...edges.moves]) };
}

// re-export for diagnostics/tests
export { centerProgressFast };
