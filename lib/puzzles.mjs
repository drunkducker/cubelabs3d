/**
 * Puzzle registry — the single source of truth for which puzzles exist and how
 * "cookie-cutter" each one is, organized the way we talk about them: three
 * ENGINES per puzzle, each a group of features.
 *
 *   • solve engine  — solver, scramble, manual input, 3D solution playback, save/share
 *   • play engine   — playable game, save result, leaderboard, achievements
 *   • learn engine  — interactive demo, algorithm explanations
 *
 * Historically the puzzle set was copy-pasted across ~15 files, so puzzles
 * drifted apart silently. This registry names the features each puzzle is
 * expected to have and, where a puzzle intentionally skips one while it is still
 * being built or A/B-tested, records a WAIVER with a reason. `waivers` and
 * `status: "experimental"` are the freedom hatch: waive with a note instead of
 * being nagged. `scripts/check-puzzles.mjs` reads this file and prints, per
 * puzzle and grouped by engine, ✅ met / ⚠️ waived (intentional) / ❌ missing (an
 * accidental gap, which fails CI). Site-wide building blocks (affiliate carousel,
 * ad windows, banners, YouTube carousel, footer) live in `lib/modules.mjs`.
 *
 * @typedef {"solver"|"scramble"|"manualInput"|"solutionPlayback"|"saveShare"|"playable"|"saveResult"|"leaderboard"|"achievements"|"interactiveDemo"|"algorithms"} Feature
 * @typedef {Object} PuzzleFiles
 * @property {string} engine           Engine module (state + verified solver).
 * @property {string|null} solverPage  Solver route page.
 * @property {string|null} solverComponent  Component that renders the solver UI.
 * @typedef {Object} Puzzle
 * @property {string} id
 * @property {string} name
 * @property {"stable"|"beta"|"reduced"|"experimental"|"coming-soon"} status
 * @property {string} accentVar
 * @property {{solver: string|null, play: string|null}} routes
 * @property {PuzzleFiles} files
 * @property {string|null} solver3dComponent  Component that renders 3D playback.
 * @property {Feature[]} contract              Features this puzzle must have.
 * @property {Partial<Record<Feature,string>>} waivers  Intentional skips → reason.
 * @property {{flag: string, note: string}|null} experiment
 */

/** The three engines and the features that make up each, in report order. */
export const ENGINES = {
  solve: ["solver", "scramble", "manualInput", "solutionPlayback", "saveShare"],
  play: ["playable", "saveResult", "leaderboard", "achievements"],
  learn: ["interactiveDemo", "algorithms"],
};

/** Every feature, flattened in engine order. */
export const FEATURES = Object.values(ENGINES).flat();

/** Human labels for the report. */
export const FEATURE_LABEL = {
  solver: "Verified solver",
  scramble: "Scramble generator",
  manualInput: "Manual cube input",
  solutionPlayback: "3D solution playback",
  saveShare: "Save & share (solve)",
  playable: "Playable game",
  saveResult: "Save result & friend play",
  leaderboard: "Leaderboard entry",
  achievements: "Achievements",
  interactiveDemo: "Interactive learn demo",
  algorithms: "Algorithm explanations",
};

/** The full contract every puzzle is measured against. */
const FULL = /** @type {Feature[]} */ (FEATURES);

// Reasons reused across puzzles.
const GAME_IS_SOLVER = "Solver route is the interactive game; auto-solve animates on the live cube, so there is no separate manual entry or solution-playback panel.";
const CROSS_CUTTING_ACH = "Achievements are a cross-cutting system, not yet wired per puzzle.";
const NO_LEADERBOARD = "Not in the leaderboard config yet.";
const NO_LEARN = "No Learn track yet (Learn covers 3×3/4×4/skewb/pyraminx/kilominx).";

/** @type {Puzzle[]} */
export const PUZZLES = [
  {
    id: "3x3", name: "3×3 Rubik's Cube", status: "stable", accentVar: "--green",
    routes: { solver: "/solver/3x3", play: "/play/3x3" },
    files: { engine: "lib/cube-engine.ts", solverPage: "app/solver/3x3/page.tsx", solverComponent: "components/ManualSolver.tsx" },
    solver3dComponent: "SolverCube3D",
    contract: FULL,
    waivers: { achievements: CROSS_CUTTING_ACH },
    experiment: null,
  },
  {
    id: "2x2", name: "2×2 Pocket Cube", status: "stable", accentVar: "--purple",
    routes: { solver: "/solver/2x2", play: null },
    files: { engine: "lib/cube-engine.ts", solverPage: "app/solver/2x2/page.tsx", solverComponent: "components/PocketSolver.tsx" },
    solver3dComponent: "PocketCube3D",
    contract: FULL,
    waivers: {
      manualInput: "2×2 solver is scramble-only; no manual sticker entry yet.",
      playable: "No standalone /play/2x2 yet; the solver carries the 3D playback.",
      achievements: CROSS_CUTTING_ACH,
      interactiveDemo: NO_LEARN, algorithms: NO_LEARN,
    },
    experiment: null,
  },
  {
    id: "4x4", name: "4×4 Revenge Cube", status: "stable", accentVar: "--green",
    routes: { solver: "/solver/4x4", play: "/play/4x4" },
    files: { engine: "lib/nxn-cube.ts", solverPage: "app/solver/4x4/page.tsx", solverComponent: "components/FourSolver.tsx" },
    solver3dComponent: "NxNSolverCube3D",
    contract: FULL,
    waivers: { achievements: CROSS_CUTTING_ACH },
    experiment: null,
  },
  {
    id: "5x5", name: "5×5 Professor Cube", status: "reduced", accentVar: "--green",
    routes: { solver: "/solver/5x5", play: null },
    files: { engine: "lib/nxn-cube.ts", solverPage: "app/solver/5x5/page.tsx", solverComponent: "components/FiveSolver.tsx" },
    solver3dComponent: "NxNSolverCube3D",
    contract: FULL,
    waivers: {
      playable: "No standalone /play/5x5 yet; the solver carries the 3D playback.",
      achievements: CROSS_CUTTING_ACH,
      interactiveDemo: NO_LEARN, algorithms: NO_LEARN,
    },
    experiment: null,
  },
  {
    id: "kilominx", name: "Kilominx", status: "beta", accentVar: "--purple",
    routes: { solver: "/solver/kilominx", play: "/play/kilominx" },
    files: { engine: "lib/kilominx-engine.ts", solverPage: "app/solver/kilominx/page.tsx", solverComponent: "components/KilominxSolver.tsx" },
    solver3dComponent: "KilominxSolverCube3D",
    contract: FULL,
    waivers: { leaderboard: NO_LEADERBOARD, achievements: CROSS_CUTTING_ACH },
    experiment: null,
  },
  {
    id: "pyraminx", name: "Pyraminx", status: "beta", accentVar: "--gold",
    routes: { solver: "/solver/pyraminx", play: "/solver/pyraminx" },
    files: { engine: "lib/pyraminx-engine.ts", solverPage: "app/solver/pyraminx/page.tsx", solverComponent: "app/PyraminxGame.tsx" },
    solver3dComponent: null,
    contract: FULL,
    waivers: {
      manualInput: GAME_IS_SOLVER, solutionPlayback: GAME_IS_SOLVER,
      achievements: CROSS_CUTTING_ACH,
    },
    experiment: null,
  },
  {
    id: "skewb", name: "Skewb", status: "beta", accentVar: "--blue",
    routes: { solver: "/solver/skewb", play: "/solver/skewb" },
    files: { engine: "lib/skewb-engine.ts", solverPage: "app/solver/skewb/page.tsx", solverComponent: "app/SkewbGame.tsx" },
    solver3dComponent: null,
    contract: FULL,
    waivers: {
      manualInput: GAME_IS_SOLVER, solutionPlayback: GAME_IS_SOLVER,
      leaderboard: NO_LEADERBOARD, achievements: CROSS_CUTTING_ACH,
    },
    experiment: null,
  },
];
