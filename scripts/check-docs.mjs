#!/usr/bin/env node
/*
 * check-docs.mjs — documentation link and presence checker for Cube Labs 3D.
 *
 * Purpose: keep the documentation an accurate source of truth by failing when a
 * relative Markdown link points at a file that does not exist, or when a
 * required living document is missing. This guards against the exact drift that
 * accumulates during fast reorganizations (moved/renamed files leaving dead
 * links behind).
 *
 * Scope on purpose:
 *   - Validates relative links only ("./x", "../x", "x/y.md"). External links
 *     (http/https/mailto/tel), pure anchors ("#section"), and app-route style
 *     absolute paths ("/solver/5x5") are intentionally not fetched or resolved.
 *   - Strips fenced and inline code before scanning so notation like `[wide]`
 *     inside code is not mistaken for a link.
 *
 * This is a link/reference gate, not a structural-count enforcer, so it stays
 * compatible with either the current documentation layout or a future
 * consolidation.
 *
 * Usage: `npm run docs:check` (exit 0 = clean, exit 1 = problems found).
 */
import { readFileSync, existsSync, statSync } from "node:fs";
import { readdirSync } from "node:fs";
import { join, dirname, resolve, relative } from "node:path";
import { fileURLToPath } from "node:url";

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");

const IGNORED_DIRS = new Set([".git", "node_modules", ".next", "out", "dist"]);

/** Living documents that must exist for the docs to function as a source of truth. */
const REQUIRED_DOCS = [
  "docs/README.md",
  "docs/CONSTITUTION.md",
  "docs/ARCHITECTURE.md",
  "docs/DEPENDENCY-GRAPHS.md",
  "docs/AI-INSTRUCTIONS.md",
  "docs/CURRENT_STATUS.md",
  "docs/PROJECT-HEALTH.md",
  "docs/ROADMAP.md",
  "docs/MASTER-CHECKLIST.md",
  "docs/DAILY-LOG.md",
  "docs/CHANGELOG.md",
  "docs/checkpoints/README.md",
];

/** Recursively collect Markdown files. */
function collectMarkdown(dir, acc = []) {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    if (entry.name.startsWith(".") && entry.name !== ".") {
      if (IGNORED_DIRS.has(entry.name)) continue;
    }
    if (IGNORED_DIRS.has(entry.name)) continue;
    const full = join(dir, entry.name);
    if (entry.isDirectory()) {
      collectMarkdown(full, acc);
    } else if (entry.isFile() && entry.name.toLowerCase().endsWith(".md")) {
      acc.push(full);
    }
  }
  return acc;
}

/** Remove fenced code blocks and inline code so their contents are not scanned. */
function stripCode(text) {
  return text
    .replace(/```[\s\S]*?```/g, "")
    .replace(/~~~[\s\S]*?~~~/g, "")
    .replace(/`[^`\n]*`/g, "");
}

const LINK_RE = /\[[^\]]*\]\(([^)]+)\)/g;

function isExternalOrAnchor(target) {
  return (
    /^(https?:|mailto:|tel:|#)/i.test(target) ||
    target.startsWith("/") // app-route absolute path, not a file reference
  );
}

const problems = [];

for (const doc of REQUIRED_DOCS) {
  if (!existsSync(join(repoRoot, doc))) {
    problems.push(`MISSING REQUIRED DOC: ${doc}`);
  }
}

const files = collectMarkdown(repoRoot);
let linkCount = 0;

for (const file of files) {
  const raw = readFileSync(file, "utf8");
  const scannable = stripCode(raw);
  let match;
  while ((match = LINK_RE.exec(scannable)) !== null) {
    let target = match[1].trim();
    // Drop optional "title": [x](path "title")
    target = target.split(/\s+/)[0];
    if (!target || isExternalOrAnchor(target)) continue;
    linkCount++;
    // Strip anchor / query.
    const clean = target.replace(/[?#].*$/, "");
    if (!clean) continue;
    const resolved = resolve(dirname(file), clean);
    if (!existsSync(resolved)) {
      problems.push(
        `BROKEN LINK: ${relative(repoRoot, file)} -> ${target}`
      );
      continue;
    }
    // If the link omits a trailing slash but points at a directory, that's fine.
    try {
      statSync(resolved);
    } catch {
      problems.push(`UNRESOLVABLE: ${relative(repoRoot, file)} -> ${target}`);
    }
  }
}

if (problems.length > 0) {
  console.error(`docs:check found ${problems.length} problem(s):\n`);
  for (const p of problems) console.error(`  - ${p}`);
  console.error(
    `\nScanned ${files.length} Markdown file(s), ${linkCount} local link(s).`
  );
  process.exit(1);
}

console.log(
  `docs:check OK — ${files.length} Markdown file(s), ${linkCount} local link(s) valid, ${REQUIRED_DOCS.length} required docs present.`
);
