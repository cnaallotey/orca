import fs from "node:fs/promises";
import path from "node:path";
import { validateGraph } from "@arch-viz/core";
import { describe, expect, it } from "vitest";
import { scanWorkspace } from "./scanner.js";

describe("QA Golden Test: Nuxt Fixture", () => {
  it("scans fixtures/nuxt-sample and produces exact expected graph", async () => {
    const fixtureDir = path.resolve(__dirname, "../../../fixtures/nuxt-sample");
    const expectedGraphPath = path.join(fixtureDir, "expected-graph.json");

    const expectedContent = await fs.readFile(expectedGraphPath, "utf-8");
    const expected = validateGraph(JSON.parse(expectedContent));

    const scanned = await scanWorkspace({
      workspaceRoot: fixtureDir,
      projectName: "nuxt-sample",
      commit: "test-commit",
    });

    // Normalize generatedAt timestamp for golden comparison
    const normalizedScanned = {
      ...scanned,
      project: {
        ...scanned.project,
        generatedAt: expected.project.generatedAt,
      },
    };

    expect(normalizedScanned).toEqual(expected);
  });
});
