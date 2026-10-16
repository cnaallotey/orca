import type { ArchitectureGraph, ArchitectureNode } from "@arch-viz/core";

export type WebviewToExtensionMessage =
  | {
      type: "nodeSelected";
      node: ArchitectureNode;
    }
  | {
      type: "hideNode";
      nodeId: string;
    }
  | {
      type: "unhideNode";
      nodeId: string;
    }
  | {
      type: "exportJson";
    };

export type ExtensionToWebviewMessage = {
  type: "updateGraph";
  graph: ArchitectureGraph;
};

export type MessageProtocol = WebviewToExtensionMessage | ExtensionToWebviewMessage;
