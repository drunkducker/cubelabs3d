/**
 * 4x4 reduction search on the fast facelet model.
 *
 * Solve the six centers, then pair the 24 wing pieces into 12 matched edges,
 * after which the cube behaves as a 3x3 under outer-layer turns and can be
 * handed to cubejs. Every step is discovered by search against the live cube
 * (ported from the verified context/4x4-edge-pairing search), cheapest move
 * shapes first, with a complete IDA* backstop.
 *
 * Runs on Uint8Array facelet states (lib/nxn-fast) rather than the geometric
 * cubie engine, which is ~100x too slow for the wide-wrapped-core sweeps.
 */
import {
  buildFastModel,
  applyFast,
  applyFastSeq,
  centerProgressFast,
  edgeProgressFast,
  stateKey,
  type FastModel,
} from "./nxn-fast";
import { inverseMove } from "./nxn-cube";

const SIZE = 4;
export const MODEL_4 = buildFastModel(SIZE);
const SINGLES = MODEL_4.singles;
const WIDES = MODEL_4.wides;
const FACES = ["U", "R", "F", "D", "L", "B"] as const;
type FaceLetter = (typeof FACES)[number];
const FACE_AXIS: Record<FaceLetter, "x" | "y" | "z"> = { U: "y", D: "y", R: "x", L: "x", F: "z", B: "z" };

const apply1 = (state: Uint8Array, token: string) => applyFast(state, MODEL_4.movePerm[token]);
const applySeq = (state: Uint8Array, tokens: string[]) => applyFastSeq(MODEL_4, state, tokens);
const baseFace = (token: string) => token[0] + (token.includes("w") ? "w" : "");

export type SolveSpec = {
  progress: (state: Uint8Array) => number;
  isValid: (state: Uint8Array) => boolean;
  target: number;
  perMoveGain?: number;
  idaMaxDepth?: number;
};

// ---- last-edge algorithm bank (4x4-specific) -------------------------
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
          out.push([...alg].reverse().map(inverseMove));
        }
      }
    }
  }
  return out;
}
const LAST_EDGE_ALGORITHMS = lastEdgeAlgorithms();

// ---- search tiers ----------------------------------------------------

/**
 * [setup][one wide][undo setup], searching real multi-move setups by BFS up
 * to maxSetupDepth (not just a single face repeated). This is the workhorse
 * for centres-solving, where a wide move fetches a centre piece and the setup
 * positions it — the last couple of centres need genuine multi-face setups,
 * so a shallow single-face-only setup bank strands the search.
 */
function tryConjugate(state: Uint8Array, target: number, spec: SolveSpec, maxSetupDepth: number): string[] | null {
  for (const wide of WIDES) {
    const wideBase = baseFace(wide);
    let frontier: { setup: string[]; setupState: Uint8Array }[] = [{ setup: [], setupState: state }];
    const visited = new Set<string>([""]);
    for (let d = 0; d <= maxSetupDepth; d++) {
      for (const node of frontier) {
        const afterWide = apply1(node.setupState, wide);
        const candidate = applySeq(afterWide, [...node.setup].reverse().map(inverseMove));
        if (spec.progress(candidate) > target && spec.isValid(candidate)) {
          return [...node.setup, wide, ...[...node.setup].reverse().map(inverseMove)];
        }
      }
      if (d === maxSetupDepth) break;
      const next: { setup: string[]; setupState: Uint8Array }[] = [];
      for (const node of frontier) {
        for (const single of SINGLES) {
          const last = node.setup[node.setup.length - 1];
          if (last && baseFace(last) === baseFace(single) && last !== single) continue;
          // a setup move on the wide's own face is wasted (it commutes into the
          // undo), so skip it to keep the branching lean
          if (baseFace(single) === wideBase) continue;
          const setup = [...node.setup, single];
          const setupState = apply1(node.setupState, single);
          const key = setup.join(",");
          if (visited.has(key)) continue;
          visited.add(key);
          next.push({ setup, setupState });
        }
      }
      frontier = next;
    }
  }
  return null;
}

function tryCommutator(state: Uint8Array, target: number, spec: SolveSpec): string[] | null {
  for (const a of WIDES) for (const b of WIDES) {
    if (baseFace(a) === baseFace(b)) continue;
    const seq = [a, b, inverseMove(a), inverseMove(b)];
    const candidate = applySeq(state, seq);
    if (spec.progress(candidate) > target && spec.isValid(candidate)) return seq;
  }
  return null;
}

function tryWideWrappedCore(state: Uint8Array, target: number, spec: SolveSpec, maxCoreDepth: number): string[] | null {
  for (const wide of WIDES) {
    const wideInverse = inverseMove(wide);
    const afterWide = apply1(state, wide);
    let frontier: { core: string[]; state: Uint8Array }[] = [{ core: [], state: afterWide }];
    const visited = new Set<string>([""]);
    for (let d = 0; d < maxCoreDepth; d++) {
      const next: { core: string[]; state: Uint8Array }[] = [];
      for (const node of frontier) {
        for (const single of SINGLES) {
          const last = node.core[node.core.length - 1];
          if (last && baseFace(last) === baseFace(single) && last !== single) continue;
          const newState = apply1(node.state, single);
          const closed = apply1(newState, wideInverse);
          if (spec.progress(closed) > target && spec.isValid(closed)) return [wide, ...node.core, single, wideInverse];
          const key = stateKey(newState);
          if (visited.has(key)) continue;
          visited.add(key);
          next.push({ core: [...node.core, single], state: newState });
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
      const undoSetup = [...node.setup].reverse().map(inverseMove);
      for (const alg of LAST_EDGE_ALGORITHMS) {
        const candidate = applySeq(node.state, [...alg, ...undoSetup]);
        if (spec.progress(candidate) > target && spec.isValid(candidate)) return [...node.setup, ...alg, ...undoSetup];
      }
    }
    if (d === maxSetupDepth) break;
    const next: { setup: string[]; state: Uint8Array }[] = [];
    for (const node of frontier) {
      for (const single of SINGLES) {
        const last = node.setup[node.setup.length - 1];
        if (last && baseFace(last) === baseFace(single) && last !== single) continue;
        next.push({ setup: [...node.setup, single], state: apply1(node.state, single) });
      }
    }
    frontier = next;
  }
  return null;
}

function tryIdaStar(state: Uint8Array, target: number, spec: SolveSpec): string[] | null {
  const vocab = [...WIDES, ...SINGLES];
  const gain = spec.perMoveGain ?? 4;
  const maxDepth = spec.idaMaxDepth ?? 12;
  // Each solveByProgress step only needs to reach target+1, so the admissible
  // heuristic is the cost to gain one more unit — not the cost to full
  // reduction. Measuring against spec.target here would over-prune and miss
  // real single-step fixes (which is exactly what stranded the edge phase).
  const hAt = (progress: number) => (progress > target ? 0 : Math.ceil((target + 1 - progress) / gain));

  for (let bound = 1; bound <= maxDepth; bound++) {
    const path: string[] = [];
    // On-path cycle detection only — a per-bound global visited set would
    // over-prune (marking a state seen at high g blocks reaching it cheaply on
    // another branch), which is exactly what stranded the last centres.
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
        if (last && baseFace(last) === baseFace(move) && last !== move) continue;
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
  const isCenters = spec.target === 24;
  while (progress < spec.target) {
    const target = progress;
    let found = tryConjugate(state, target, spec, isCenters ? 2 : 1);
    if (!found) found = tryCommutator(state, target, spec);
    if (!found && isCenters) found = tryConjugate(state, target, spec, 4);
    if (!found) found = tryWideWrappedCore(state, target, spec, 4);
    if (!found && spec.target === 12) found = tryLastEdgeAlgorithm(state, target, spec, 3);
    if (!found) found = tryIdaStar(state, target, spec);
    if (!found) throw new Error(`4x4 reduction stuck at ${progress}/${spec.target}`);
    state = applySeq(state, found);
    allMoves.push(...found);
    const newProgress = spec.progress(state);
    if (newProgress <= progress) throw new Error(`4x4 reduction non-improving step: ${progress} -> ${newProgress}`);
    progress = newProgress;
  }
  return { state, moves: allMoves };
}

// ---- public API ------------------------------------------------------

export function solveCenters(state: Uint8Array) {
  return solveByProgress(state, {
    progress: (s) => centerProgressFast(MODEL_4, s),
    isValid: () => true,
    target: 24,
    perMoveGain: 4,
    idaMaxDepth: 12,
  });
}

export function solveEdgePairs(state: Uint8Array) {
  return solveByProgress(state, {
    progress: (s) => edgeProgressFast(MODEL_4, s),
    isValid: (s) => centerProgressFast(MODEL_4, s) === 24,
    target: 12,
    perMoveGain: 1,
    idaMaxDepth: 12,
  });
}

/** Reduce an arbitrary 4x4 (fast state) to a paired, centers-solved state. */
export function reduce4(state: Uint8Array): { state: Uint8Array; moves: string[] } {
  const centers = solveCenters(state);
  const edges = solveEdgePairs(centers.state);
  return { state: edges.state, moves: [...centers.moves, ...edges.moves] };
}
