import path from "node:path";
import { createEdgeId, createNodeId } from "@arch-viz/core";
import type { ArchitectureEdge, ArchitectureNode } from "@arch-viz/core";
import type { Detector, DetectorContext, DetectorResult } from "../types.js";

export class EnvDetector implements Detector {
  public readonly name = "env";

  public async detect(context: DetectorContext): Promise<DetectorResult> {
    const nodes: ArchitectureNode[] = [];
    const edges: ArchitectureEdge[] = [];
    const envNodesMap = new Map<string, ArchitectureNode>();

    // 1. Scan .env and .env.example
    const envFiles = context.files.filter((f) => {
      const base = path.basename(f);
      return base === ".env.example" || base === ".env" || base === ".env.template";
    });

    for (const file of envFiles) {
      let content = "";
      try {
        content = await context.getFileContent(file);
      } catch {
        continue;
      }

      const lines = content.split(/\r?\n/);
      for (let i = 0; i < lines.length; i++) {
        const line = lines[i]?.trim() ?? "";
        if (!line || line.startsWith("#")) continue;

        const eqIdx = line.indexOf("=");
        if (eqIdx !== -1) {
          const varName = line.slice(0, eqIdx).trim();
          if (varName && !envNodesMap.has(varName)) {
            const envId = createNodeId("env", file, varName);
            const envNode: ArchitectureNode = {
              id: envId,
              type: "env",
              label: varName,
              source: { file, line: i + 1 },
              origin: "detected",
              meta: { varName, definedIn: file },
            };
            nodes.push(envNode);
            envNodesMap.set(varName, envNode);
          }
        }
      }
    }

    // 2. Scan code files for process.env.VAR usage
    const targetExtensions = new Set([".vue", ".ts", ".js", ".tsx", ".jsx", ".mjs"]);
    const codeFiles = context.files.filter((f) =>
      targetExtensions.has(path.extname(f).toLowerCase()),
    );

    const knownNodes = context.knownNodes ?? [];
    const envUsageRegex = /process\.env\.([A-Z0-9_]+)/g;

    for (const file of codeFiles) {
      let content = "";
      try {
        content = await context.getFileContent(file);
      } catch {
        continue;
      }

      if (!content.includes("process.env")) continue;

      const callerNode = knownNodes.find(
        (n) => n.source.file.replace(/\\/g, "/") === file.replace(/\\/g, "/"),
      );

      if (!callerNode) continue;

      const lines = content.split(/\r?\n/);
      for (let lineIndex = 0; lineIndex < lines.length; lineIndex++) {
        const lineText = lines[lineIndex] ?? "";
        let match: RegExpExecArray | null;
        envUsageRegex.lastIndex = 0;

        while ((match = envUsageRegex.exec(lineText)) !== null) {
          const varName = match[1];
          if (!varName) continue;

          let envNode = envNodesMap.get(varName);
          if (!envNode) {
            const envId = createNodeId("env", file, varName);
            envNode = {
              id: envId,
              type: "env",
              label: varName,
              source: { file, line: lineIndex + 1 },
              origin: "detected",
              meta: { varName, referencedIn: file },
            };
            nodes.push(envNode);
            envNodesMap.set(varName, envNode);
          }

          const edgeId = createEdgeId("reads", callerNode.id, envNode.id);
          if (!edges.some((e) => e.id === edgeId)) {
            edges.push({
              id: edgeId,
              from: callerNode.id,
              to: envNode.id,
              kind: "reads",
              origin: "detected",
              confidence: 1.0,
            });
          }
        }
      }
    }

    return { nodes, edges };
  }
}
