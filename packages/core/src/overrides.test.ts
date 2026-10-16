import { describe, expect, it } from "vitest";
import {
  applyWorkspaceOverrides,
  extractWorkspaceOverrides,
  validateOverrides,
  type WorkspaceOverrides,
} from "./overrides.js";
import type { ArchitectureGraph } from "./schema.js";

describe("WorkspaceOverrides", () => {
  const baseGraph: ArchitectureGraph = {
    schemaVersion: "0.1.0",
    project: {
      name: "test-app",
      commit: "HEAD",
      generatedAt: "2026-10-06T12:00:00Z",
    },
    nodes: [
      {
        id: "node:route:pages/index.vue:default",
        type: "route",
        label: "/",
        source: { file: "pages/index.vue", line: 1 },
        origin: "detected",
        meta: {},
      },
      {
        id: "node:route:pages/about.vue:default",
        type: "route",
        label: "/about",
        source: { file: "pages/about.vue", line: 1 },
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

  it("validates valid overrides structure", () => {
    const raw: WorkspaceOverrides = {
      schemaVersion: "0.1.0",
      hiddenNodeIds: ["node:route:pages/about.vue:default"],
      hiddenEdgeIds: [],
      manualNodes: [
        {
          id: "node:database:manual:users-db",
          type: "database",
          label: "Users Postgres",
          source: { file: "manual", line: 1 },
          origin: "manual",
          meta: {},
        },
      ],
      manualEdges: [
        {
          id: "edge:manual:1",
          from: "node:route:pages/index.vue:default",
          to: "node:database:manual:users-db",
          kind: "reads",
          origin: "manual",
          confidence: 1.0,
        },
      ],
    };

    const validated = validateOverrides(raw);
    expect(validated.hiddenNodeIds).toContain("node:route:pages/about.vue:default");
    expect(validated.manualNodes).toHaveLength(1);
    expect(validated.manualEdges).toHaveLength(1);
  });

  it("applies overrides and preserves manual nodes and edges", () => {
    const overrides: WorkspaceOverrides = {
      schemaVersion: "0.1.0",
      hiddenNodeIds: ["node:route:pages/about.vue:default"],
      hiddenEdgeIds: [],
      manualNodes: [
        {
          id: "node:database:manual:users-db",
          type: "database",
          label: "Users DB",
          source: { file: "manual", line: 1 },
          origin: "manual",
          meta: {},
        },
      ],
      manualEdges: [
        {
          id: "edge:manual:1",
          from: "node:route:pages/index.vue:default",
          to: "node:database:manual:users-db",
          kind: "reads",
          origin: "manual",
          confidence: 1.0,
        },
      ],
    };

    const merged = applyWorkspaceOverrides(baseGraph, overrides);
    expect(merged.nodes).toHaveLength(3);
    expect(merged.nodes.find((n) => n.id === "node:database:manual:users-db")).toBeDefined();
    expect(merged.edges).toHaveLength(1);
    expect(merged.overrides.hiddenNodeIds).toContain("node:route:pages/about.vue:default");
  });

  it("extracts workspace overrides from an active graph", () => {
    const graphWithManual: ArchitectureGraph = {
      ...baseGraph,
      nodes: [
        ...baseGraph.nodes,
        {
          id: "node:service:manual:auth",
          type: "service",
          label: "Auth Service",
          source: { file: "manual", line: 1 },
          origin: "manual",
          meta: {},
        },
      ],
      edges: [
        {
          id: "edge:manual:2",
          from: "node:route:pages/index.vue:default",
          to: "node:service:manual:auth",
          kind: "calls",
          origin: "manual",
          confidence: 1.0,
        },
      ],
      overrides: {
        hiddenNodeIds: ["node:route:pages/about.vue:default"],
        hiddenEdgeIds: ["edge:hidden:1"],
      },
    };

    const extracted = extractWorkspaceOverrides(graphWithManual);
    expect(extracted.manualNodes).toHaveLength(1);
    expect(extracted.manualNodes[0]?.id).toBe("node:service:manual:auth");
    expect(extracted.manualEdges).toHaveLength(1);
    expect(extracted.hiddenNodeIds).toEqual(["node:route:pages/about.vue:default"]);
    expect(extracted.hiddenEdgeIds).toEqual(["edge:hidden:1"]);
  });
});
