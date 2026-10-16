import { randomBytes } from "node:crypto";
import * as vscode from "vscode";
import type { ArchitectureGraph } from "@arch-viz/core";
import { getWebviewHtml } from "@arch-viz/viewer";
import type { WebviewToExtensionMessage } from "./messages.js";
import { jumpToSourceLine } from "./navigator.js";
import { hideNodeInWorkspace } from "./overridesManager.js";

export class ArchitectureWebviewManager {
  private static currentPanel: vscode.WebviewPanel | undefined;
  private static activeGraph: ArchitectureGraph | undefined;

  public static getCurrentGraph(): ArchitectureGraph | undefined {
    return ArchitectureWebviewManager.activeGraph;
  }

  public static hasPanel(): boolean {
    return ArchitectureWebviewManager.currentPanel !== undefined;
  }

  public static show(
    extensionUri: vscode.Uri,
    workspaceRoot: string,
    graph: ArchitectureGraph,
  ): vscode.WebviewPanel {
    ArchitectureWebviewManager.activeGraph = graph;
    const column = vscode.window.activeTextEditor
      ? vscode.ViewColumn.Beside
      : vscode.ViewColumn.One;

    if (ArchitectureWebviewManager.currentPanel) {
      ArchitectureWebviewManager.currentPanel.reveal(column);
      ArchitectureWebviewManager.currentPanel.webview.postMessage({
        type: "updateGraph",
        graph,
      });
      return ArchitectureWebviewManager.currentPanel;
    }

    const panel = vscode.window.createWebviewPanel(
      "architectureGraph",
      `Architecture: ${graph.project.name}`,
      column,
      {
        enableScripts: true,
        retainContextWhenHidden: true,
        localResourceRoots: [
          vscode.Uri.joinPath(extensionUri, "media"),
          vscode.Uri.joinPath(extensionUri, "dist"),
        ],
      },
    );

    ArchitectureWebviewManager.currentPanel = panel;

    const cytoscapeUri = panel.webview.asWebviewUri(
      vscode.Uri.joinPath(extensionUri, "media", "cytoscape.min.js"),
    );
    const nonce = randomBytes(16).toString("base64");

    panel.webview.html = getWebviewHtml({
      graph,
      cspSource: panel.webview.cspSource,
      nonce,
      cytoscapeScriptUri: cytoscapeUri.toString(),
    });

    panel.webview.onDidReceiveMessage(async (message: WebviewToExtensionMessage) => {
      if (message.type === "nodeSelected" && message.node) {
        const { file, line } = message.node.source;
        await jumpToSourceLine(workspaceRoot, file, line);
      } else if (message.type === "hideNode" && message.nodeId) {
        await hideNodeInWorkspace(workspaceRoot, message.nodeId);
        if (ArchitectureWebviewManager.activeGraph) {
          const currentHidden = new Set(
            ArchitectureWebviewManager.activeGraph.overrides.hiddenNodeIds,
          );
          currentHidden.add(message.nodeId);
          ArchitectureWebviewManager.activeGraph.overrides.hiddenNodeIds =
            Array.from(currentHidden);
        }
        vscode.window.showInformationMessage(
          `Node hidden. Preference saved to .architecture/overrides.json`,
        );
      } else if (message.type === "exportJson") {
        await vscode.commands.executeCommand("architecture.exportJson");
      }
    }, undefined);

    panel.onDidDispose(() => {
      ArchitectureWebviewManager.currentPanel = undefined;
    });

    return panel;
  }
}
