import fs from "node:fs/promises";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { scanWorkspace } from "./scanner.js";
import { validateGraph } from "@arch-viz/core";

describe("QA Golden Test: Full-App Multi-Detector Fixture", () => {
  it("scans fixtures/full-app and matches checked-in expected graph across all detectors", async () => {
    const fixtureRoot = path.resolve(__dirname, "../../../fixtures/full-app");
    const expectedGraphPath = path.join(fixtureRoot, "expected-graph.json");

    const expectedRaw = await fs.readFile(expectedGraphPath, "utf-8");
    const expectedGraph = JSON.parse(expectedRaw);

    const actualGraph = await scanWorkspace({
      workspaceRoot: fixtureRoot,
      projectName: "full-app",
      commit: "test-commit",
    });

    // Validate that the produced graph conforms to the official Zod schema
    const validatedGraph = validateGraph(actualGraph);
    expect(validatedGraph).toBeDefined();

    // Normalize generatedAt for deterministic golden comparison
    actualGraph.project.generatedAt = expectedGraph.project.generatedAt;

    expect(actualGraph).toEqual(expectedGraph);
  });
});
