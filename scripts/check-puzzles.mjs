/**
 * Puzzle cookie-cutter conformance checker (engines: solve / play / learn).
 *
 * Reads lib/puzzles.mjs and, for every puzzle, verifies each contract feature
 * against the actual repository, grouped by engine, then prints a matrix:
 *   ✅ met · ⚠️ waived (intentional deviation, with reason) · ❌ missing · — n/a
 *
 * Exit code is non-zero only when a REQUIRED, UNWAIVED feature is missing — an
 * accidental drift from the template. Waived and experimental gaps never fail;
 * they are the "still building / A/B testing" freedom hatch. This is the
 * automated form of reading the cookie-cutter and labeling what is not.
 */
import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";

const root = process.cwd();
const read = (rel) => {
  try { return readFileSync(path.join(root, rel), "utf8"); } catch { return ""; }
};
const exists = (rel) => rel != null && existsSync(path.join(root, rel));
const routePage = (route) => (route ? `app${route}/page.tsx` : null); // "/solver/3x3" -> file
const grep = (rel, re) => re.test(read(rel));

/** Does any source file under a tree contain `needle`? */
function treeContains(relDir, needle) {
  const abs = path.join(root, relDir);
  if (!existsSync(abs)) return false;
  const stack = [abs];
  while (stack.length) {
    const dir = stack.pop();
    for (const name of readdirSync(dir)) {
      if (name === "node_modules" || name === ".next" || name === ".git") continue;
      const p = path.join(dir, name);
      const s = statSync(p);
      if (s.isDirectory()) stack.push(p);
      else if (/\.(tsx?|mjs|js)$/.test(name) && readFileSync(p, "utf8").includes(needle)) return true;
    }
  }
  return false;
}
const mountsPanel = (id) => ["app", "components"].some((d) => treeContains(d, `puzzleType="${id}"`));
const inLearn = (id) => read("lib/learn-model-engine.ts").includes(`"${id}"`);
const inLeaderboard = (id) =>
  grep("lib/leaderboard-preview.ts", new RegExp(`"${id}"`)) ||
  grep("app/admin/leaderboards/page.tsx", new RegExp(`"${id}"`));

/** feature id -> detector(puzzle) => boolean (is the feature actually present?). */
const DETECTORS = {
  solver: (p) => exists(routePage(p.routes.solver)),
  scramble: (p) => grep(p.files.solverComponent, /scramble/i),
  manualInput: (p) => grep(p.files.solverComponent, /Enter My Cube|manual entry|manualFacelets|paintCell|initManualFacelets/i),
  solutionPlayback: (p) => Boolean(p.solver3dComponent) && grep(p.files.solverComponent, new RegExp(p.solver3dComponent)),
  saveShare: (p) => mountsPanel(p.id),
  playable: (p) => exists(routePage(p.routes.play)),
  saveResult: (p) => mountsPanel(p.id),
  leaderboard: (p) => inLeaderboard(p.id),
  achievements: (p) => treeContains("app/profile/achievements", `"${p.id}"`),
  interactiveDemo: (p) => inLearn(p.id),
  algorithms: (p) => inLearn(p.id),
};

const MARK = { met: "✅", waived: "⚠️ ", missing: "❌", na: "— " };

async function main() {
  const { PUZZLES, ENGINES, FEATURES, FEATURE_LABEL } = await import(
    pathToFileURL(path.join(root, "lib/puzzles.mjs")).href
  );

  const failures = [];
  const waived = [];
  const rows = [];

  for (const puzzle of PUZZLES) {
    const cells = {};
    for (const feature of FEATURES) {
      const required = puzzle.contract.includes(feature);
      const isWaived = Object.prototype.hasOwnProperty.call(puzzle.waivers, feature);
      const present = DETECTORS[feature](puzzle);
      let state;
      if (isWaived) {
        state = "waived";
        waived.push({ id: puzzle.id, feature, reason: puzzle.waivers[feature], present });
      } else if (!required) {
        state = present ? "met" : "na";
      } else if (present) {
        state = "met";
      } else {
        state = "missing";
        failures.push({ id: puzzle.id, feature });
      }
      cells[feature] = state;
    }
    rows.push({ puzzle, cells });
  }

  // ---- Report, grouped by engine ----
  console.log("\nPuzzle cookie-cutter conformance — solve / play / learn engines\n");
  const idW = Math.max(8, ...PUZZLES.map((p) => p.id.length));
  const cell = (s) => (MARK[s] + "").padEnd(3);

  for (const [engine, feats] of Object.entries(ENGINES)) {
    console.log(`${engine.toUpperCase()} ENGINE`);
    console.log("  " + "puzzle".padEnd(idW) + "  " + feats.map((f) => f.padEnd(17)).join(""));
    for (const { puzzle, cells } of rows) {
      console.log("  " + puzzle.id.padEnd(idW) + "  " + feats.map((f) => cell(cells[f]).padEnd(17)).join(""));
    }
    console.log("");
  }

  console.log(`Status: ${PUZZLES.map((p) => `${p.id}=${p.status}`).join("  ")}`);

  if (waived.length) {
    console.log("\nIntentional deviations (⚠️ waived — the freedom hatch):");
    for (const w of waived) {
      const stale = w.present ? "  [note: now PRESENT — consider removing the waiver]" : "";
      console.log(`  • ${w.id} / ${FEATURE_LABEL[w.feature]}: ${w.reason}${stale}`);
    }
  }

  console.log(`\nLegend: ${MARK.met} met   ${MARK.waived}waived (intentional)   ${MARK.missing} missing   ${MARK.na}n/a`);

  if (failures.length) {
    console.error("\nMissing required features (add the piece, or waive it in lib/puzzles.mjs with a reason):");
    for (const f of failures) console.error(`  ❌ ${f.id} / ${FEATURE_LABEL[f.feature]}`);
    process.exit(1);
  }
  console.log("\nAll puzzles meet their engine contracts (deviations are declared).\n");
}

main().catch((err) => { console.error(err); process.exit(1); });
