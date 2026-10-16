import fsSync from "node:fs";
import { createRequire } from "node:module";
import path from "node:path";
import Parser from "web-tree-sitter";
import type { ParsedAst } from "./types.js";

function getResolver(): ((id: string) => string) | null {
  try {
    if (typeof require !== "undefined" && typeof require.resolve === "function") {
      return require.resolve;
    }
  } catch {
    // ignore
  }
  try {
    if (typeof import.meta !== "undefined" && import.meta.url) {
      return createRequire(import.meta.url).resolve;
    }
  } catch {
    // ignore
  }
  return null;
}

let initialized = false;
let tsLanguage: Parser.Language | null = null;
let jsLanguage: Parser.Language | null = null;
let vueLanguage: Parser.Language | null = null;

export async function initParser(customWasmsDir?: string): Promise<void> {
  if (initialized) return;

  let wtsWasmPath = "";
  let outDir = "";

  if (customWasmsDir && fsSync.existsSync(path.join(customWasmsDir, "tree-sitter.wasm"))) {
    wtsWasmPath = path.join(customWasmsDir, "tree-sitter.wasm");
    outDir = customWasmsDir;
  } else {
    const baseDir = typeof __dirname !== "undefined" ? __dirname : process.cwd();
    const candidates = [
      path.join(baseDir, "wasms"),
      path.join(baseDir, "../wasms"),
      path.join(baseDir, "dist/wasms"),
      path.join(baseDir, "../dist/wasms"),
      path.join(process.cwd(), "apps/extension/dist/wasms"),
      path.join(process.cwd(), "dist/wasms"),
      path.join(process.cwd(), "media/wasms"),
    ];

    const foundCandidate = candidates.find(
      (d) =>
        fsSync.existsSync(path.join(d, "tree-sitter.wasm")) &&
        fsSync.existsSync(path.join(d, "tree-sitter-typescript.wasm")),
    );

    if (foundCandidate) {
      outDir = foundCandidate;
      wtsWasmPath = path.join(outDir, "tree-sitter.wasm");
    } else {
      const resolver = getResolver();
      if (resolver) {
        try {
          const wtsPkg = resolver("web-tree-sitter/package.json");
          wtsWasmPath = path.join(path.dirname(wtsPkg), "tree-sitter.wasm");
          const wasmsPkg = resolver("tree-sitter-wasms/package.json");
          outDir = path.join(path.dirname(wasmsPkg), "out");
        } catch {
          // fall back to cwd
        }
      }

      if (!wtsWasmPath || !outDir) {
        outDir = process.cwd();
        wtsWasmPath = path.join(outDir, "tree-sitter.wasm");
      }
    }
  }

  await Parser.init({
    locateFile: () => wtsWasmPath,
  });

  tsLanguage = await Parser.Language.load(path.join(outDir, "tree-sitter-typescript.wasm"));
  jsLanguage = await Parser.Language.load(path.join(outDir, "tree-sitter-javascript.wasm"));
  vueLanguage = await Parser.Language.load(path.join(outDir, "tree-sitter-vue.wasm"));

  initialized = true;
}

export function detectFileLanguage(filePath: string): "typescript" | "javascript" | "vue" | null {
  const ext = path.extname(filePath).toLowerCase();
  if (ext === ".vue") return "vue";
  if (ext === ".ts" || ext === ".tsx") return "typescript";
  if (ext === ".js" || ext === ".jsx" || ext === ".mjs" || ext === ".cjs") return "javascript";
  return null;
}

export async function parseSource(filePath: string, content: string): Promise<ParsedAst | null> {
  await initParser();

  const langType = detectFileLanguage(filePath);
  if (!langType) return null;

  const parser = new Parser();
  if (langType === "typescript" && tsLanguage) {
    parser.setLanguage(tsLanguage);
  } else if (langType === "javascript" && jsLanguage) {
    parser.setLanguage(jsLanguage);
  } else if (langType === "vue" && vueLanguage) {
    parser.setLanguage(vueLanguage);
  } else {
    return null;
  }

  const tree = parser.parse(content);

  const findFirstLineOf = (target: string): number | undefined => {
    // 1. Try AST matching
    let astLine: number | undefined;

    function walk(node: Parser.SyntaxNode): void {
      if (astLine !== undefined) return;

      // Match call expressions like defineEventHandler(...)
      if (node.type === "call_expression") {
        const callee = node.firstNamedChild;
        if (callee && callee.text === target) {
          astLine = node.startPosition.row + 1;
          return;
        }
      }

      // Match export default
      if (target === "export default" && node.type === "export_statement") {
        astLine = node.startPosition.row + 1;
        return;
      }

      // Match Vue template or script tags
      if (langType === "vue") {
        if (
          target.includes("script") &&
          (node.type === "script_element" || node.type === "script")
        ) {
          astLine = node.startPosition.row + 1;
          return;
        }
        if (
          target.includes("template") &&
          (node.type === "template_element" || node.type === "template")
        ) {
          astLine = node.startPosition.row + 1;
          return;
        }
      }

      for (let i = 0; i < node.namedChildCount; i++) {
        const child = node.namedChild(i);
        if (child) walk(child);
      }
    }

    walk(tree.rootNode);
    if (astLine !== undefined) {
      return astLine;
    }

    // 2. Fallback to line scanning in source text
    const lines = content.split(/\r?\n/);
    for (let i = 0; i < lines.length; i++) {
      const lineText = lines[i];
      if (lineText && lineText.includes(target)) {
        return i + 1;
      }
    }

    return undefined;
  };

  return {
    tree,
    language: langType,
    findFirstLineOf,
  };
}
