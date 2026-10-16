import { describe, expect, it } from "vitest";
import { mergeGraphs } from "./merge.js";
import type { ArchitectureGraph } from "./schema.js";

describe("mergeGraphs", () => {
  const basePrevious: ArchitectureGraph = {
    schemaVersion: "0.1.0",
    project: {
      name: "test-app",
      commit: "commit-1",
      generatedAt: "2026-10-06T09:00:00.000Z",
    },
    nodes: [
      {
        id: "route_existing",
        type: "route",
        label: "/existing",
        source: { file: "pages/existing.vue", line: 1 },
        origin: "detected",
        meta: { userComment: "kept" },
      },
      {
        id: "route_disappeared",
        type: "route",
        label: "/removed",
        source: { file: "pages/removed.vue", line: 1 },
        origin: "detected",
        meta: {},
      },
      {
        id: "route_manual_note",
        type: "service",
        label: "Manual Service",
        source: { file: "docs/architecture.md", line: 1 },
        origin: "manual",
        meta: { note: "manual addition" },
      },
    ],
    edges: [
      {
        id: "edge_manual_link",
        from: "route_existing",
        to: "route_manual_note",
        kind: "calls",
        origin: "manual",
        confidence: 1,
      },
      {
        id: "edge_disappeared",
        from: "route_existing",
        to: "route_disappeared",
        kind: "calls",
        origin: "detected",
        confidence: 0.8,
      },
    ],
    overrides: {
      hiddenNodeIds: ["route_disappeared"],
      hiddenEdgeIds: [],
    },
  };

  const baseNext: ArchitectureGraph = {
    schemaVersion: "0.1.0",
    project: {
      name: "test-app",
      commit: "commit-2",
      generatedAt: "2026-10-06T10:00:00.000Z",
    },
    nodes: [
      {
        id: "route_existing",
        type: "route",
        label: "/existing-updated",
        source: { file: "pages/existing.vue", line: 2 },
        origin: "detected",
        meta: {},
      },
      {
        id: "route_brand_new",
        type: "route",
        label: "/new",
        source: { file: "pages/new.vue", line: 1 },
        origin: "detected",
        meta: {},
      },
    ],
    edges: [],
    overrides: {
      hiddenNodeIds: [],
      hiddenEdgeIds: [],
    },
  };

  it("retains manual nodes and edges across rescans", () => {
    const merged = mergeGraphs(basePrevious, baseNext);

    const manualNode = merged.nodes.find((n) => n.id === "route_manual_note");
    expect(manualNode).toBeDefined();
    expect(manualNode?.origin).toBe("manual");

    const manualEdge = merged.edges.find((e) => e.id === "edge_manual_link");
    expect(manualEdge).toBeDefined();
    expect(manualEdge?.origin).toBe("manual");
  });

  it("marks disappeared detected items as removed rather than dropping them", () => {
    const merged = mergeGraphs(basePrevious, baseNext);

    const disappearedNode = merged.nodes.find((n) => n.id === "route_disappeared");
    expect(disappearedNode).toBeDefined();
    expect((disappearedNode?.meta as Record<string, unknown>)?.removed).toBe(true);
    expect((disappearedNode?.meta as Record<string, unknown>)?.removedAt).toBe(
      "2026-10-06T10:00:00.000Z",
    );

    const disappearedEdge = merged.edges.find((e) => e.id === "edge_disappeared");
    expect(disappearedEdge).toBeDefined();
    expect(disappearedEdge?.confidence).toBe(0);
    expect(merged.overrides.hiddenEdgeIds).toContain("edge_disappeared");
  });

  it("preserves prior custom metadata on updated nodes", () => {
    const merged = mergeGraphs(basePrevious, baseNext);

    const existingNode = merged.nodes.find((n) => n.id === "route_existing");
    expect(existingNode).toBeDefined();
    expect(existingNode?.label).toBe("/existing-updated");
    expect(existingNode?.source.line).toBe(2);
    expect((existingNode?.meta as Record<string, unknown>)?.userComment).toBe("kept");
  });
});
