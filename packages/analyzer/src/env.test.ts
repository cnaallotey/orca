import { describe, expect, it } from "vitest";
import { EnvDetector } from "./detectors/env.js";
import type { DetectorContext } from "./types.js";
import type { ArchitectureNode } from "@arch-viz/core";

describe("EnvDetector", () => {
  const mockKnownNodes: ArchitectureNode[] = [
    {
      id: "node:route:server/api/users.ts",
      type: "route",
      label: "GET /api/users",
      source: { file: "server/api/users.ts", line: 1 },
      origin: "detected",
      meta: { path: "/api/users" },
    },
  ];

  it("detects .env definitions and code references", async () => {
    const virtualFiles: Record<string, string> = {
      ".env.example": `
        DATABASE_URL="postgresql://user:pass@localhost:5432/db"
        STRIPE_SECRET_KEY="sk_test_123"
      `,
      "server/api/users.ts": `
        export default defineEventHandler(() => {
          const key = process.env.STRIPE_SECRET_KEY;
          return { ok: true };
        });
      `,
    };

    const context: DetectorContext = {
      workspaceRoot: "/mock",
      files: Object.keys(virtualFiles),
      getFileContent: async (f) => virtualFiles[f] ?? "",
      parseFile: async () => null,
      knownNodes: mockKnownNodes,
    };

    const detector = new EnvDetector();
    const result = await detector.detect(context);

    const dbEnv = result.nodes.find((n) => n.type === "env" && n.label === "DATABASE_URL");
    const stripeEnv = result.nodes.find((n) => n.type === "env" && n.label === "STRIPE_SECRET_KEY");

    expect(dbEnv).toBeDefined();
    expect(stripeEnv).toBeDefined();

    // Edge from server route to env variable
    const edge = result.edges.find((e) => e.to === stripeEnv?.id);
    expect(edge).toBeDefined();
    expect(edge?.from).toBe("node:route:server/api/users.ts");
    expect(edge?.kind).toBe("reads");
  });
});
