import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import path from "node:path";

const root = process.cwd();
const expectedMarkdown = [
  "ASSET-CREDITS-AND-LICENSES.md",
  "README.md",
  "design/learn/README.md",
  "docs/ADMIN-PORTAL.md",
  "docs/ARCHITECTURE.md",
  "docs/CUBE-ENGINE.md",
  "docs/CURRENT_STATUS.md",
  "docs/DECISIONS.md",
  "docs/GOVERNANCE.md",
  "docs/HISTORY.md",
  "docs/PRIVACY-ACCOUNT-LIFECYCLE-2026-07-30.md",
  "docs/README.md",
  "docs/ROADMAP.md",
  "docs/SKEWB-REV2-2026-07-29.md",
  "docs/SOCIAL-AND-MULTIPLAYER.md",
];
const ignoredDirectories = new Set([".git", ".next", "node_modules"]);

function listMarkdown(directory, relative = "") {
  return readdirSync(directory)
    .sort()
    .flatMap((name) => {
      const absolute = path.join(directory, name);
      const nextRelative = path.join(relative, name);

      if (statSync(absolute).isDirectory()) {
        return ignoredDirectories.has(name)
          ? []
          : listMarkdown(absolute, nextRelative);
      }

      return name.endsWith(".md") ? [nextRelative.replaceAll("\\", "/")] : [];
    });
}

const errors = [];
const actualMarkdown = listMarkdown(root);

for (const expected of expectedMarkdown) {
  if (!actualMarkdown.includes(expected)) errors.push(`Missing ${expected}`);
}

for (const actual of actualMarkdown) {
  if (!expectedMarkdown.includes(actual)) {
    errors.push(
      `Unrouted Markdown file ${actual}; consolidate it or add a durable ownership boundary to docs/README.md and DECISIONS.md`,
    );
  }
}

const consolidatedBegins = new Map();
const consolidatedEnds = new Map();

for (const markdownPath of actualMarkdown) {
  const absolute = path.join(root, markdownPath);
  const content = readFileSync(absolute, "utf8");
  const linkPattern = /\[[^\]]*]\(([^)]+)\)/g;
  const beginPattern = /<!-- BEGIN CONSOLIDATED SOURCE: (.+?) -->/g;
  const endPattern = /<!-- END CONSOLIDATED SOURCE: (.+?) -->/g;

  for (const match of content.matchAll(linkPattern)) {
    const destination = match[1].trim().replace(/^<|>$/g, "");
    if (
      destination.startsWith("#") ||
      /^[a-z][a-z\d+.-]*:/i.test(destination)
    ) {
      continue;
    }

    const filePart = destination.split("#", 1)[0];
    if (!filePart) continue;

    const resolved = path.resolve(path.dirname(absolute), filePart);
    if (!existsSync(resolved)) {
      errors.push(`${markdownPath}: broken local link ${destination}`);
    }
  }

  for (const match of content.matchAll(beginPattern)) {
    const source = match[1];
    consolidatedBegins.set(source, (consolidatedBegins.get(source) ?? 0) + 1);
  }

  for (const match of content.matchAll(endPattern)) {
    const source = match[1];
    consolidatedEnds.set(source, (consolidatedEnds.get(source) ?? 0) + 1);
  }
}

for (const [source, count] of consolidatedBegins) {
  if (count !== 1) errors.push(`${source}: ${count} BEGIN markers`);
  if (consolidatedEnds.get(source) !== 1) {
    errors.push(`${source}: missing or duplicate END marker`);
  }
}

for (const source of consolidatedEnds.keys()) {
  if (!consolidatedBegins.has(source)) {
    errors.push(`${source}: END marker without BEGIN marker`);
  }
}

if (consolidatedBegins.size !== 37) {
  errors.push(
    `Expected 37 retired source sections, found ${consolidatedBegins.size}`,
  );
}

if (errors.length > 0) {
  console.error(errors.join("\n"));
  process.exit(1);
}

console.log(
  `Documentation verified: ${actualMarkdown.length} routed Markdown files, ${consolidatedBegins.size} retired source sections, and no broken local links.`,
);
