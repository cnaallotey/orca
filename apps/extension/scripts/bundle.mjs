import fs from "node:fs";
import path from "node:path";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";
import * as esbuild from "esbuild";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const extensionRoot = path.resolve(__dirname, "..");
const repoRoot = path.resolve(extensionRoot, "../..");

async function bundle() {
  console.log("1. Bundling extension with esbuild...");
  await esbuild.build({
    entryPoints: [path.join(extensionRoot, "src/extension.ts")],
    bundle: true,
    platform: "node",
    target: "node18",
    format: "cjs",
    external: ["vscode"],
    outfile: path.join(extensionRoot, "dist/extension.cjs"),
    sourcemap: true,
    minify: false,
  });

  console.log("2. Copying tree-sitter wasm assets...");
  const analyzerReq = createRequire(path.join(repoRoot, "packages/analyzer/package.json"));
  const wtsPkg = analyzerReq.resolve("web-tree-sitter/package.json");
  const wasmsPkg = analyzerReq.resolve("tree-sitter-wasms/package.json");

  const wtsWasm = path.join(path.dirname(wtsPkg), "tree-sitter.wasm");
  const wasmsOutDir = path.join(path.dirname(wasmsPkg), "out");

  const targetWasmsDir = path.join(extensionRoot, "dist/wasms");
  fs.mkdirSync(targetWasmsDir, { recursive: true });

  fs.copyFileSync(wtsWasm, path.join(targetWasmsDir, "tree-sitter.wasm"));

  const neededGrammars = [
    "tree-sitter-typescript.wasm",
    "tree-sitter-javascript.wasm",
    "tree-sitter-vue.wasm",
  ];

  for (const grammar of neededGrammars) {
    const src = path.join(wasmsOutDir, grammar);
    const dest = path.join(targetWasmsDir, grammar);
    fs.copyFileSync(src, dest);
  }

  console.log("3. Verifying media assets...");
  const cytoscapeSrc = path.join(extensionRoot, "media/cytoscape.min.js");
  if (!fs.existsSync(cytoscapeSrc)) {
    throw new Error(`Missing required asset: ${cytoscapeSrc}`);
  }

  console.log("Extension bundled successfully into dist/extension.cjs and dist/wasms!");
}

bundle().catch((err) => {
  console.error("Bundle failed:", err);
  process.exit(1);
});
