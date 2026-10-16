import type { ArchitectureGraph, ArchitectureNode, NodeType } from "@arch-viz/core";

export interface ViewerOptions {
  container?: HTMLElement;
  graph: ArchitectureGraph;
  theme?: "light" | "dark";
  onNodeClick?: (node: ArchitectureNode) => void;
  onNodeSelect?: (nodeId: string | null) => void;
}

export interface ViewerElementData {
  id: string;
  label: string;
  type: NodeType;
  sourceFile: string;
  sourceLine: number;
  origin: string;
  rawNode: ArchitectureNode;
}

export interface ViewerEdgeData {
  id: string;
  source: string;
  target: string;
  kind: string;
  confidence: number;
}
