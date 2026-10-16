import fs from "node:fs/promises";
import path from "node:path";
import * as vscode from "vscode";
import { scanWorkspace } from "@arch-viz/analyzer";
import { applyWorkspaceOverrides, validateGraph, type ArchitectureGraph } from "@arch-viz/core";
import { loadOverrides } from "./overridesManager.js";
import { ArchitectureWebviewManager } from "./webviewPanel.js";

function getCachedGraphPath(workspaceRoot: string): string {
  return path.join(workspaceRoot, ".architecture", "graph.json");
}

async function loadCachedGraph(workspaceRoot: string): Promise<ArchitectureGraph | undefined> {
  try {
    const raw = await fs.readFile(getCachedGraphPath(workspaceRoot), "utf-8");
    return validateGraph(JSON.parse(raw));
  } catch {
    return undefined;
  }
}

async function saveCachedGraph(workspaceRoot: string, graph: ArchitectureGraph): Promise<void> {
  try {
    const dir = path.join(workspaceRoot, ".architecture");
    await fs.mkdir(dir, { recursive: true });
    await fs.writeFile(getCachedGraphPath(workspaceRoot), JSON.stringify(graph, null, 2), "utf-8");
  } catch {
    // Non-critical cache write error
  }
}

export function activate(context: vscode.ExtensionContext): void {
  const getWorkspaceInfo = (): { root: string; name: string } | null => {
    const folders = vscode.workspace.workspaceFolders;
    if (!folders || folders.length === 0) return null;
    return {
      root: folders[0]!.uri.fsPath,
      name: folders[0]!.name,
    };
  };

  // 1. Command: Architecture: Scan Workspace
  const scanCommand = vscode.commands.registerCommand("architecture.scanWorkspace", async () => {
    const ws = getWorkspaceInfo();
    if (!ws) {
      vscode.window.showWarningMessage(
        "Architecture Visualizer: No workspace folder is currently open.",
      );
      return;
    }

    await vscode.window.withProgress(
      {
        location: vscode.ProgressLocation.Notification,
        title: "Architecture Visualizer",
        cancellable: false,
      },
      async (progress) => {
        progress.report({ message: "Scanning workspace architecture..." });

        try {
          const wasmsDir = path.join(context.extensionPath, "dist", "wasms");
          const freshGraph = await scanWorkspace({
            workspaceRoot: ws.root,
            projectName: ws.name,
            wasmsDir,
          });

          // Apply persistent workspace overrides
          const overrides = await loadOverrides(ws.root);
          const finalGraph = applyWorkspaceOverrides(freshGraph, overrides);

          // Cache graph for quick opening
          await saveCachedGraph(ws.root, finalGraph);

          ArchitectureWebviewManager.show(context.extensionUri, ws.root, finalGraph);

          vscode.window.showInformationMessage(
            `Architecture scan complete: Found ${finalGraph.nodes.length} nodes and ${finalGraph.edges.length} edges.`,
          );
        } catch (error) {
          vscode.window.showErrorMessage(
            `Architecture scan failed: ${error instanceof Error ? error.message : String(error)}`,
          );
        }
      },
    );
  });

  // 2. Command: Architecture: Open Graph
  const openGraphCommand = vscode.commands.registerCommand("architecture.openGraph", async () => {
    const ws = getWorkspaceInfo();
    if (!ws) {
      vscode.window.showWarningMessage("Architecture Visualizer: No workspace folder is open.");
      return;
    }

    const currentGraph =
      ArchitectureWebviewManager.getCurrentGraph() ?? (await loadCachedGraph(ws.root));

    if (currentGraph) {
      ArchitectureWebviewManager.show(context.extensionUri, ws.root, currentGraph);
    } else {
      await vscode.commands.executeCommand("architecture.scanWorkspace");
    }
  });

  // 3. Command: Architecture: Export JSON
  const exportJsonCommand = vscode.commands.registerCommand("architecture.exportJson", async () => {
    const ws = getWorkspaceInfo();
    if (!ws) {
      vscode.window.showWarningMessage("Architecture Visualizer: No workspace folder is open.");
      return;
    }

    const graph = ArchitectureWebviewManager.getCurrentGraph() ?? (await loadCachedGraph(ws.root));

    if (!graph) {
      vscode.window.showWarningMessage(
        "Architecture Visualizer: No graph to export. Please run Scan Workspace first.",
      );
      return;
    }

    const defaultUri = vscode.Uri.file(path.join(ws.root, "architecture-graph.json"));
    const saveUri = await vscode.window.showSaveDialog({
      defaultUri,
      filters: { "JSON Files": ["json"] },
      title: "Export Architecture Graph JSON",
    });

    if (saveUri) {
      const jsonContent = JSON.stringify(graph, null, 2);
      await vscode.workspace.fs.writeFile(saveUri, Buffer.from(jsonContent, "utf-8"));
      vscode.window.showInformationMessage(
        `Architecture graph exported successfully to ${path.basename(saveUri.fsPath)}!`,
      );
    }
  });

  // 4. Debounced Watcher on File Save
  let debounceTimer: NodeJS.Timeout | undefined;
  const saveWatcher = vscode.workspace.onDidSaveTextDocument((doc) => {
    const ext = path.extname(doc.fileName).toLowerCase();
    if (![".vue", ".ts", ".js", ".prisma"].includes(ext)) return;
    if (!ArchitectureWebviewManager.hasPanel()) return;

    if (debounceTimer) clearTimeout(debounceTimer);
    debounceTimer = setTimeout(async () => {
      await vscode.commands.executeCommand("architecture.scanWorkspace");
    }, 1200);
  });

  context.subscriptions.push(scanCommand, openGraphCommand, exportJsonCommand, saveWatcher);
}

export function deactivate(): void {
  // Clean up resources if necessary
}
