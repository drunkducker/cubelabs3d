/**
 * Puzzle registry — the single source of truth for which puzzles exist and how
 * "cookie-cutter" each one is.
 *
 * Cube Labs puzzles are meant to be built from one template: an ENGINE (state +
 * verified solver, the source of truth), a SOLVER route, a playable experience,
 * the shared Save & Friend Play panel (`UniversalPuzzleActions`), a 3D solution
 * playback, and a LEARN presence. Historically that set was copy-pasted across a
 * dozen files, so puzzles drifted out of sync silently.
 *
 * This registry names the contract each puzzle is expected to meet and, where a
 * puzzle intentionally skips part of it, records a WAIVER with a reason. The
 * `waivers` and `experiment` fields are the "freedom" hatch: while you are still
 * building or A/B-testing something, waive the capability with a note instead of
 * being nagged. `scripts/check-puzzles.mjs` reads this file and prints, per
 * puzzle, ✅ met / ⚠️ waived (intentional) / ❌ missing (an accidental gap, which
 * fails CI). Adding a new puzzle here with an unwaived contract item and no file
 * to back it is exactly what surfaces the gap.
 *
 * Keep this the ONE place the puzzle set is declared; migrate the hand-written
 * lists (the /solve hub, learn order, challenge routing, leaderboard, profile
 * colors) onto it over time so there is nothing left to keep in sync by hand.
 *
 * @typedef {"engine"|"solver"|"play"|"saveFriendPlay"|"solver3d"|"learn"} Capability
 * @typedef {Object} PuzzleExperiment
 * @property {string} flag  Env flag or note describing the A/B / experiment gate.
 * @property {string} note  What is being tried and why it is off the contract.
 * @typedef {Object} Puzzle
 * @property {string} id                    Canonical puzzleType (e.g. "3x3").
 * @property {string} name                  Display name.
 * @property {"stable"|"beta"|"reduced"|"experimental"|"coming-soon"} status
 * @property {string} accentVar             CSS var used for the puzzle accent.
 * @property {{solver: string|null, play: string|null}} routes
 * @property {{engine: string, solverPage: string|null, solverComponent: string|null}} files
 * @property {string|null} solver3dComponent  Component that renders 3D playback.
 * @property {Capability[]} contract         Capabilities this puzzle must meet.
 * @property {Partial<Record<Capability,string>>} waivers  Intentional skips → reason.
 * @property {PuzzleExperiment|null} experiment
 */

/** The capabilities that make up the puzzle cookie-cutter, in report order. */
export const CAPABILITIES = /** @type {Capability[]} */ ([
  "engine",
  "solver",
  "play",
  "saveFriendPlay",
  "solver3d",
  "learn",
]);

/** Human labels for the report. */
export const CAPABILITY_LABEL = {
  engine: "Engine (state + verified solver)",
  solver: "Solver route",
  play: "Playable experience",
  saveFriendPlay: "Save & Friend Play",
  solver3d: "3D solution playback",
  learn: "Learn presence",
};

/** The full contract every stable puzzle is expected to meet. */
const FULL_CONTRACT = /** @type {Capability[]} */ ([
  "engine",
  "solver",
  "play",
  "saveFriendPlay",
  "solver3d",
  "learn",
]);

/** @type {Puzzle[]} */
export const PUZZLES = [
  {
    id: "3x3",
    name: "3×3 Rubik's Cube",
    status: "stable",
    accentVar: "--green",
    routes: { solver: "/solver/3x3", play: "/play/3x3" },
    files: { engine: "lib/cube-engine.ts", solverPage: "app/solver/3x3/page.tsx", solverComponent: "components/ManualSolver.tsx" },
    solver3dComponent: "SolverCube3D",
    contract: FULL_CONTRACT,
    waivers: {},
    experiment: null,
  },
  {
    id: "2x2",
    name: "2×2 Pocket Cube",
    status: "stable",
    accentVar: "--purple",
    routes: { solver: "/solver/2x2", play: null },
    files: { engine: "lib/cube-engine.ts", solverPage: "app/solver/2x2/page.tsx", solverComponent: "components/PocketSolver.tsx" },
    solver3dComponent: "PocketCube3D",
    contract: FULL_CONTRACT,
    waivers: {
      play: "No standalone /play/2x2 yet; the solver carries the 3D playback.",
      learn: "No 2×2 Learn track yet (Learn covers 3×3/4×4/skewb/pyraminx/kilominx).",
    },
    experiment: null,
  },
  {
    id: "4x4",
    name: "4×4 Revenge Cube",
    status: "stable",
    accentVar: "--green",
    routes: { solver: "/solver/4x4", play: "/play/4x4" },
    files: { engine: "lib/nxn-cube.ts", solverPage: "app/solver/4x4/page.tsx", solverComponent: "components/FourSolver.tsx" },
    solver3dComponent: "NxNSolverCube3D",
    contract: FULL_CONTRACT,
    waivers: {},
    experiment: null,
  },
  {
    id: "5x5",
    name: "5×5 Professor Cube",
    status: "reduced",
    accentVar: "--green",
    routes: { solver: "/solver/5x5", play: null },
    files: { engine: "lib/nxn-cube.ts", solverPage: "app/solver/5x5/page.tsx", solverComponent: "components/FiveSolver.tsx" },
    solver3dComponent: "NxNSolverCube3D",
    contract: FULL_CONTRACT,
    waivers: {
      play: "No standalone /play/5x5 yet; the solver carries the 3D playback.",
      learn: "No 5×5 Learn track yet.",
    },
    experiment: null,
  },
  {
    id: "kilominx",
    name: "Kilominx",
    status: "beta",
    accentVar: "--purple",
    routes: { solver: "/solver/kilominx", play: "/play/kilominx" },
    files: { engine: "lib/kilominx-engine.ts", solverPage: "app/solver/kilominx/page.tsx", solverComponent: "components/KilominxSolver.tsx" },
    solver3dComponent: "KilominxSolverCube3D",
    contract: FULL_CONTRACT,
    waivers: {},
    experiment: null,
  },
  {
    id: "pyraminx",
    name: "Pyraminx",
    status: "beta",
    accentVar: "--gold",
    // The solver route IS the playable game; auto-solve animates on the live cube.
    routes: { solver: "/solver/pyraminx", play: "/solver/pyraminx" },
    files: { engine: "lib/pyraminx-engine.ts", solverPage: "app/solver/pyraminx/page.tsx", solverComponent: "app/PyraminxGame.tsx" },
    solver3dComponent: null,
    contract: FULL_CONTRACT,
    waivers: {
      solver3d: "Solver is the interactive game; auto-solve animates on the live cube, so there is no separate solution-playback panel (ADR 0006 follow-up if one is added).",
    },
    experiment: null,
  },
  {
    id: "skewb",
    name: "Skewb",
    status: "beta",
    accentVar: "--blue",
    routes: { solver: "/solver/skewb", play: "/solver/skewb" },
    files: { engine: "lib/skewb-engine.ts", solverPage: "app/solver/skewb/page.tsx", solverComponent: "app/SkewbGame.tsx" },
    solver3dComponent: null,
    contract: FULL_CONTRACT,
    waivers: {
      solver3d: "Solver is the interactive game; auto-solve animates on the live cube, so there is no separate solution-playback panel (ADR 0006 follow-up if one is added).",
    },
    experiment: null,
  },
];
