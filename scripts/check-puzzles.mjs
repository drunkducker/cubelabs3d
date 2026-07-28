/**
 * Puzzle cookie-cutter conformance checker.
 *
 * Reads lib/puzzles.mjs and, for every puzzle, verifies each contract capability
 * against the actual repository, then prints a matrix:
 *   ✅ met · ⚠️ waived (intentional deviation, with reason) · ❌ missing · — n/a
 *
 * Exit code is non-zero only when a REQUIRED, UNWAIVED capability is missing —
 * an accidental drift from the template. Waived and experimental gaps never fail
 * the build; they are the "still building / A/B testing" freedom hatch. This is
 * the automated version of reading the cookie-cutter and labeling what is not.
 */
import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";

const root = process.cwd();
const read = (rel) => {
  try { return readFileSync(path.join(root, rel), "utf8"); } catch { return ""; }
};
const routePage = (route) => {
  if (!route) return null;
  return `app${route}/page.tsx`; // "/solver/3x3" -> "app/solver/3x3/page.tsx"
};
// Trees scanned for a `puzzleType="<id>"` mount of the shared panel.
const APP_SOURCES = ["app", "components"];
function fileContains(relFile, needle) {
  return existsSync(path.join(root, relFile)) && read(relFile).includes(needle);
}
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

/** Per-capability detector: returns true when the repo actually provides it. */
function detect(puzzle, cap) {
  switch (cap) {
    case "engine":
      return existsSync(path.join(root, puzzle.files.engine));
    case "solver": {
      const page = routePage(puzzle.routes.solver);
      return Boolean(page && existsSync(path.join(root, page)));
    }
    case "play": {
      const page = routePage(puzzle.routes.play);
      return Boolean(page && existsSync(path.join(root, page)));
    }
    case "saveFriendPlay":
      // The shared panel mounted for this puzzle, anywhere in the app/components.
      return APP_SOURCES.some((d) => treeContains(d, `puzzleType="${puzzle.id}"`));
    case "solver3d": {
      if (!puzzle.solver3dComponent || !puzzle.files.solverComponent) return false;
      return fileContains(puzzle.files.solverComponent, puzzle.solver3dComponent);
    }
    case "learn":
      return read("lib/learn-model-engine.ts").includes(`"${puzzle.id}"`);
    default:
      return false;
  }
}

const MARK = { met: "✅", waived: "⚠️ ", missing: "❌", na: "— " };

async function main() {
  const { PUZZLES, CAPABILITIES, CAPABILITY_LABEL } = await import(
    pathToFileURL(path.join(root, "lib/puzzles.mjs")).href
  );

  const failures = [];
  const waived = [];
  const rows = [];

  for (const puzzle of PUZZLES) {
    const cells = {};
    for (const cap of CAPABILITIES) {
      const required = puzzle.contract.includes(cap);
      const isWaived = Object.prototype.hasOwnProperty.call(puzzle.waivers, cap);
      const present = detect(puzzle, cap);
      let state;
      if (isWaived) {
        state = "waived";
        waived.push({ id: puzzle.id, cap, reason: puzzle.waivers[cap], present });
      } else if (!required) {
        state = present ? "met" : "na";
      } else if (present) {
        state = "met";
      } else {
        state = "missing";
        failures.push({ id: puzzle.id, cap });
      }
      cells[cap] = state;
    }
    rows.push({ puzzle, cells });
  }

  // ---- Report ----
  const idW = Math.max(8, ...PUZZLES.map((p) => p.id.length));
  const header = ["puzzle".padEnd(idW), ...CAPABILITIES.map((c) => c.padEnd(15))].join(" ");
  console.log("\nPuzzle cookie-cutter conformance\n");
  console.log(header);
  console.log("-".repeat(header.length));
  for (const { puzzle, cells } of rows) {
    const line = [
      puzzle.id.padEnd(idW),
      ...CAPABILITIES.map((c) => (MARK[cells[c]] + "").padEnd(15)),
    ].join(" ");
    console.log(line);
  }

  console.log(`\nStatus: ${PUZZLES.map((p) => `${p.id}=${p.status}`).join("  ")}`);

  if (waived.length) {
    console.log("\nIntentional deviations (⚠️ waived — the freedom hatch):");
    for (const w of waived) {
      const stale = w.present ? "  [note: capability now PRESENT — consider removing the waiver]" : "";
      console.log(`  • ${w.id} / ${CAPABILITY_LABEL[w.cap]}: ${w.reason}${stale}`);
    }
  }

  console.log(`\nLegend: ${MARK.met} met   ${MARK.waived}waived (intentional)   ${MARK.missing} missing   ${MARK.na}n/a`);

  if (failures.length) {
    console.error(
      "\nMissing required capabilities (add the piece, or waive it in lib/puzzles.mjs with a reason):",
    );
    for (const f of failures) console.error(`  ❌ ${f.id} / ${CAPABILITY_LABEL[f.cap]}`);
    process.exit(1);
  }

  console.log("\nAll puzzles meet their contract (deviations are declared).\n");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
