import fs from "node:fs/promises";
import path from "node:path";
import { CURRENT_SCHEMA_VERSION, validateOverrides, type WorkspaceOverrides } from "@arch-viz/core";

export function getOverridesPath(workspaceRoot: string): string {
  return path.join(workspaceRoot, ".architecture", "overrides.json");
}

export async function loadOverrides(workspaceRoot: string): Promise<WorkspaceOverrides> {
  const filePath = getOverridesPath(workspaceRoot);
  try {
    const raw = await fs.readFile(filePath, "utf-8");
    const parsed = JSON.parse(raw);
    return validateOverrides(parsed);
  } catch {
    return {
      schemaVersion: CURRENT_SCHEMA_VERSION,
      hiddenNodeIds: [],
      hiddenEdgeIds: [],
      manualNodes: [],
      manualEdges: [],
    };
  }
}

export async function saveOverrides(
  workspaceRoot: string,
  overrides: WorkspaceOverrides,
): Promise<void> {
  const filePath = getOverridesPath(workspaceRoot);
  const dir = path.dirname(filePath);
  await fs.mkdir(dir, { recursive: true });
  await fs.writeFile(filePath, JSON.stringify(overrides, null, 2), "utf-8");
}

export async function hideNodeInWorkspace(
  workspaceRoot: string,
  nodeId: string,
): Promise<WorkspaceOverrides> {
  const current = await loadOverrides(workspaceRoot);
  if (!current.hiddenNodeIds.includes(nodeId)) {
    current.hiddenNodeIds.push(nodeId);
  }
  await saveOverrides(workspaceRoot, current);
  return current;
}
