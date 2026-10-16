import { describe, expect, it } from "vitest";
import * as vscode from "vscode";
import type { ArchitectureNode } from "@arch-viz/core";
import { activate, deactivate } from "./extension.js";
import type { WebviewToExtensionMessage } from "./messages.js";

describe("VS Code Extension", () => {
  it("defines typed message protocol for node selection, hideNode, and exportJson", () => {
    const mockNode: ArchitectureNode = {
      id: "route_test",
      type: "route",
      label: "/api/test",
      source: { file: "server/api/test.ts", line: 5 },
      origin: "detected",
      meta: {},
    };

    const nodeMessage: WebviewToExtensionMessage = {
      type: "nodeSelected",
      node: mockNode,
    };
    expect(nodeMessage.type).toBe("nodeSelected");
    expect(nodeMessage.node.source.file).toBe("server/api/test.ts");

    const hideMessage: WebviewToExtensionMessage = {
      type: "hideNode",
      nodeId: "route_test",
    };
    expect(hideMessage.type).toBe("hideNode");

    const exportMessage: WebviewToExtensionMessage = {
      type: "exportJson",
    };
    expect(exportMessage.type).toBe("exportJson");
  });

  it("registers scanWorkspace, openGraph, and exportJson commands on activate", () => {
    const subscriptions: unknown[] = [];
    const mockContext = {
      subscriptions,
      extensionUri: { fsPath: "/mock/extension" },
      extensionPath: "/mock/extension",
    };

    activate(mockContext as never);

    expect(vscode.commands.registerCommand).toHaveBeenCalledWith(
      "architecture.scanWorkspace",
      expect.any(Function),
    );
    expect(vscode.commands.registerCommand).toHaveBeenCalledWith(
      "architecture.openGraph",
      expect.any(Function),
    );
    expect(vscode.commands.registerCommand).toHaveBeenCalledWith(
      "architecture.exportJson",
      expect.any(Function),
    );
    expect(subscriptions.length).toBe(4);

    expect(() => deactivate()).not.toThrow();
  });
});
