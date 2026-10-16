import { describe, expect, it } from "vitest";
import { HttpClientDetector } from "./detectors/http-client.js";
import type { DetectorContext } from "./types.js";
import type { ArchitectureNode } from "@arch-viz/core";

describe("HttpClientDetector", () => {
  const mockKnownNodes: ArchitectureNode[] = [
    {
      id: "node:route:pages/index.vue",
      type: "route",
      label: "/",
      source: { file: "pages/index.vue", line: 1 },
      origin: "detected",
      meta: { path: "/", route: "/" },
    },
    {
      id: "node:route:server/api/users.ts",
      type: "route",
      label: "GET /api/users",
      source: { file: "server/api/users.ts", line: 1 },
      origin: "detected",
      meta: { path: "/api/users", route: "/api/users" },
    },
    {
      id: "node:route:server/api/users/[id].ts",
      type: "route",
      label: "GET /api/users/:id",
      source: { file: "server/api/users/[id].ts", line: 1 },
      origin: "detected",
      meta: { path: "/api/users/:id", route: "/api/users/:id" },
    },
  ];

  it("detects $fetch and resolves internal route", async () => {
    const virtualFiles: Record<string, string> = {
      "pages/index.vue": `
        <script setup>
        const { data } = await $fetch('/api/users');
        </script>
      `,
    };

    const context: DetectorContext = {
      workspaceRoot: "/mock",
      files: Object.keys(virtualFiles),
      getFileContent: async (f) => virtualFiles[f] ?? "",
      parseFile: async () => null,
      knownNodes: mockKnownNodes,
    };

    const detector = new HttpClientDetector();
    const result = await detector.detect(context);

    expect(result.edges).toHaveLength(1);
    const edge = result.edges[0]!;
    expect(edge.from).toBe("node:route:pages/index.vue");
    expect(edge.to).toBe("node:route:server/api/users.ts");
    expect(edge.kind).toBe("calls");
    expect(edge.confidence).toBe(1.0);
  });

  it("detects external API call with axios and creates externalApi node", async () => {
    const virtualFiles: Record<string, string> = {
      "pages/index.vue": `
        <script setup>
        await axios.post('https://api.stripe.com/v1/checkout/sessions', { amount: 1000 });
        </script>
      `,
    };

    const context: DetectorContext = {
      workspaceRoot: "/mock",
      files: Object.keys(virtualFiles),
      getFileContent: async (f) => virtualFiles[f] ?? "",
      parseFile: async () => null,
      knownNodes: mockKnownNodes,
    };

    const detector = new HttpClientDetector();
    const result = await detector.detect(context);

    const stripeNode = result.nodes.find((n) => n.type === "externalApi");
    expect(stripeNode).toBeDefined();
    expect(stripeNode?.label).toBe("api.stripe.com");

    const edge = result.edges.find((e) => e.to === stripeNode?.id);
    expect(edge).toBeDefined();
    expect(edge?.from).toBe("node:route:pages/index.vue");
    expect(edge?.kind).toBe("calls");
    expect(edge?.confidence).toBe(0.9);
  });

  it("resolves parameterized route URLs to parameterized route pattern", async () => {
    const virtualFiles: Record<string, string> = {
      "pages/index.vue": `
        <script setup>
        const user = await useFetch('/api/users/42');
        </script>
      `,
    };

    const context: DetectorContext = {
      workspaceRoot: "/mock",
      files: Object.keys(virtualFiles),
      getFileContent: async (f) => virtualFiles[f] ?? "",
      parseFile: async () => null,
      knownNodes: mockKnownNodes,
    };

    const detector = new HttpClientDetector();
    const result = await detector.detect(context);

    expect(result.edges).toHaveLength(1);
    expect(result.edges[0]?.to).toBe("node:route:server/api/users/[id].ts");
  });
});
