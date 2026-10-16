import { describe, expect, it } from "vitest";
import { createEdgeId, createNodeId, normalizeFilePath } from "./ids.js";

describe("Stable ID Generation", () => {
  it("normalizes file paths across OS conventions", () => {
    expect(normalizeFilePath("./pages/index.vue")).toBe("pages/index.vue");
    expect(normalizeFilePath("pages\\users\\[id].vue")).toBe("pages/users/[id].vue");
  });

  it("produces deterministic node IDs for same inputs", () => {
    const id1 = createNodeId("route", "pages/index.vue", "default");
    const id2 = createNodeId("route", "./pages/index.vue", "default");
    expect(id1).toBe(id2);
    expect(id1.startsWith("route_")).toBe(true);
  });

  it("produces distinct node IDs for different types or paths", () => {
    const id1 = createNodeId("route", "pages/users.vue", "GET");
    const id2 = createNodeId("route", "server/api/users.ts", "GET");
    const id3 = createNodeId("service", "server/api/users.ts", "GET");
    expect(id1).not.toBe(id2);
    expect(id2).not.toBe(id3);
  });

  it("produces deterministic edge IDs", () => {
    const edgeId1 = createEdgeId("calls", "node_a", "node_b", "fetch");
    const edgeId2 = createEdgeId("calls", "node_a", "node_b", "fetch");
    expect(edgeId1).toBe(edgeId2);
    expect(edgeId1.startsWith("edge_")).toBe(true);
  });
});
