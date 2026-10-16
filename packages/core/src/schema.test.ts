import { describe, expect, it } from "vitest";
import { ArchitectureGraphValidationError, safeValidateGraph, validateGraph } from "./schema.js";

describe("ArchitectureGraphSchema", () => {
  const validTimestamp = "2026-10-06T10:00:00.000Z";

  it("validates an empty graph with valid project metadata", () => {
    const raw = {
      schemaVersion: "0.1.0",
      project: {
        name: "test-app",
        commit: "abc1234",
        generatedAt: validTimestamp,
      },
      nodes: [],
      edges: [],
      overrides: { hiddenNodeIds: [], hiddenEdgeIds: [] },
    };

    const graph = validateGraph(raw);
    expect(graph.schemaVersion).toBe("0.1.0");
    expect(graph.nodes).toHaveLength(0);
    expect(graph.edges).toHaveLength(0);
  });

  it("validates a graph with valid nodes and edges", () => {
    const raw = {
      schemaVersion: "0.1.0",
      project: {
        name: "nuxt-app",
        commit: "main",
        generatedAt: validTimestamp,
      },
      nodes: [
        {
          id: "route_page_home",
          type: "route",
          label: "/",
          source: { file: "pages/index.vue", line: 1 },
          origin: "detected",
          meta: { method: "GET" },
          sim: {
            latencyMs: { p50: 10, p95: 50 },
            capacityRps: 1000,
            concurrencyLimit: 100,
            failureRate: 0.001,
            costPerCall: 0,
          },
        },
        {
          id: "route_api_users",
          type: "route",
          label: "/api/users",
          source: { file: "server/api/users.ts", line: 5 },
          origin: "detected",
          meta: {},
        },
      ],
      edges: [
        {
          id: "edge_home_to_users",
          from: "route_page_home",
          to: "route_api_users",
          kind: "calls",
          origin: "detected",
          confidence: 0.9,
          sim: { callRatio: 1.0, timeoutMs: 500, retries: 2 },
        },
      ],
      overrides: { hiddenNodeIds: [], hiddenEdgeIds: [] },
    };

    const parsed = validateGraph(raw);
    expect(parsed.nodes).toHaveLength(2);
    expect(parsed.edges).toHaveLength(1);
    expect(parsed.edges[0]?.kind).toBe("calls");
  });

  it("rejects graphs with invalid schemaVersion", () => {
    const raw = {
      schemaVersion: "0.0.1",
      project: {
        name: "test",
        commit: "1",
        generatedAt: validTimestamp,
      },
      nodes: [],
      edges: [],
    };

    expect(() => validateGraph(raw)).toThrow(ArchitectureGraphValidationError);
    const result = safeValidateGraph(raw);
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.errors.some((e) => e.path === "schemaVersion")).toBe(true);
    }
  });

  it("rejects duplicate node IDs with clear error message naming the field", () => {
    const raw = {
      schemaVersion: "0.1.0",
      project: {
        name: "test",
        commit: "1",
        generatedAt: validTimestamp,
      },
      nodes: [
        {
          id: "node_dup",
          type: "route",
          label: "/a",
          source: { file: "pages/a.vue", line: 1 },
          origin: "detected",
        },
        {
          id: "node_dup",
          type: "route",
          label: "/b",
          source: { file: "pages/b.vue", line: 1 },
          origin: "detected",
        },
      ],
      edges: [],
    };

    const result = safeValidateGraph(raw);
    expect(result.success).toBe(false);
    if (!result.success) {
      const dupError = result.errors.find((e) => e.path === "nodes.1.id");
      expect(dupError).toBeDefined();
      expect(dupError?.message).toContain('Duplicate node ID "node_dup"');
    }
  });

  it("rejects duplicate edge IDs with clear error message naming the field", () => {
    const raw = {
      schemaVersion: "0.1.0",
      project: {
        name: "test",
        commit: "1",
        generatedAt: validTimestamp,
      },
      nodes: [
        {
          id: "n1",
          type: "service",
          label: "s1",
          source: { file: "app.ts", line: 1 },
          origin: "detected",
        },
        {
          id: "n2",
          type: "service",
          label: "s2",
          source: { file: "app.ts", line: 10 },
          origin: "detected",
        },
      ],
      edges: [
        { id: "e_dup", from: "n1", to: "n2", kind: "calls", origin: "detected", confidence: 1 },
        { id: "e_dup", from: "n1", to: "n2", kind: "calls", origin: "detected", confidence: 1 },
      ],
    };

    const result = safeValidateGraph(raw);
    expect(result.success).toBe(false);
    if (!result.success) {
      const dupEdgeError = result.errors.find((e) => e.path === "edges.1.id");
      expect(dupEdgeError).toBeDefined();
      expect(dupEdgeError?.message).toContain('Duplicate edge ID "e_dup"');
    }
  });

  it("rejects edge with missing source or target endpoint", () => {
    const raw = {
      schemaVersion: "0.1.0",
      project: {
        name: "test",
        commit: "1",
        generatedAt: validTimestamp,
      },
      nodes: [
        {
          id: "n1",
          type: "service",
          label: "s1",
          source: { file: "app.ts", line: 1 },
          origin: "detected",
        },
      ],
      edges: [
        {
          id: "edge1",
          from: "n1",
          to: "nonexistent_node",
          kind: "calls",
          origin: "detected",
          confidence: 1,
        },
      ],
    };

    const result = safeValidateGraph(raw);
    expect(result.success).toBe(false);
    if (!result.success) {
      const missingTarget = result.errors.find((e) => e.path === "edges.0.to");
      expect(missingTarget).toBeDefined();
      expect(missingTarget?.message).toContain('nonexistent target node "nonexistent_node"');
    }
  });

  it("rejects invalid node types and line numbers", () => {
    const raw = {
      schemaVersion: "0.1.0",
      project: {
        name: "test",
        commit: "1",
        generatedAt: validTimestamp,
      },
      nodes: [
        {
          id: "n1",
          type: "invalid_type",
          label: "bad",
          source: { file: "bad.ts", line: 0 },
          origin: "detected",
        },
      ],
      edges: [],
    };

    const result = safeValidateGraph(raw);
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.errors.some((e) => e.path === "nodes.0.type")).toBe(true);
      expect(result.errors.some((e) => e.path === "nodes.0.source.line")).toBe(true);
    }
  });
});
