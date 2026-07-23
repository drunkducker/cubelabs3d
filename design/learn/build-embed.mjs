/* Assembles the standalone Learn prototype (index.html + styles.css + script.js)
   into a single self-contained public/learn.html that the Next app serves at
   /learn (via a rewrite in next.config.mjs). Run: node design/learn/build-embed.mjs */
import { readFileSync, writeFileSync } from "fs";
import { fileURLToPath } from "url";
import { dirname, join } from "path";

const here = dirname(fileURLToPath(import.meta.url));
const html = readFileSync(join(here, "index.html"), "utf8");
const css = readFileSync(join(here, "styles.css"), "utf8");
const js = readFileSync(join(here, "script.js"), "utf8");

const out = html
  .replace('<link rel="stylesheet" href="styles.css" />', `<style>\n${css}\n</style>`)
  .replace('<script src="script.js"></script>', `<script>\n${js}\n</script>`);

const dest = join(here, "..", "..", "public", "learn.html");
writeFileSync(dest, out);
console.log("Wrote", dest, `(${out.length} bytes)`);
