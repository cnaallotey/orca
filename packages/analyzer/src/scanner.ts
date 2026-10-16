import fs from "node:fs/promises";
import path from "node:path";
import { CURRENT_SCHEMA_VERSION, mergeGraphs, validateGraph } from "@arch-viz/core";
import type { ArchitectureGraph } from "@arch-viz/core";
import { DataAccessDetector } from "./detectors/data-access.js";
import { EnvDetector } from "./detectors/env.js";
import { HttpClientDetector } from "./detectors/http-client.js";
import { NuxtRoutesDetector } from "./detectors/nuxt-routes.js";
import { initParser, parseSource } from "./parser.js";
import type { Detector, DetectorContext, ScanOptions } from "./types.js";

const DEFAULT_IGNORED_DIRS = new Set([
  "node_modules",
  ".git",
  ".output",
  ".nuxt",
  "dist",
  ".pnpm-store",
  ".architecture",
]);

async function collectFiles(dir: string, baseDir: string): Promise<string[]> {
  const entries = await fs.readdir(dir, { withFileTypes: true });
  const files: string[] = [];

  for (const entry of entries) {
    if (entry.isDirectory()) {
      if (!DEFAULT_IGNORED_DIRS.has(entry.name)) {
        const subFiles = await collectFiles(path.join(dir, entry.name), baseDir);
        files.push(...subFiles);
      }
    } else if (entry.isFile()) {
      const fullPath = path.join(dir, entry.name);
      const relative = path.relative(baseDir, fullPath).replace(/\\/g, "/");
      files.push(relative);
    }
  }

  return files;
}

export async function scanWorkspace(options: ScanOptions): Promise<ArchitectureGraph> {
  if (options.wasmsDir) {
    await initParser(options.wasmsDir);
  }

  const root = path.resolve(options.workspaceRoot);
  const files = options.files ?? (await collectFiles(root, root));

  const detectors: Detector[] = options.detectors ?? [
    new NuxtRoutesDetector(),
    new HttpClientDetector(),
    new DataAccessDetector(),
    new EnvDetector(),
  ];

  const context: DetectorContext = {
    workspaceRoot: root,
    files,
    getFileContent: async (relativeFile: string) => {
      const fullPath = path.join(root, relativeFile);
      return fs.readFile(fullPath, "utf-8");
    },
    parseFile: async (relativeFile: string, content: string) => {
      return parseSource(relativeFile, content);
    },
    logger: {
      info: () => {},
      warn: (msg) => console.warn(`[analyzer warning] ${msg}`),
      error: (msg) => console.error(`[analyzer error] ${msg}`),
    },
  };

  const allNodes = [];
  const allEdges = [];

  for (const detector of detectors) {
    try {
      context.knownNodes = [...allNodes];
      const result = await detector.detect(context);
      allNodes.push(...result.nodes);
      allEdges.push(...result.edges);
    } catch (err) {
      context.logger?.warn(`Detector ${detector.name} failed: ${String(err)}`);
    }
  }

  const rawGraph = {
    schemaVersion: CURRENT_SCHEMA_VERSION,
    project: {
      name: options.projectName ?? path.basename(root) ?? "workspace",
      commit: options.commit ?? "HEAD",
      generatedAt: new Date().toISOString(),
    },
    nodes: allNodes,
    edges: allEdges,
    overrides: {
      hiddenNodeIds: [],
      hiddenEdgeIds: [],
    },
  };

  const freshGraph = validateGraph(rawGraph);

  if (options.previousGraph) {
    return mergeGraphs(options.previousGraph, freshGraph);
  }

  return freshGraph;
}
