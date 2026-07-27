import { spawn } from "node:child_process";
import { fileURLToPath } from "node:url";

const nextBin = fileURLToPath(new URL("../node_modules/next/dist/bin/next", import.meta.url));
const args = process.argv.slice(2).flatMap((arg) => {
  if (arg === "--host") return ["--hostname"];
  if (arg === "--strictPort") return [];
  return [arg];
});

const child = spawn(process.execPath, [nextBin, "dev", ...args], {
  env: process.env,
  stdio: "inherit",
});

child.on("exit", (code) => process.exit(code ?? 1));
