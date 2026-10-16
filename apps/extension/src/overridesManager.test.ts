import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { hideNodeInWorkspace, loadOverrides, saveOverrides } from "./overridesManager.js";

describe("overridesManager", () => {
  let tmpDir: string;

  beforeEach(async () => {
    tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), "arch-viz-test-"));
  });

  afterEach(async () => {
    await fs.rm(tmpDir, { recursive: true, force: true });
  });

  it("loads empty default overrides when file does not exist", async () => {
    const overrides = await loadOverrides(tmpDir);
    expect(overrides.hiddenNodeIds).toEqual([]);
    expect(overrides.manualNodes).toEqual([]);
  });

  it("saves and loads overrides cleanly", async () => {
    await saveOverrides(tmpDir, {
      schemaVersion: "0.1.0",
      hiddenNodeIds: ["node:1"],
      hiddenEdgeIds: [],
      manualNodes: [],
      manualEdges: [],
    });

    const loaded = await loadOverrides(tmpDir);
    expect(loaded.hiddenNodeIds).toEqual(["node:1"]);
  });

  it("appends hidden nodes without duplicating", async () => {
    await hideNodeInWorkspace(tmpDir, "node:A");
    await hideNodeInWorkspace(tmpDir, "node:A");
    await hideNodeInWorkspace(tmpDir, "node:B");

    const loaded = await loadOverrides(tmpDir);
    expect(loaded.hiddenNodeIds).toEqual(["node:A", "node:B"]);
  });
});
