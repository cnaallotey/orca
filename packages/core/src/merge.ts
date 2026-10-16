import type { ArchitectureEdge, ArchitectureGraph, ArchitectureNode } from "./schema.js";

/**
 * Merges a previous ArchitectureGraph with a freshly scanned next ArchitectureGraph.
 *
 * Rules:
 * 1. Nodes/edges with `origin: "manual"` survive regeneration.
 * 2. Nodes with `origin: "detected"` that disappeared are retained and marked
 *    as removed via `meta.removed = true` (with `removedAt` timestamp).
 * 3. Edges with `origin: "detected"` that disappeared are retained with confidence: 0
 *    and added to `overrides.hiddenEdgeIds`.
 * 4. Existing manual overrides (hiddenNodeIds, hiddenEdgeIds) are preserved.
 */
export function mergeGraphs(
  previous: ArchitectureGraph,
  next: ArchitectureGraph,
): ArchitectureGraph {
  const mergedNodesMap = new Map<string, ArchitectureNode>();
  const mergedEdgesMap = new Map<string, ArchitectureEdge>();

  const nextNodeIds = new Set(next.nodes.map((n) => n.id));
  const nextEdgeIds = new Set(next.edges.map((e) => e.id));

  // 1. Process next nodes (freshly detected/scanned)
  for (const nextNode of next.nodes) {
    const prevNode = previous.nodes.find((n) => n.id === nextNode.id);
    if (prevNode && prevNode.meta && typeof prevNode.meta === "object") {
      // Retain custom user meta properties while clearing any prior "removed" flag
      const cleanMeta = { ...(prevNode.meta as Record<string, unknown>) };
      delete cleanMeta["removed"];
      delete cleanMeta["removedAt"];
      mergedNodesMap.set(nextNode.id, {
        ...nextNode,
        meta: { ...cleanMeta, ...nextNode.meta },
      });
    } else {
      mergedNodesMap.set(nextNode.id, nextNode);
    }
  }

  // 2. Process previous nodes
  for (const prevNode of previous.nodes) {
    if (prevNode.origin === "manual") {
      // Manual nodes always survive
      mergedNodesMap.set(prevNode.id, prevNode);
    } else if (!nextNodeIds.has(prevNode.id)) {
      // Detected item disappeared -> mark removed rather than silently dropping
      const currentMeta = (prevNode.meta ?? {}) as Record<string, unknown>;
      mergedNodesMap.set(prevNode.id, {
        ...prevNode,
        meta: {
          ...currentMeta,
          removed: true,
          removedAt: next.project.generatedAt,
        },
      });
    }
  }

  // 3. Process next edges
  for (const nextEdge of next.edges) {
    mergedEdgesMap.set(nextEdge.id, nextEdge);
  }

  // 4. Process previous edges
  const hiddenEdgeIds = new Set(previous.overrides?.hiddenEdgeIds ?? []);
  for (const prevEdge of previous.edges) {
    if (prevEdge.origin === "manual") {
      // Manual edges survive if both endpoints exist in merged graph
      if (mergedNodesMap.has(prevEdge.from) && mergedNodesMap.has(prevEdge.to)) {
        mergedEdgesMap.set(prevEdge.id, prevEdge);
      }
    } else if (!nextEdgeIds.has(prevEdge.id)) {
      // Detected edge disappeared -> retain if endpoints exist, mark confidence 0 and hide
      if (mergedNodesMap.has(prevEdge.from) && mergedNodesMap.has(prevEdge.to)) {
        mergedEdgesMap.set(prevEdge.id, {
          ...prevEdge,
          confidence: 0,
        });
        hiddenEdgeIds.add(prevEdge.id);
      }
    }
  }

  // Preserve overrides
  const hiddenNodeIds = new Set([
    ...(previous.overrides?.hiddenNodeIds ?? []),
    ...(next.overrides?.hiddenNodeIds ?? []),
  ]);
  for (const edgeId of next.overrides?.hiddenEdgeIds ?? []) {
    hiddenEdgeIds.add(edgeId);
  }

  return {
    schemaVersion: next.schemaVersion,
    project: {
      ...next.project,
    },
    nodes: Array.from(mergedNodesMap.values()),
    edges: Array.from(mergedEdgesMap.values()),
    overrides: {
      hiddenNodeIds: Array.from(hiddenNodeIds),
      hiddenEdgeIds: Array.from(hiddenEdgeIds),
    },
  };
}
