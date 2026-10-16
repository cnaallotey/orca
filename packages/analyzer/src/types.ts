import type { ArchitectureEdge, ArchitectureGraph, ArchitectureNode } from "@arch-viz/core";

export interface ParsedAst {
  tree: unknown;
  language: "typescript" | "javascript" | "vue";
  findFirstLineOf?: (identifier: string) => number | undefined;
}

export interface DetectorContext {
  workspaceRoot: string;
  files: string[];
  getFileContent: (filePath: string) => Promise<string>;
  parseFile: (filePath: string, content: string) => Promise<ParsedAst | null>;
  knownNodes?: ArchitectureNode[];
  logger?: {
    info: (msg: string) => void;
    warn: (msg: string) => void;
    error: (msg: string) => void;
  };
}

export interface DetectorResult {
  nodes: ArchitectureNode[];
  edges: ArchitectureEdge[];
}

export interface Detector {
  readonly name: string;
  detect(context: DetectorContext): Promise<DetectorResult>;
}

export interface ScanOptions {
  workspaceRoot: string;
  projectName?: string;
  commit?: string;
  files?: string[];
  detectors?: Detector[];
  previousGraph?: ArchitectureGraph;
  wasmsDir?: string;
}
