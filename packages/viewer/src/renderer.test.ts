import type { ArchitectureGraph } from "@arch-viz/core";
import { describe, expect, it } from "vitest";
import { transformGraphToElements } from "./renderer.js";
import { getWebviewHtml } from "./webviewHtml.js";

describe("GraphViewer", () => {
  const sampleGraph: ArchitectureGraph = {
    schemaVersion: "0.1.0",
    project: {
      name: "sample",
      commit: "abc",
      generatedAt: "2026-10-06T12:00:00.000Z",
    },
    nodes: [
      {
        id: "route_home",
        type: "route",
        label: "/",
        source: { file: "pages/index.vue", line: 1 },
        origin: "detected",
        meta: {},
      },
      {
        id: "route_api",
        type: "route",
        label: "/api/users",
        source: { file: "server/api/users.ts", line: 3 },
        origin: "detected",
        meta: {},
      },
      {
        id: "route_hidden",
        type: "route",
        label: "/secret",
        source: { file: "pages/secret.vue", line: 1 },
        origin: "detected",
        meta: {},
      },
    ],
    edges: [
      {
        id: "edge_1",
        from: "route_home",
        to: "route_api",
        kind: "calls",
        origin: "detected",
        confidence: 0.9,
      },
      {
        id: "edge_hidden",
        from: "route_home",
        to: "route_hidden",
        kind: "calls",
        origin: "detected",
        confidence: 0.5,
      },
    ],
    overrides: {
      hiddenNodeIds: ["route_hidden"],
      hiddenEdgeIds: ["edge_hidden"],
    },
  };

  it("transforms ArchitectureGraph into cytoscape elements respecting overrides", () => {
    const elements = transformGraphToElements(sampleGraph);

    // 2 visible nodes, 1 hidden
    expect(elements.nodes.length).toBe(2);
    expect(elements.nodes.some((n) => n.data.id === "route_home")).toBe(true);
    expect(elements.nodes.some((n) => n.data.id === "route_api")).toBe(true);
    expect(elements.nodes.some((n) => n.data.id === "route_hidden")).toBe(false);

    // 1 visible edge
    expect(elements.edges.length).toBe(1);
    expect(elements.edges[0]?.data.id).toBe("edge_1");
  });

  it("generates strict CSP-compliant webview HTML with nonces and initial graph", () => {
    const html = getWebviewHtml({
      graph: sampleGraph,
      cspSource: "vscode-webview:",
      nonce: "random-nonce-12345",
      cytoscapeScriptUri: "vscode-webview://assets/cytoscape.min.js",
    });

    expect(html).toContain("<!DOCTYPE html>");
    expect(html).toContain("Content-Security-Policy");
    expect(html).toContain("nonce-random-nonce-12345");
    expect(html).toContain("vscode-webview://assets/cytoscape.min.js");
    expect(html).toContain("nodeSelected");
  });
});
