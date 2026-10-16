import { z } from "zod";
import {
  CURRENT_SCHEMA_VERSION,
  EdgeSchema,
  NodeSchema,
  type ArchitectureEdge,
  type ArchitectureGraph,
  type ArchitectureNode,
} from "./schema.js";

/**
 * Schema for `.architecture/overrides.json`, storing manual node/edge additions
 * and visibility overrides that persist across scans.
 */
export const WorkspaceOverridesSchema = z.object({
  schemaVersion: z.string().default(CURRENT_SCHEMA_VERSION),
  hiddenNodeIds: z.array(z.string()).default([]),
  hiddenEdgeIds: z.array(z.string()).default([]),
  manualNodes: z.array(NodeSchema).default([]),
  manualEdges: z.array(EdgeSchema).default([]),
});

export type WorkspaceOverrides = z.infer<typeof WorkspaceOverridesSchema>;

/**
 * Validates untyped data against the WorkspaceOverridesSchema.
 */
export function validateOverrides(data: unknown): WorkspaceOverrides {
  return WorkspaceOverridesSchema.parse(data);
}

/**
 * Applies persistent workspace overrides onto an ArchitectureGraph.
 * 1. Appends or replaces nodes with `origin: "manual"`.
 * 2. Appends or replaces edges with `origin: "manual"`.
 * 3. Merges hiddenNodeIds and hiddenEdgeIds into `graph.overrides`.
 */
export function applyWorkspaceOverrides(
  graph: ArchitectureGraph,
  overrides: WorkspaceOverrides,
): ArchitectureGraph {
  const nodesMap = new Map<string, ArchitectureNode>();
  for (const node of graph.nodes) {
    nodesMap.set(node.id, node);
  }
  for (const manualNode of overrides.manualNodes) {
    nodesMap.set(manualNode.id, {
      ...manualNode,
      origin: "manual",
    });
  }

  const edgesMap = new Map<string, ArchitectureEdge>();
  for (const edge of graph.edges) {
    edgesMap.set(edge.id, edge);
  }
  for (const manualEdge of overrides.manualEdges) {
    // Only add manual edge if endpoints exist
    if (nodesMap.has(manualEdge.from) && nodesMap.has(manualEdge.to)) {
      edgesMap.set(manualEdge.id, {
        ...manualEdge,
        origin: "manual",
      });
    }
  }

  const hiddenNodeIds = Array.from(
    new Set([...graph.overrides.hiddenNodeIds, ...overrides.hiddenNodeIds]),
  );
  const hiddenEdgeIds = Array.from(
    new Set([...graph.overrides.hiddenEdgeIds, ...overrides.hiddenEdgeIds]),
  );

  return {
    ...graph,
    nodes: Array.from(nodesMap.values()),
    edges: Array.from(edgesMap.values()),
    overrides: {
      hiddenNodeIds,
      hiddenEdgeIds,
    },
  };
}

/**
 * Extracts all manual edits and visibility overrides from an ArchitectureGraph
 * suitable for saving to `.architecture/overrides.json`.
 */
export function extractWorkspaceOverrides(graph: ArchitectureGraph): WorkspaceOverrides {
  const manualNodes = graph.nodes.filter((n) => n.origin === "manual");
  const manualEdges = graph.edges.filter((e) => e.origin === "manual");

  return {
    schemaVersion: graph.schemaVersion,
    hiddenNodeIds: [...graph.overrides.hiddenNodeIds],
    hiddenEdgeIds: [...graph.overrides.hiddenEdgeIds],
    manualNodes,
    manualEdges,
  };
}
