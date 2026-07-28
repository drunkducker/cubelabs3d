/**
 * Site module cookie-cutter conformance checker.
 *
 * Reads lib/modules.mjs and verifies each reusable site building block
 * (affiliate carousel, ad window, banner, YouTube carousel, footer, …) against
 * the repository, then prints ✅ present / ⚠️ waived (intentional) / ❌ missing.
 * Exit code is non-zero only on an unwaived ❌ — the same freedom hatch as the
 * puzzle checker: waive with a reason while you are still building or testing.
 */
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";

const root = process.cwd();
const exists = (rel) => existsSync(path.join(root, rel));
const grepFile = (rel, pattern) => {
  try { return new RegExp(pattern, "i").test(readFileSync(path.join(root, rel), "utf8")); }
  catch { return false; }
};

function present(module) {
  const filesOk = module.files.length > 0 && module.files.every(exists);
  const grepOk = module.grep ? grepFile(module.grep.file, module.grep.pattern) : true;
  return filesOk && grepOk;
}

const MARK = { present: "✅", waived: "⚠️ ", missing: "❌" };

async function main() {
  const { MODULES } = await import(pathToFileURL(path.join(root, "lib/modules.mjs")).href);

  const failures = [];
  const waived = [];
  console.log("\nSite module cookie-cutter conformance\n");
  const nameW = Math.max(20, ...MODULES.map((m) => m.name.length));
  for (const module of MODULES) {
    const isWaived = Boolean(module.waiver);
    const ok = present(module);
    let mark;
    if (ok) mark = MARK.present;
    else if (isWaived) { mark = MARK.waived; waived.push(module); }
    else { mark = MARK.missing; failures.push(module); }
    console.log(`  ${mark} ${module.name.padEnd(nameW)}  ${module.status}`);
  }

  if (waived.length) {
    console.log("\nIntentional deviations (⚠️ waived — the freedom hatch):");
    for (const m of waived) console.log(`  • ${m.name}: ${m.waiver}`);
  }

  console.log(`\nLegend: ${MARK.present} present   ${MARK.waived}waived (intentional)   ${MARK.missing} missing`);

  if (failures.length) {
    console.error("\nMissing site modules (add the component, or waive it in lib/modules.mjs with a reason):");
    for (const m of failures) console.error(`  ❌ ${m.name}`);
    process.exit(1);
  }
  console.log("\nAll site modules present or declared.\n");
}

main().catch((err) => { console.error(err); process.exit(1); });
