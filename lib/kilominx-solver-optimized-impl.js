/**
 * Move-count-optimized Kilominx reduction planner.
 *
 * The engine remains the source of truth for geometry, moves, state validation,
 * and solution verification. This module only improves which verified reduction
 * primitives are selected and in what order.
 */
import {
  MOVES,
  MOVE_COUNT,
  applyMoveIndex,
  applyMoves,
  clone,
  faceOfMove,
  inverseMoveIndex,
  inverseSequence,
  isSolvableKiloState,
  isSolved,
  simplify,
  solved,
} from "./kilominx-engine";

let tables = null;
const twoTwistCache = new Map();

function movedCorners(state) {
  const moved = [];
  for (let i = 0; i < 20; i++) if (state.cp[i] !== i) moved.push(i);
  return moved;
}

function twistedCorners(state) {
  const twisted = [];
  for (let i = 0; i < 20; i++) if (state.co[i] !== 0) twisted.push(i);
  return twisted;
}

/** Visit move sequences breadth-first without materialising the full tree. */
function visitSequences(maxLength, visit) {
  const sequence = [];

  function visitExactLength(remaining, lastFace) {
    if (remaining === 0) return visit(sequence);
    for (let move = 0; move < MOVE_COUNT; move++) {
      const face = faceOfMove(move);
      if (face === lastFace) continue;
      sequence.push(move);
      if (visitExactLength(remaining - 1, face)) return true;
      sequence.pop();
    }
    return false;
  }

  for (let length = 1; length <= maxLength; length++) {
    if (visitExactLength(length, -1)) return true;
  }
  return false;
}

/** Read a permutation as the oriented cycle piece a -> b -> c -> a. */
function readThreeCycle(permutation) {
  const moved = [];
  for (let i = 0; i < 20; i++) if (permutation[i] !== i) moved.push(i);
  if (moved.length !== 3) return null;

  const nextSlot = new Map();
  for (const destination of moved) nextSlot.set(permutation[destination], destination);

  const start = moved[0];
  const order = [start];
  let cursor = nextSlot.get(start);
  while (cursor !== undefined && cursor !== start && order.length < 4) {
    order.push(cursor);
    cursor = nextSlot.get(cursor);
  }
  return order.length === 3 && cursor === start ? order : null;
}

function storeShortest(table, key, candidate) {
  const current = table.get(key);
  if (!current || candidate.length < current.length) table.set(key, candidate);
}

function buildTables() {
  const identity = solved();

  let cyclePrimitive = null;
  for (let first = 0; first < MOVE_COUNT && !cyclePrimitive; first++) {
    visitSequences(4, (insertionView) => {
      const insertion = [...insertionView];
      const sequence = [
        first,
        ...insertion,
        inverseMoveIndex(first),
        ...inverseSequence(insertion),
      ];
      const state = applyMoves(identity, sequence);
      if (movedCorners(state).length === 3 && twistedCorners(state).length === 0) {
        cyclePrimitive = simplify(sequence);
        return true;
      }
      return false;
    });
  }
  if (!cyclePrimitive) throw new Error("Kilominx solver: no pure 3-cycle found");

  let twistPrimitive = null;
  visitSequences(3, (setupView) => {
    const setup = [...setupView];
    const conjugate = [...setup, ...cyclePrimitive, ...inverseSequence(setup)];
    const commutator = simplify([
      ...cyclePrimitive,
      ...conjugate,
      ...inverseSequence(cyclePrimitive),
      ...inverseSequence(conjugate),
    ]);
    const state = applyMoves(identity, commutator);
    const twisted = twistedCorners(state);
    if (
      movedCorners(state).length === 0 &&
      twisted.length === 3 &&
      twisted.every((corner) => state.co[corner] === state.co[twisted[0]]) &&
      (!twistPrimitive || commutator.length < twistPrimitive.length)
    ) {
      twistPrimitive = commutator;
    }
    return false;
  });
  if (!twistPrimitive) throw new Error("Kilominx solver: no pure twist found");

  // Track only where the primitive's three corners move. This is substantially
  // cheaper than carrying a complete KiloState through the conjugator BFS.
  const moveDestination = MOVES.map((move) => {
    const destination = Array.from({ length: 20 }, (_, i) => i);
    for (const transition of move) destination[transition.from] = transition.to;
    return destination;
  });

  const base = movedCorners(applyMoves(identity, cyclePrimitive));
  const tripleKey = (positions) => `${positions[0]},${positions[1]},${positions[2]}`;
  const setups = new Map([[tripleKey(base), []]]);
  const queuedPositions = [[...base]];
  const queuedSequences = [[]];

  for (let head = 0; head < queuedPositions.length; head++) {
    const positions = queuedPositions[head];
    const setup = queuedSequences[head];
    for (let move = 0; move < MOVE_COUNT; move++) {
      const destination = moveDestination[move];
      const nextPositions = positions.map((position) => destination[position]);
      const key = tripleKey(nextPositions);
      if (setups.has(key)) continue;
      const nextSetup = [...setup, move];
      setups.set(key, nextSetup);
      queuedPositions.push(nextPositions);
      queuedSequences.push(nextSetup);
    }
  }

  const expectedSetups = 20 * 19 * 18;
  if (setups.size !== expectedSetups) {
    throw new Error(`Kilominx solver: incomplete setup table (${setups.size})`);
  }

  const cycleTable = new Map();
  const twistTable = new Map();

  for (const setup of setups.values()) {
    const inverseSetup = inverseSequence(setup);

    const cycleConjugate = simplify([...inverseSetup, ...cyclePrimitive, ...setup]);
    const cycle = readThreeCycle(applyMoves(identity, cycleConjugate).cp);
    if (cycle) {
      for (let rotation = 0; rotation < 3; rotation++) {
        const key = `${cycle[rotation]},${cycle[(rotation + 1) % 3]},${cycle[(rotation + 2) % 3]}`;
        storeShortest(cycleTable, key, cycleConjugate);
      }
    }

    const twistConjugate = simplify([...inverseSetup, ...twistPrimitive, ...setup]);
    const twistState = applyMoves(identity, twistConjugate);
    const twisted = twistedCorners(twistState);
    if (movedCorners(twistState).length !== 0 || twisted.length !== 3) continue;

    const key = [...twisted].sort((a, b) => a - b).join(",");
    const current = twistTable.get(key) ?? [null, null];
    const primitiveAmount = twistState.co[twisted[0]];
    for (const desired of [1, 2]) {
      const candidate = primitiveAmount === desired
        ? twistConjugate
        : simplify([...twistConjugate, ...twistConjugate]);
      const index = desired - 1;
      if (!current[index] || candidate.length < current[index].length) current[index] = candidate;
    }
    twistTable.set(key, current);
  }

  // All written rotations are retained so ordered-triple lookups stay constant-time.
  if (cycleTable.size !== expectedSetups) {
    throw new Error(`Kilominx solver: incomplete 3-cycle table (${cycleTable.size})`);
  }
  const expectedTwists = (20 * 19 * 18) / 6;
  if (twistTable.size !== expectedTwists) {
    throw new Error(`Kilominx solver: incomplete twist table (${twistTable.size})`);
  }

  return { cycleTable, twistTable };
}

function threeCycle(solverTables, a, b, c) {
  const direct = solverTables.cycleTable.get(`${a},${b},${c}`);
  if (direct) return direct;
  const reverse = solverTables.cycleTable.get(`${a},${c},${b}`);
  return reverse ? simplify([...reverse, ...reverse]) : null;
}

function tripleTwist(solverTables, corners, amount) {
  const key = [...corners].sort((a, b) => a - b).join(",");
  return solverTables.twistTable.get(key)?.[amount - 1] ?? null;
}

/** Build +1 on one corner and +2 on another while cancelling both helpers. */
function twoTwist(solverTables, plusOne, plusTwo) {
  const cacheKey = `${plusOne},${plusTwo}`;
  if (twoTwistCache.has(cacheKey)) return twoTwistCache.get(cacheKey) ?? null;

  let best = null;
  for (let helperA = 0; helperA < 20; helperA++) {
    if (helperA === plusOne || helperA === plusTwo) continue;
    for (let helperB = helperA + 1; helperB < 20; helperB++) {
      if (helperB === plusOne || helperB === plusTwo) continue;
      const first = tripleTwist(solverTables, [helperA, helperB, plusOne], 1);
      const second = tripleTwist(solverTables, [helperA, helperB, plusTwo], 2);
      if (!first || !second) continue;
      const candidate = simplify([...first, ...second]);
      if (!best || candidate.length < best.length) best = candidate;
    }
  }

  twoTwistCache.set(cacheKey, best);
  return best;
}

/** Account for simplification where the next primitive meets the solution tail. */
function boundaryCost(solution, candidate) {
  if (!solution.length) return candidate.length;
  const lastFace = faceOfMove(solution[solution.length - 1]);
  let tailStart = solution.length - 1;
  while (tailStart > 0 && faceOfMove(solution[tailStart - 1]) === lastFace) tailStart--;
  const tail = solution.slice(tailStart);
  return simplify([...tail, ...candidate]).length - tail.length;
}

function pickTriple(solverTables, corners, amount, solution) {
  let best = null;
  for (let i = 0; i < corners.length - 2; i++) {
    for (let j = i + 1; j < corners.length - 1; j++) {
      for (let k = j + 1; k < corners.length; k++) {
        const sequence = tripleTwist(
          solverTables,
          [corners[i], corners[j], corners[k]],
          amount,
        );
        if (!sequence) continue;
        const cost = boundaryCost(solution, sequence);
        if (!best || cost < best.cost || (cost === best.cost && sequence.length < best.sequence.length)) {
          best = { sequence, indices: [i, j, k], cost };
        }
      }
    }
  }
  return best;
}

export function solveOptimized(state) {
  if (!isSolvableKiloState(state)) throw new Error("Kilominx solve: unreachable state");
  const solverTables = tables ?? (tables = buildTables());

  let current = clone(state);
  const solution = [];
  const run = (sequence) => {
    for (const move of sequence) current = applyMoveIndex(current, move);
    solution.push(...sequence);
  };

  // Solve permutation cycles directly. Each chosen cycle acts only on currently
  // misplaced slots and maximizes the number of pieces fixed by that operation.
  while (!current.cp.every((piece, slot) => piece === slot)) {
    const misplaced = [];
    for (let slot = 0; slot < 20; slot++) {
      if (current.cp[slot] !== slot) misplaced.push(slot);
    }

    let best = null;
    for (const a of misplaced) {
      for (const b of misplaced) {
        if (b === a) continue;
        for (const c of misplaced) {
          if (c === a || c === b) continue;
          const sequence = threeCycle(solverTables, a, b, c);
          if (!sequence) continue;
          const gain = Number(current.cp[c] === a)
            + Number(current.cp[a] === b)
            + Number(current.cp[b] === c);
          if (gain === 0) continue;
          const cost = boundaryCost(solution, sequence);
          if (
            !best
            || gain > best.gain
            || (gain === best.gain && cost < best.cost)
            || (gain === best.gain && cost === best.cost && sequence.length < best.sequence.length)
          ) {
            best = { sequence, gain, cost };
          }
        }
      }
    }

    if (!best) {
      throw new Error(`Kilominx solve: no improving 3-cycle for ${misplaced.length} corners`);
    }
    run(best.sequence);
  }

  const needPlusOne = [];
  const needPlusTwo = [];
  for (let corner = 0; corner < 20; corner++) {
    const needed = (3 - current.co[corner]) % 3;
    if (needed === 1) needPlusOne.push(corner);
    else if (needed === 2) needPlusTwo.push(corner);
  }

  while (needPlusOne.length >= 3) {
    const picked = pickTriple(solverTables, needPlusOne, 1, solution);
    if (!picked) throw new Error("Kilominx solve: no +1 triple twist");
    run(picked.sequence);
    for (const index of [...picked.indices].sort((a, b) => b - a)) {
      needPlusOne.splice(index, 1);
    }
  }

  while (needPlusTwo.length >= 3) {
    const picked = pickTriple(solverTables, needPlusTwo, 2, solution);
    if (!picked) throw new Error("Kilominx solve: no +2 triple twist");
    run(picked.sequence);
    for (const index of [...picked.indices].sort((a, b) => b - a)) {
      needPlusTwo.splice(index, 1);
    }
  }

  while (needPlusOne.length) {
    let best = null;
    for (let plusOneIndex = 0; plusOneIndex < needPlusOne.length; plusOneIndex++) {
      for (let plusTwoIndex = 0; plusTwoIndex < needPlusTwo.length; plusTwoIndex++) {
        const sequence = twoTwist(
          solverTables,
          needPlusOne[plusOneIndex],
          needPlusTwo[plusTwoIndex],
        );
        if (!sequence) continue;
        const cost = boundaryCost(solution, sequence);
        if (!best || cost < best.cost || (cost === best.cost && sequence.length < best.sequence.length)) {
          best = { sequence, plusOneIndex, plusTwoIndex, cost };
        }
      }
    }
    if (!best) throw new Error("Kilominx solve: no paired twist");
    run(best.sequence);
    needPlusOne.splice(best.plusOneIndex, 1);
    needPlusTwo.splice(best.plusTwoIndex, 1);
  }

  if (needPlusTwo.length || !isSolved(current)) {
    throw new Error("Kilominx solve: orientation phase failed");
  }
  return simplify(solution);
}
