import path from "node:path";
import { createEdgeId, createNodeId } from "@arch-viz/core";
import type { ArchitectureEdge, ArchitectureNode } from "@arch-viz/core";
import type { Detector, DetectorContext, DetectorResult } from "../types.js";

interface CallOccurrence {
  client: string;
  url: string;
  line: number;
}

export class HttpClientDetector implements Detector {
  public readonly name = "http-client";

  public async detect(context: DetectorContext): Promise<DetectorResult> {
    const nodes: ArchitectureNode[] = [];
    const edges: ArchitectureEdge[] = [];
    const externalApiMap = new Map<string, ArchitectureNode>();

    const targetExtensions = new Set([".vue", ".ts", ".js", ".tsx", ".jsx", ".mjs"]);
    const relevantFiles = context.files.filter((f) =>
      targetExtensions.has(path.extname(f).toLowerCase()),
    );

    const knownNodes = context.knownNodes ?? [];

    for (const file of relevantFiles) {
      let content = "";
      try {
        content = await context.getFileContent(file);
      } catch {
        continue;
      }

      const calls = this.extractHttpCalls(content);
      if (calls.length === 0) continue;

      // Find or create caller node
      let callerNode = knownNodes.find(
        (n) => n.source.file.replace(/\\/g, "/") === file.replace(/\\/g, "/"),
      );

      if (!callerNode) {
        // Create a module node for utilities/composables
        const baseName = path.basename(file);
        const callerId = createNodeId("module", file, "module");
        callerNode = {
          id: callerId,
          type: "module",
          label: baseName,
          source: { file, line: 1 },
          origin: "detected",
          meta: { kind: "caller-module" },
        };
        nodes.push(callerNode);
      }

      for (const call of calls) {
        const rawUrl = call.url.trim();
        const cleanUrl = rawUrl.split("?")[0]!.split("#")[0]!;

        const isExternal = cleanUrl.startsWith("http://") || cleanUrl.startsWith("https://");

        if (isExternal) {
          let hostname = "external-api";
          try {
            hostname = new URL(cleanUrl).hostname;
          } catch {
            hostname = cleanUrl.replace(/^https?:\/\//, "").split("/")[0] ?? "external-api";
          }

          let extNode = externalApiMap.get(hostname);
          if (!extNode) {
            const extId = createNodeId("externalApi", hostname, hostname);
            extNode = {
              id: extId,
              type: "externalApi",
              label: hostname,
              source: { file, line: call.line },
              origin: "detected",
              meta: {
                host: hostname,
                sampleUrl: cleanUrl,
              },
            };
            externalApiMap.set(hostname, extNode);
            nodes.push(extNode);
          }

          const edgeId = createEdgeId("calls", callerNode.id, extNode.id);
          if (!edges.some((e) => e.id === edgeId)) {
            edges.push({
              id: edgeId,
              from: callerNode.id,
              to: extNode.id,
              kind: "calls",
              origin: "detected",
              confidence: 0.9,
            });
          }
        } else if (cleanUrl.startsWith("/")) {
          // Internal route call
          const matchedRoute = this.resolveInternalRoute(cleanUrl, knownNodes);

          if (matchedRoute) {
            const edgeId = createEdgeId("calls", callerNode.id, matchedRoute.id);
            if (!edges.some((e) => e.id === edgeId)) {
              edges.push({
                id: edgeId,
                from: callerNode.id,
                to: matchedRoute.id,
                kind: "calls",
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

  private extractHttpCalls(content: string): CallOccurrence[] {
    const occurrences: CallOccurrence[] = [];
    const lines = content.split(/\r?\n/);

    const callRegex =
      /(?:(\$fetch|useFetch|fetch)\s*(?:<[^>]+>)?\s*\(\s*(['"`])([^'"`]+)\2|axios(?:\.(?:get|post|put|delete|patch))?\s*(?:<[^>]+>)?\s*\(\s*(['"`])([^'"`]+)\4)/g;

    for (let lineIndex = 0; lineIndex < lines.length; lineIndex++) {
      const lineText = lines[lineIndex] ?? "";
      let match: RegExpExecArray | null;
      while ((match = callRegex.exec(lineText)) !== null) {
        const client = match[1] ?? "axios";
        const url = match[3] ?? match[5];
        if (url) {
          occurrences.push({
            client,
            url,
            line: lineIndex + 1,
          });
        }
      }
    }

    return occurrences;
  }

  private resolveInternalRoute(
    url: string,
    knownNodes: ArchitectureNode[],
  ): ArchitectureNode | undefined {
    // 1. Exact match on meta.path or meta.route
    const exact = knownNodes.find(
      (n) => n.type === "route" && (n.meta?.path === url || n.meta?.route === url),
    );
    if (exact) return exact;

    // 2. Exact match on label
    const labelMatch = knownNodes.find((n) => n.type === "route" && n.label === url);
    if (labelMatch) return labelMatch;

    // 3. Match parameterized route (e.g., /api/users/123 -> /api/users/:id)
    const paramMatch = knownNodes.find((n) => {
      if (n.type !== "route") return false;
      const routePattern = (n.meta?.path ?? n.meta?.route) as string | undefined;
      if (!routePattern || (!routePattern.includes(":") && !routePattern.includes("*")))
        return false;

      const regexPattern =
        "^" +
        routePattern.replace(/:[a-zA-Z0-9_]+/g, "[^/]+").replace(/\*[a-zA-Z0-9_]+/g, ".*") +
        "$";
      return new RegExp(regexPattern).test(url);
    });

    return paramMatch;
  }
}
