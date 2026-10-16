import { createNodeId } from "@arch-viz/core";
import type { ArchitectureNode } from "@arch-viz/core";
import type { Detector, DetectorContext, DetectorResult } from "../types.js";

const HTTP_METHODS = ["get", "post", "put", "delete", "patch", "head", "options"] as const;

export function extractMethodAndBaseName(fileNameWithoutExt: string): {
  baseName: string;
  method: string;
} {
  for (const m of HTTP_METHODS) {
    if (fileNameWithoutExt.endsWith(`.${m}`)) {
      return {
        baseName: fileNameWithoutExt.slice(0, -(m.length + 1)),
        method: m.toUpperCase(),
      };
    }
  }
  return { baseName: fileNameWithoutExt, method: "ALL" };
}

export function convertNuxtParamToRouteParam(segment: string): string {
  // [...slug] -> *slug
  if (segment.startsWith("[...") && segment.endsWith("]")) {
    return `*${segment.slice(4, -1)}`;
  }
  // [[optional]] -> :optional?
  if (segment.startsWith("[[") && segment.endsWith("]]")) {
    return `:${segment.slice(2, -2)}?`;
  }
  // [id] -> :id
  if (segment.startsWith("[") && segment.endsWith("]")) {
    return `:${segment.slice(1, -1)}`;
  }
  return segment;
}

export function formatRoutePath(segments: string[]): string {
  const converted = segments.map(convertNuxtParamToRouteParam);
  // remove trailing 'index'
  if (converted.length > 0 && converted[converted.length - 1] === "index") {
    converted.pop();
  }
  const joined = converted.join("/");
  return joined ? `/${joined}` : "/";
}

export class NuxtRoutesDetector implements Detector {
  public readonly name = "nuxt-routes";

  public async detect(context: DetectorContext): Promise<DetectorResult> {
    const nodes: ArchitectureNode[] = [];

    for (const rawFile of context.files) {
      const file = rawFile.replace(/\\/g, "/").replace(/^\.\//, "");

      // 1. Pages detector: pages/**
      if (file.startsWith("pages/")) {
        const afterPages = file.slice("pages/".length);
        const dotIdx = afterPages.lastIndexOf(".");
        if (dotIdx === -1) continue;

        const pathWithoutExt = afterPages.slice(0, dotIdx);
        const segments = pathWithoutExt.split("/");
        const routePath = formatRoutePath(segments);

        // Find line number
        let targetLine = 1;
        try {
          const content = await context.getFileContent(rawFile);
          const parsed = await context.parseFile(rawFile, content);
          if (parsed?.findFirstLineOf) {
            targetLine =
              parsed.findFirstLineOf("<script") ?? parsed.findFirstLineOf("<template") ?? 1;
          }
        } catch {
          targetLine = 1;
        }

        const nodeId = createNodeId("route", file, routePath);
        nodes.push({
          id: nodeId,
          type: "route",
          label: routePath,
          source: { file, line: targetLine },
          origin: "detected",
          meta: {
            routeType: "page",
            method: "GET",
            path: routePath,
          },
        });
        continue;
      }

      // 2. Server API routes: server/api/**
      if (file.startsWith("server/api/")) {
        const afterApi = file.slice("server/api/".length);
        const dotIdx = afterApi.lastIndexOf(".");
        if (dotIdx === -1) continue;

        const pathWithoutExt = afterApi.slice(0, dotIdx);
        const { baseName, method } = extractMethodAndBaseName(pathWithoutExt);
        const segments = baseName.split("/");
        const subPath = formatRoutePath(segments);
        const routePath = subPath === "/" ? "/api" : `/api${subPath}`;

        let targetLine = 1;
        try {
          const content = await context.getFileContent(rawFile);
          const parsed = await context.parseFile(rawFile, content);
          if (parsed?.findFirstLineOf) {
            targetLine =
              parsed.findFirstLineOf("defineEventHandler") ??
              parsed.findFirstLineOf("eventHandler") ??
              parsed.findFirstLineOf("export default") ??
              1;
          }
        } catch {
          targetLine = 1;
        }

        const symbolKey = `${method}:${routePath}`;
        const nodeId = createNodeId("route", file, symbolKey);
        const label = method === "ALL" ? routePath : `${method} ${routePath}`;

        nodes.push({
          id: nodeId,
          type: "route",
          label,
          source: { file, line: targetLine },
          origin: "detected",
          meta: {
            routeType: "serverApi",
            method,
            path: routePath,
          },
        });
        continue;
      }

      // 3. Server general routes: server/routes/**
      if (file.startsWith("server/routes/")) {
        const afterRoutes = file.slice("server/routes/".length);
        const dotIdx = afterRoutes.lastIndexOf(".");
        if (dotIdx === -1) continue;

        const pathWithoutExt = afterRoutes.slice(0, dotIdx);
        const { baseName, method } = extractMethodAndBaseName(pathWithoutExt);
        const segments = baseName.split("/");
        const routePath = formatRoutePath(segments);

        let targetLine = 1;
        try {
          const content = await context.getFileContent(rawFile);
          const parsed = await context.parseFile(rawFile, content);
          if (parsed?.findFirstLineOf) {
            targetLine =
              parsed.findFirstLineOf("defineEventHandler") ??
              parsed.findFirstLineOf("eventHandler") ??
              parsed.findFirstLineOf("export default") ??
              1;
          }
        } catch {
          targetLine = 1;
        }

        const symbolKey = `${method}:${routePath}`;
        const nodeId = createNodeId("route", file, symbolKey);
        const label = method === "ALL" ? routePath : `${method} ${routePath}`;

        nodes.push({
          id: nodeId,
          type: "route",
          label,
          source: { file, line: targetLine },
          origin: "detected",
          meta: {
            routeType: "serverRoute",
            method,
            path: routePath,
          },
        });
        continue;
      }

      // 4. Middleware: middleware/**
      if (file.startsWith("middleware/")) {
        const afterMiddleware = file.slice("middleware/".length);
        const dotIdx = afterMiddleware.indexOf(".");
        const middlewareName = dotIdx === -1 ? afterMiddleware : afterMiddleware.slice(0, dotIdx);

        let targetLine = 1;
        try {
          const content = await context.getFileContent(rawFile);
          const parsed = await context.parseFile(rawFile, content);
          if (parsed?.findFirstLineOf) {
            targetLine =
              parsed.findFirstLineOf("defineNuxtRouteMiddleware") ??
              parsed.findFirstLineOf("export default") ??
              1;
          }
        } catch {
          targetLine = 1;
        }

        const nodeId = createNodeId("route", file, `middleware:${middlewareName}`);
        nodes.push({
          id: nodeId,
          type: "route",
          label: `middleware: ${middlewareName}`,
          source: { file, line: targetLine },
          origin: "detected",
          meta: {
            routeType: "middleware",
            name: middlewareName,
          },
        });
      }
    }

    // Sort nodes deterministically by ID
    nodes.sort((a, b) => a.id.localeCompare(b.id));

    return {
      nodes,
      edges: [],
    };
  }
}
