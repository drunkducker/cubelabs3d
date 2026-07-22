/**
 * 5x5 reduction search on the fast facelet model.
 *
 * Solve the six 3x3 centers, then pair the 12 edge triplets, after which the
 * cube behaves as a 3x3 under outer turns and can be handed to cubejs.
 *
 * Unlike the 4x4, the 5x5 center search needs finer control than 2-layer wide
 * turns give: it also uses inner-slice moves (the single layer next to a face,
 * e.g. `Rw R'`). Those are kept as search primitives with a precomposed
 * permutation, but expand back to ordinary outer/wide tokens in the emitted
 * solution, so playback and verification never see a non-standard move.
 */
import {
  buildFastModel,
  applyFast,
  centerProgressFast,
  edgeProgressFast,
  sequencePerm,
  stateKey,
} from "./nxn-fast";

const SIZE = 5;
export const MODEL_5 = buildFastModel(SIZE);
const FACES = ["U", "R", "F", "D", "L", "B"] as const;
type FaceLetter = (typeof FACES)[number];
const FACE_AXIS: Record<FaceLetter, "x" | "y" | "z"> = { U: "y", D: "y", R: "x", L: "x", F: "z", B: "z" };

type MoveDef = { label: string; perm: Int32Array; expand: string[]; base: string; inv: string };
const MOVES = new Map<string, MoveDef>();
const define = (d: MoveDef) => MOVES.set(d.label, d);

// outer single quarter turns
for (const f of FACES) {
  define({ label: f, perm: MODEL_5.movePerm[f], expand: [f], base: f, inv: `${f}'` });
  define({ label: `${f}'`, perm: MODEL_5.movePerm[`${f}'`], expand: [`${f}'`], base: f, inv: f });
}
// 2-layer wide quarter turns
for (const f of FACES) {
  define({ label: `${f}w`, perm: MODEL_5.movePerm[`${f}w`], expand: [`${f}w`], base: `${f}w`, inv: `${f}w'` });
  define({ label: `${f}w'`, perm: MODEL_5.movePerm[`${f}w'`], expand: [`${f}w'`], base: `${f}w`, inv: `${f}w` });
}
// inner-slice quarter turns: the single layer next to the face (Fw F')
for (const f of FACES) {
  define({ label: `${f}s`, perm: sequencePerm(MODEL_5, [`${f}w`, `${f}'`]), expand: [`${f}w`, `${f}'`], base: `${f}s`, inv: `${f}s'` });
  define({ label: `${f}s'`, perm: sequencePerm(MODEL_5, [`${f}w'`, f]), expand: [`${f}w'`, f], base: `${f}s`, inv: `${f}s` });
}

const OUTER = FACES.flatMap((f) => [f as string, `${f}'`]);
const WIDE = FACES.flatMap((f) => [`${f}w`, `${f}w'`]);
const SLICE = FACES.flatMap((f) => [`${f}s`, `${f}s'`]);

const apply1 = (state: Uint8Array, label: string) => applyFast(state, MOVES.get(label)!.perm);
const applySeqL = (state: Uint8Array, labels: string[]) => labels.reduce((s, l) => apply1(s, l), state);
const inv = (label: string) => MOVES.get(label)!.inv;
const invSeq = (labels: string[]) => [...labels].reverse().map(inv);
const baseOf = (label: string) => MOVES.get(label)!.base;
export const expandLabels = (labels: string[]) => labels.flatMap((l) => MOVES.get(l)!.expand);

export type SolveSpec = {
  progress: (state: Uint8Array) => number;
  isValid: (state: Uint8Array) => boolean;
  target: number;
  perMoveGain?: number;
  idaMaxDepth?: number;
  setup: string[];  // moves used to position (usually outer)
  fetch: string[];  // moves that relocate pieces across faces (wide / slice)
  core: string[];   // moves used inside wrapped cores (usually outer)
};

// ---- 4x4-style last-edge bank, reused for 5x5 edge triplets ----------
function lastEdgeAlgorithms(): string[][] {
  const out: string[][] = [];
  for (const wideFace of FACES) {
    for (const a of FACES) {
      if (FACE_AXIS[a] === FACE_AXIS[wideFace]) continue;
      for (const c of FACES) {
        if (FACE_AXIS[c] === FACE_AXIS[wideFace] || FACE_AXIS[c] === FACE_AXIS[a]) continue;
        for (const primeWide of [false, true]) {
          const w = primeWide ? `${wideFace}w'` : `${wideFace}w`;
          const wInv = primeWide ? `${wideFace}w` : `${wideFace}w'`;
          const alg = [w, a, wideFace, `${a}'`, c, `${a}'`, `${c}'`, a, wInv];
          out.push(alg);
          out.push(invSeq(alg));
        }
      }
    }
  }
  return out;
}
const LAST_EDGE_ALGORITHMS = lastEdgeAlgorithms();

// ---- search tiers ----------------------------------------------------

/** [setup][one fetch move][undo setup], BFS over setups up to maxSetupDepth.
 * The fetch move relocates a piece across faces; the setup positions it. */
function tryConjugate(state: Uint8Array, target: number, spec: SolveSpec, maxSetupDepth: number): string[] | null {
  for (const fetch of spec.fetch) {
    const fetchBase = baseOf(fetch);
    let frontier: { setup: string[]; setupState: Uint8Array }[] = [{ setup: [], setupState: state }];
    const visited = new Set<string>([""]);
    for (let d = 0; d <= maxSetupDepth; d++) {
      for (const node of frontier) {
        const afterFetch = apply1(node.setupState, fetch);
        const candidate = applySeqL(afterFetch, invSeq(node.setup));
        if (spec.progress(candidate) > target && spec.isValid(candidate)) {
          return [...node.setup, fetch, ...invSeq(node.setup)];
        }
      }
      if (d === maxSetupDepth) break;
      const next: { setup: string[]; setupState: Uint8Array }[] = [];
      for (const node of frontier) {
        for (const move of spec.setup) {
          const last = node.setup[node.setup.length - 1];
          if (last && baseOf(last) === baseOf(move) && last !== move) continue;
          if (baseOf(move) === fetchBase) continue;
          const setup = [...node.setup, move];
          const key = setup.join(",");
          if (visited.has(key)) continue;
          visited.add(key);
          next.push({ setup, setupState: apply1(node.setupState, move) });
        }
      }
      frontier = next;
    }
  }
  return null;
}

/** A B A' B' commutators. B ranges over both fetch moves and outer face turns:
 * the canonical center 3-cycle is a slice against an outer face turn (r U r'
 * U'), which a fetch-only pairing never tries — and that shape is exactly what
 * the last dozen centers need, so without it they fall through to the far
 * more expensive wrapped-core sweep. */
function tryCommutator(state: Uint8Array, target: number, spec: SolveSpec): string[] | null {
  const bMoves = [...spec.fetch, ...spec.setup];
  for (const a of spec.fetch) for (const b of bMoves) {
    if (baseOf(a) === baseOf(b)) continue;
    const seq = [a, b, inv(a), inv(b)];
    const candidate = applySeqL(state, seq);
    if (spec.progress(candidate) > target && spec.isValid(candidate)) return seq;
  }
  return null;
}

/** A short outer-move setup wrapped around a slice/outer commutator (both
 * directions) — catches endgame centers, including the last-two-centers case,
 * that a bare commutator can't reach. This is the reliable center-3-cycle
 * finder that keeps the search off the far slower wrapped-core/IDA tiers. */
function tryConjugatedCommutator(state: Uint8Array, target: number, spec: SolveSpec, maxSetupDepth: number): string[] | null {
  const bMoves = [...spec.fetch, ...spec.setup];
  let frontier: { setup: string[]; state: Uint8Array }[] = [{ setup: [], state }];
  for (let d = 0; d <= maxSetupDepth; d++) {
    for (const node of frontier) {
      const undo = invSeq(node.setup);
      for (const a of spec.fetch) for (const b of bMoves) {
        if (baseOf(a) === baseOf(b)) continue;
        for (const comm of [[a, b, inv(a), inv(b)], [inv(a), inv(b), a, b]]) {
          const candidate = applySeqL(node.state, [...comm, ...undo]);
          if (spec.progress(candidate) > target && spec.isValid(candidate)) {
            return [...node.setup, ...comm, ...undo];
          }
        }
      }
    }
    if (d === maxSetupDepth) break;
    const next: { setup: string[]; state: Uint8Array }[] = [];
    for (const node of frontier) {
      for (const move of spec.setup) {
        const last = node.setup[node.setup.length - 1];
        if (last && baseOf(last) === baseOf(move) && last !== move) continue;
        next.push({ setup: [...node.setup, move], state: apply1(node.state, move) });
      }
    }
    frontier = next;
  }
  return null;
}

/** [wide][core of outer moves][wide inverse] — preserves whatever the wide
 * displaced while the core rearranges pieces. */
function tryWideWrappedCore(state: Uint8Array, target: number, spec: SolveSpec, maxCoreDepth: number): string[] | null {
  for (const wide of WIDE) {
    const wideInverse = inv(wide);
    const afterWide = apply1(state, wide);
    let frontier: { core: string[]; state: Uint8Array }[] = [{ core: [], state: afterWide }];
    const visited = new Set<string>([""]);
    for (let d = 0; d < maxCoreDepth; d++) {
      const next: { core: string[]; state: Uint8Array }[] = [];
      for (const node of frontier) {
        for (const move of spec.core) {
          const last = node.core[node.core.length - 1];
          if (last && baseOf(last) === baseOf(move) && last !== move) continue;
          const newState = apply1(node.state, move);
          const closed = apply1(newState, wideInverse);
          if (spec.progress(closed) > target && spec.isValid(closed)) return [wide, ...node.core, move, wideInverse];
          const key = stateKey(newState);
          if (visited.has(key)) continue;
          visited.add(key);
          next.push({ core: [...node.core, move], state: newState });
        }
      }
      frontier = next;
    }
  }
  return null;
}

function tryLastEdgeAlgorithm(state: Uint8Array, target: number, spec: SolveSpec, maxSetupDepth: number): string[] | null {
  let frontier: { setup: string[]; state: Uint8Array }[] = [{ setup: [], state }];
  for (let d = 0; d <= maxSetupDepth; d++) {
    for (const node of frontier) {
      const undoSetup = invSeq(node.setup);
      for (const alg of LAST_EDGE_ALGORITHMS) {
        const candidate = applySeqL(node.state, [...alg, ...undoSetup]);
        if (spec.progress(candidate) > target && spec.isValid(candidate)) return [...node.setup, ...alg, ...undoSetup];
      }
    }
    if (d === maxSetupDepth) break;
    const next: { setup: string[]; state: Uint8Array }[] = [];
    for (const node of frontier) {
      for (const move of spec.core) {
        const last = node.setup[node.setup.length - 1];
        if (last && baseOf(last) === baseOf(move) && last !== move) continue;
        next.push({ setup: [...node.setup, move], state: apply1(node.state, move) });
      }
    }
    frontier = next;
  }
  return null;
}

function tryIdaStar(state: Uint8Array, target: number, spec: SolveSpec): string[] | null {
  const vocab = [...spec.fetch, ...spec.core];
  const gain = spec.perMoveGain ?? 4;
  const maxDepth = spec.idaMaxDepth ?? 10;
  const hAt = (progress: number) => (progress > target ? 0 : Math.ceil((target + 1 - progress) / gain));
  for (let bound = 1; bound <= maxDepth; bound++) {
    const path: string[] = [];
    const onPath = new Set<string>();
    const dfs = (node: Uint8Array, g: number): string[] | null => {
      const progress = spec.progress(node);
      if (progress > target && spec.isValid(node)) return [...path];
      if (g + hAt(progress) > bound) return null;
      const key = stateKey(node);
      if (onPath.has(key)) return null;
      onPath.add(key);
      for (const move of vocab) {
        const last = path[path.length - 1];
        if (last && baseOf(last) === baseOf(move) && last !== move) continue;
        path.push(move);
        const result = dfs(apply1(node, move), g + 1);
        if (result) return result;
        path.pop();
      }
      onPath.delete(key);
      return null;
    };
    const found = dfs(state, 0);
    if (found) return found;
  }
  return null;
}

function solveByProgress(start: Uint8Array, spec: SolveSpec): { state: Uint8Array; moves: string[] } {
  let state = start;
  let progress = spec.progress(state);
  const allMoves: string[] = [];
  const isCenters = spec.target === 54;
  const debug = typeof process !== "undefined" && process.env && process.env.RS_DEBUG;
  while (progress < spec.target) {
    const target = progress;
    const t0 = Date.now();
    let via = "conj2";
    let found = tryConjugate(state, target, spec, 2);
    if (!found) { via = "comm"; found = tryCommutator(state, target, spec); }
    if (!found && isCenters) { via = "conjComm"; found = tryConjugatedCommutator(state, target, spec, 3); }
    if (!found) { via = "conjDeep"; found = tryConjugate(state, target, spec, isCenters ? 4 : 3); }
    if (!found) { via = "wrapped"; found = tryWideWrappedCore(state, target, spec, 4); }
    if (!found && spec.target === 12) { via = "lastEdge"; found = tryLastEdgeAlgorithm(state, target, spec, 2); }
    if (!found) { via = "ida"; found = tryIdaStar(state, target, spec); }
    if (debug) process.stderr.write(`  ${spec.target === 54 ? "C" : "E"} ${progress}->? via=${via} ms=${Date.now() - t0}\n`);
    if (!found) throw new Error(`5x5 reduction stuck at ${progress}/${spec.target}`);
    state = applySeqL(state, found);
    allMoves.push(...found);
    const newProgress = spec.progress(state);
    if (newProgress <= progress) throw new Error(`5x5 reduction non-improving step: ${progress} -> ${newProgress}`);
    progress = newProgress;
  }
  return { state, moves: allMoves };
}

// ---- public API ------------------------------------------------------

export function solveCenters(state: Uint8Array) {
  const r = solveByProgress(state, {
    progress: (s) => centerProgressFast(MODEL_5, s),
    isValid: () => true,
    target: 54,
    perMoveGain: 4,
    idaMaxDepth: 5,
    setup: OUTER,
    fetch: [...SLICE, ...WIDE],
    core: OUTER,
  });
  return r;
}

export function solveEdgePairs(state: Uint8Array) {
  return solveByProgress(state, {
    progress: (s) => edgeProgressFast(MODEL_5, s),
    isValid: (s) => centerProgressFast(MODEL_5, s) === 54,
    target: 12,
    perMoveGain: 1,
    idaMaxDepth: 10,
    setup: OUTER,
    fetch: WIDE,
    core: OUTER,
  });
}

/** Reduce an arbitrary 5x5 (fast state) to centers-solved, edges-paired. The
 * returned moves are ordinary outer/wide tokens (inner slices expanded). */
export function reduce5(state: Uint8Array): { state: Uint8Array; moves: string[] } {
  const centers = solveCenters(state);
  const edges = solveEdgePairs(centers.state);
  return { state: edges.state, moves: expandLabels([...centers.moves, ...edges.moves]) };
}
