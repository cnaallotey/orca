import path from "node:path";
import { createEdgeId, createNodeId } from "@arch-viz/core";
import type { ArchitectureEdge, ArchitectureNode, EdgeKind } from "@arch-viz/core";
import type { Detector, DetectorContext, DetectorResult } from "../types.js";

export class DataAccessDetector implements Detector {
  public readonly name = "data-access";

  public async detect(context: DetectorContext): Promise<DetectorResult> {
    const nodes: ArchitectureNode[] = [];
    const edges: ArchitectureEdge[] = [];
    const modelNodesMap = new Map<string, ArchitectureNode>();

    // 1. Scan Prisma schema files (e.g., prisma/schema.prisma)
    const prismaFiles = context.files.filter((f) => f.endsWith(".prisma"));

    for (const file of prismaFiles) {
      let content = "";
      try {
        content = await context.getFileContent(file);
      } catch {
        continue;
      }

      const lines = content.split(/\r?\n/);
      let provider = "PostgreSQL";

      for (let i = 0; i < lines.length; i++) {
        const line = lines[i]?.trim() ?? "";
        if (line.startsWith("provider") && line.includes("=")) {
          const rawProvider = line.split("=")[1]?.trim().replace(/['"]/g, "");
          if (rawProvider) {
            provider =
              rawProvider === "postgresql"
                ? "PostgreSQL"
                : rawProvider === "mysql"
                  ? "MySQL"
                  : rawProvider === "sqlite"
                    ? "SQLite"
                    : rawProvider;
          }
        }
      }

      // Root Database node
      const dbId = createNodeId("database", file, "database");
      const dbNode: ArchitectureNode = {
        id: dbId,
        type: "database",
        label: provider,
        source: { file, line: 1 },
        origin: "detected",
        meta: { provider, schemaFile: file },
      };
      nodes.push(dbNode);

      // Model nodes
      for (let i = 0; i < lines.length; i++) {
        const line = lines[i]?.trim() ?? "";
        const modelMatch = /^model\s+([a-zA-Z0-9_]+)\s*\{/.exec(line);
        if (modelMatch && modelMatch[1]) {
          const modelName = modelMatch[1];
          const modelId = createNodeId("database", file, `model:${modelName}`);
          const modelNode: ArchitectureNode = {
            id: modelId,
            type: "database",
            label: `${modelName} Table`,
            source: { file, line: i + 1 },
            origin: "detected",
            meta: { kind: "model", model: modelName, database: provider },
          };
          nodes.push(modelNode);
          modelNodesMap.set(modelName.toLowerCase(), modelNode);

          // Edge from DB to Model table
          const dbToModelEdgeId = createEdgeId("imports", dbNode.id, modelId);
          edges.push({
            id: dbToModelEdgeId,
            from: dbNode.id,
            to: modelId,
            kind: "imports",
            origin: "detected",
            confidence: 1.0,
          });
        }
      }
    }

    // 2. Scan code files for Prisma / Database operations
    const targetExtensions = new Set([".vue", ".ts", ".js", ".tsx", ".jsx", ".mjs"]);
    const codeFiles = context.files.filter((f) =>
      targetExtensions.has(path.extname(f).toLowerCase()),
    );

    const knownNodes = context.knownNodes ?? [];
    const prismaCallRegex =
      /prisma\.([a-zA-Z0-9_]+)\.(findMany|findUnique|findFirst|findRaw|count|aggregate|create|createMany|update|updateMany|delete|deleteMany|upsert)/g;

    for (const file of codeFiles) {
      let content = "";
      try {
        content = await context.getFileContent(file);
      } catch {
        continue;
      }

      let callerNode = knownNodes.find(
        (n) => n.source.file.replace(/\\/g, "/") === file.replace(/\\/g, "/"),
      );

      if (!callerNode && prismaCallRegex.test(content)) {
        callerNode = {
          id: createNodeId("module", file, "module"),
          type: "module",
          label: path.basename(file),
          source: { file, line: 1 },
          origin: "detected",
          meta: { kind: "database-client-caller" },
        };
        nodes.push(callerNode);
      }

      if (!callerNode) continue;

      const lines = content.split(/\r?\n/);
      for (let lineIndex = 0; lineIndex < lines.length; lineIndex++) {
        const lineText = lines[lineIndex] ?? "";
        let match: RegExpExecArray | null;
        prismaCallRegex.lastIndex = 0;

        while ((match = prismaCallRegex.exec(lineText)) !== null) {
          const modelKey = match[1]?.toLowerCase();
          const action = match[2];
          if (!modelKey || !action) continue;

          const targetModel =
            modelNodesMap.get(modelKey) ??
            nodes.find(
              (n) =>
                n.type === "database" &&
                ((n.meta?.model as string)?.toLowerCase() === modelKey ||
                  n.label.toLowerCase().startsWith(modelKey)),
            );

          if (targetModel) {
            const isRead =
              action.startsWith("find") || action === "count" || action === "aggregate";
            const kind: EdgeKind = isRead ? "reads" : "writes";
            const edgeId = createEdgeId(kind, callerNode.id, targetModel.id);

            if (!edges.some((e) => e.id === edgeId)) {
              edges.push({
                id: edgeId,
                from: callerNode.id,
                to: targetModel.id,
                kind,
                origin: "detected",
                confidence: 1.0,
              });
            }
          }
        }
      }
    }

    return { nodes, edges };
  }
}
