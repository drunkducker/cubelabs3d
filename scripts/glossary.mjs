/**
 * Print the Cube Labs site dictionary (lib/glossary.mjs).
 *
 * Usage:
 *   npm run glossary              # print the whole dictionary
 *   npm run glossary -- <word>    # define one word and show the code it maps to
 */
import path from "node:path";
import { pathToFileURL } from "node:url";

const root = process.cwd();
const { TERMS, CODE, define, codeFor } = await import(
  pathToFileURL(path.join(root, "lib/glossary.mjs")).href
);

const wrap = (text, indent) => {
  const width = 88 - indent;
  const words = text.split(" ");
  const lines = [];
  let line = "";
  for (const w of words) {
    if ((line + " " + w).trim().length > width) { lines.push(line.trim()); line = w; }
    else line += " " + w;
  }
  if (line.trim()) lines.push(line.trim());
  return lines.join("\n" + " ".repeat(indent));
};

const query = process.argv.slice(2).join(" ").trim();

if (query) {
  const term = define(query);
  if (term) {
    console.log(`\n${term.term}${term.aka.length ? `  (aka ${term.aka.join(", ")})` : ""}`);
    console.log("  " + wrap(term.means, 2));
  } else {
    console.log(`\nNo dictionary entry for "${query}".`);
  }
  const code = codeFor(query);
  if (code.length) {
    console.log("\nIn the code:");
    for (const c of code) console.log(`  • ${c.symbol} (${c.kind}, ${c.where})\n    ${wrap(c.means, 4)}`);
  }
  console.log("");
} else {
  console.log("\nCube Labs site dictionary\n=========================\n");
  console.log("TERMS — the vocabulary\n");
  for (const t of TERMS) {
    console.log(`• ${t.term}${t.aka.length ? `  (aka ${t.aka.join(", ")})` : ""}`);
    console.log("    " + wrap(t.means, 4) + "\n");
  }
  console.log("\nCODE — the real functions/variables and what they do\n");
  for (const c of CODE) {
    console.log(`• ${c.symbol}  [${c.kind}]  ${c.where}`);
    console.log("    " + wrap(c.means, 4) + "\n");
  }
  console.log(`Tip: define one word with  npm run glossary -- "cookie cutter"\n`);
}
