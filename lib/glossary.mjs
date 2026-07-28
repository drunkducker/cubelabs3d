/**
 * Cube Labs site dictionary.
 *
 * Plain-English definitions of the words we actually use to talk about this
 * project, plus the real functions/variables/files they point at — written the
 * way the project owner explains things, so a new person (or a new session)
 * picks up the vocabulary instead of re-deriving it.
 *
 * Two lists:
 *   • TERMS — the ideas/vocabulary (engine, module, cookie-cutter, waiver…).
 *   • CODE  — the real symbols in the repo, each with a one-line English gloss.
 *
 * Print it with `npm run glossary`. Look things up with the helpers at the
 * bottom. Keep this current: when we coin a word or add a load-bearing
 * function/variable, add a line here.
 *
 * @typedef {Object} Term
 * @property {string} term        The word or phrase.
 * @property {string[]} aka       Other ways we say it.
 * @property {string} means       Plain-English definition, in our voice.
 * @typedef {Object} CodeTerm
 * @property {string} symbol      Function / variable / component / file name.
 * @property {"function"|"variable"|"component"|"registry"|"script"|"file"} kind
 * @property {string} where       Where it lives in the repo.
 * @property {string} means       What it does, in one plain-English line.
 */

/** The vocabulary — the ideas behind the words we throw around. @type {Term[]} */
export const TERMS = [
  {
    term: "engine",
    aka: ["puzzle engine"],
    means:
      "One of the three big jobs a puzzle does. We started calling them engines, so every puzzle has a solve engine, a play engine, and a learn engine.",
  },
  {
    term: "solve engine",
    aka: ["solver side"],
    means:
      "The part that actually cracks the cube. What it has: a solver, scramble, save, manual input solve, and share.",
  },
  {
    term: "play engine",
    aka: ["play side"],
    means:
      "The part you play with. What it has: leaderboard, share, save, and achievements.",
  },
  {
    term: "learn engine",
    aka: ["learn side"],
    means:
      "The teaching part. What it has: the interactive demo, algorithms, and the explanations.",
  },
  {
    term: "module",
    aka: ["site module", "block"],
    means:
      "A reusable site block that isn't tied to one puzzle — the carousel with Amazon affiliate, the windows with ads, banners, the YouTube carousel, footers, and so on.",
  },
  {
    term: "cookie-cutter",
    aka: ["cookie cutter", "full-on cookie cutter"],
    means:
      "When a puzzle (or module) has all its expected parts, built the same way as the others, so we're not reinventing the wheel every time we add one.",
  },
  {
    term: "waiver",
    aka: ["waived", "on-purpose skip"],
    means:
      "An intentional skip. When a part isn't there yet because we're still building or testing, we leave a note with the reason instead of getting nagged about it.",
  },
  {
    term: "freedom hatch",
    aka: ["freedom", "give freedom"],
    means:
      "The waivers plus the experimental flag — the room to test stuff and do our own thing without the checker failing the build.",
  },
  {
    term: "experiment",
    aka: ["A/B", "AB test", "trying it out"],
    means:
      "A puzzle or module we're trying out. Mark it experimental (or waive the parts it doesn't have yet) so it's clearly not-final and never blocks anything.",
  },
  {
    term: "conformance check",
    aka: ["cc:check", "puzzles:check", "modules:check"],
    means:
      "The command that reads the registries and prints who's cookie-cutter and who isn't, then fails the build only on an accidental gap (never on a declared waiver).",
  },
  {
    term: "registry",
    aka: ["the master list", "source of truth"],
    means:
      "The one place the list lives so it isn't copy-pasted everywhere: lib/puzzles.mjs for puzzles, lib/modules.mjs for site blocks.",
  },
  {
    term: "solver",
    aka: [],
    means: "The thing that takes any scramble and hands back verified moves that solve it.",
  },
  {
    term: "scramble",
    aka: [],
    means: "A random mix-up of the puzzle for the solver (or you) to solve.",
  },
  {
    term: "manual input",
    aka: ["enter my cube", "manual entry"],
    means:
      "Typing in your real cube's colors so the solver solves YOUR cube, not a random one.",
  },
  {
    term: "solution playback",
    aka: ["3D playback", "playback"],
    means: "Watching the solution play back move-by-move on the 3D cube.",
  },
  {
    term: "Save & Friend Play",
    aka: ["save & share", "save/share"],
    means:
      "The shared panel every puzzle drops in to save your solve or state and send it to a friend.",
  },
  {
    term: "verified",
    aka: ["verify"],
    means:
      "We don't trust a solution until we replay it on the real cube and it actually ends solved. If it doesn't verify, we don't show it.",
  },
  {
    term: "facelet",
    aka: ["sticker map", "flat net"],
    means: "The flat sticker map of the cube — every little colored tile laid out.",
  },
  {
    term: "notation",
    aka: ["labels", "move language"],
    means: "The move language (like R, U, 3') that names each turn.",
  },
  {
    term: "lock rotation",
    aka: ["rotation lock"],
    means:
      "On the 3D cube: freeze the camera so it holds a fixed angle. Swiping to turn faces still works — only the camera is locked.",
  },
];

/** The real code, each with a one-line English gloss. @type {CodeTerm[]} */
export const CODE = [
  { symbol: "PUZZLES", kind: "registry", where: "lib/puzzles.mjs", means: "The master list of every puzzle and what each one's got, grouped by engine." },
  { symbol: "MODULES", kind: "registry", where: "lib/modules.mjs", means: "The master list of the site's reusable blocks (ads, affiliate, banner, footer, YouTube)." },
  { symbol: "ENGINES", kind: "variable", where: "lib/puzzles.mjs", means: "Which features live in each engine — solve / play / learn." },
  { symbol: "contract", kind: "variable", where: "lib/puzzles.mjs", means: "The full checklist a puzzle is supposed to meet." },
  { symbol: "waivers", kind: "variable", where: "lib/puzzles.mjs", means: "The on-purpose skips for a puzzle, each with a reason (the freedom hatch)." },
  { symbol: "check-puzzles.mjs", kind: "script", where: "scripts/check-puzzles.mjs", means: "Prints the per-engine ✅/⚠️/❌ matrix for puzzles; fails only on an undeclared gap." },
  { symbol: "check-modules.mjs", kind: "script", where: "scripts/check-modules.mjs", means: "Same idea for the site modules." },
  { symbol: "solve()", kind: "function", where: "lib/kilominx-engine-public.ts → optimized planner", means: "The brain: takes a scrambled cube, returns verified moves. The app gets the optimized (~19% shorter) one." },
  { symbol: "solveOptimized()", kind: "function", where: "lib/kilominx-solver-optimized-impl.js", means: "The smarter solve that picks better moves so solutions are shorter." },
  { symbol: "randomScramble()", kind: "function", where: "lib/kilominx-engine.ts", means: "Makes a fresh random scramble." },
  { symbol: "applyMoves()", kind: "function", where: "lib/kilominx-engine.ts", means: "Runs a list of moves on the cube and returns the new state." },
  { symbol: "stateToFacelets()", kind: "function", where: "lib/kilominx-engine.ts", means: "Turns the cube's inner state into the flat sticker map you see." },
  { symbol: "faceletsToState()", kind: "function", where: "lib/kilominx-engine.ts", means: "Reads the sticker map back into cube state, and rejects impossible cubes." },
  { symbol: "isSolved()", kind: "function", where: "lib/kilominx-engine.ts", means: "Checks whether the cube is solved." },
  { symbol: "UniversalPuzzleActions", kind: "component", where: "components/UniversalPuzzleActions.tsx", means: "The shared Save & Friend Play panel, keyed by puzzle." },
  { symbol: "KilominxSolver", kind: "component", where: "components/KilominxSolver.tsx", means: "The Kilominx solver page UI: net, buttons, stepper, and 3D playback." },
  { symbol: "KilominxSolverCube3D", kind: "component", where: "components/KilominxSolverCube3D.tsx", means: "The 3D corners-only cube that plays the solution back; swipeable, with a camera lock." },
  { symbol: "learnPuzzleOrder", kind: "variable", where: "lib/learn-model-engine.ts", means: "The order puzzles appear in the Learn engine." },
  { symbol: "ManagedCarousel", kind: "component", where: "components/ads/ManagedCarousel.tsx", means: "The affiliate/managed carousel module." },
  { symbol: "AdSlot", kind: "component", where: "components/ads/AdSlot.tsx", means: "An ad window/slot module." },
  { symbol: "PuzzleSolvePayload", kind: "variable", where: "lib/puzzle-attempt.ts", means: "The shared shape of a saved solve result (time, moves, scramble, verified)." },
];

// --- Helpers (plain English) ---

/** Look up what a word means in our dictionary. Matches the term or any aka,
 * case-insensitively. Returns the Term or null. */
export function define(word) {
  const q = String(word).toLowerCase();
  return (
    TERMS.find((t) => t.term.toLowerCase() === q || t.aka.some((a) => a.toLowerCase() === q)) || null
  );
}

/** Find the real code a word points at (best-effort keyword match). Returns the
 * matching CodeTerm entries. */
export function codeFor(word) {
  const q = String(word).toLowerCase();
  return CODE.filter((c) => c.symbol.toLowerCase().includes(q) || c.means.toLowerCase().includes(q));
}

/** Every term we've defined, alphabetically — handy for a quick scan. */
export function allTerms() {
  return TERMS.map((t) => t.term).sort((a, b) => a.localeCompare(b));
}
