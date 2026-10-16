import { describe, expect, it } from "vitest";
import { DataAccessDetector } from "./detectors/data-access.js";
import type { DetectorContext } from "./types.js";
import type { ArchitectureNode } from "@arch-viz/core";

describe("DataAccessDetector", () => {
  const mockKnownNodes: ArchitectureNode[] = [
    {
      id: "node:route:server/api/users.ts",
      type: "route",
      label: "GET /api/users",
      source: { file: "server/api/users.ts", line: 1 },
      origin: "detected",
      meta: { path: "/api/users" },
    },
    {
      id: "node:route:server/api/users.post.ts",
      type: "route",
      label: "POST /api/users",
      source: { file: "server/api/users.post.ts", line: 1 },
      origin: "detected",
      meta: { path: "/api/users" },
    },
  ];

  it("detects Prisma models and client read/write queries", async () => {
    const virtualFiles: Record<string, string> = {
      "prisma/schema.prisma": `
        datasource db {
          provider = "postgresql"
          url      = env("DATABASE_URL")
        }

        model User {
          id    Int     @id @default(autoincrement())
          email String  @unique
          name  String?
        }
      `,
      "server/api/users.ts": `
        export default defineEventHandler(async () => {
          return await prisma.user.findMany();
        });
      `,
      "server/api/users.post.ts": `
        export default defineEventHandler(async (event) => {
          const body = await readBody(event);
          return await prisma.user.create({ data: body });
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

    const detector = new DataAccessDetector();
    const result = await detector.detect(context);

    // Should detect PostgreSQL database node and User model table
    const dbNode = result.nodes.find((n) => n.type === "database" && n.label === "PostgreSQL");
    expect(dbNode).toBeDefined();

    const userTable = result.nodes.find((n) => n.type === "database" && n.label === "User Table");
    expect(userTable).toBeDefined();

    // Read edge from GET /api/users to User Table
    const readEdge = result.edges.find(
      (e) => e.from === "node:route:server/api/users.ts" && e.kind === "reads",
    );
    expect(readEdge).toBeDefined();
    expect(readEdge?.to).toBe(userTable?.id);

    // Write edge from POST /api/users to User Table
    const writeEdge = result.edges.find(
      (e) => e.from === "node:route:server/api/users.post.ts" && e.kind === "writes",
    );
    expect(writeEdge).toBeDefined();
    expect(writeEdge?.to).toBe(userTable?.id);
  });
});
