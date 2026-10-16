import { createHash } from "node:crypto";
import type { EdgeKind, NodeType } from "./schema.js";

export function normalizeFilePath(filePath: string): string {
  return filePath.replace(/\\/g, "/").replace(/^\.\//, "").trim();
}

/**
 * Derives a deterministic, stable ID for a graph node based on:
 * - type
 * - normalized file path
 * - symbol or route identifier
 */
export function createNodeId(type: NodeType, filePath: string, symbolName: string): string {
  const normalizedPath = normalizeFilePath(filePath);
  const normalizedSymbol = symbolName.trim();
  const rawKey = `${type}:${normalizedPath}:${normalizedSymbol}`;
  const hash = createHash("sha256").update(rawKey).digest("hex").slice(0, 16);
  return `${type}_${hash}`;
}

/**
 * Derives a deterministic, stable ID for a graph edge based on:
 * - kind
 * - source node ID
 * - target node ID
 * - optional symbol / context discriminator
 */
export function createEdgeId(
  kind: EdgeKind,
  fromId: string,
  toId: string,
  discriminator: string = "",
): string {
  const rawKey = `${kind}:${fromId}->${toId}:${discriminator.trim()}`;
  const hash = createHash("sha256").update(rawKey).digest("hex").slice(0, 16);
  return `edge_${hash}`;
}
