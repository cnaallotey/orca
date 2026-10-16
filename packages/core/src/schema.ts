import { z } from "zod";

export const CURRENT_SCHEMA_VERSION = "0.1.0";

export const NodeTypeSchema = z.enum([
  "service",
  "route",
  "module",
  "database",
  "queue",
  "cache",
  "externalApi",
  "job",
  "env",
]);
export type NodeType = z.infer<typeof NodeTypeSchema>;

export const EdgeKindSchema = z.enum([
  "calls",
  "reads",
  "writes",
  "publishes",
  "subscribes",
  "imports",
]);
export type EdgeKind = z.infer<typeof EdgeKindSchema>;

export const OriginSchema = z.enum(["detected", "ai", "manual"]);
export type Origin = z.infer<typeof OriginSchema>;

export const NodeSimSchema = z.object({
  latencyMs: z
    .object({
      p50: z.number().nonnegative(),
      p95: z.number().nonnegative(),
    })
    .default({ p50: 0, p95: 0 }),
  capacityRps: z.number().nonnegative().default(0),
  concurrencyLimit: z.number().nonnegative().default(0),
  failureRate: z.number().min(0).max(1).default(0),
  costPerCall: z.number().nonnegative().default(0),
});
export type NodeSim = z.infer<typeof NodeSimSchema>;

export const NodeSourceSchema = z.object({
  file: z.string().min(1, "File path is required"),
  line: z.number().int().min(1, "Line number must be >= 1"),
});
export type NodeSource = z.infer<typeof NodeSourceSchema>;

export const NodeSchema = z.object({
  id: z.string().min(1, "Node id cannot be empty"),
  type: NodeTypeSchema,
  label: z.string().min(1, "Label cannot be empty"),
  source: NodeSourceSchema,
  origin: OriginSchema,
  meta: z.record(z.string(), z.unknown()).default({}),
  sim: NodeSimSchema.optional(),
});
export type ArchitectureNode = z.infer<typeof NodeSchema>;

export const EdgeSimSchema = z.object({
  callRatio: z.number().min(0).default(1.0),
  timeoutMs: z.number().nonnegative().default(0),
  retries: z.number().int().nonnegative().default(0),
});
export type EdgeSim = z.infer<typeof EdgeSimSchema>;

export const EdgeSchema = z.object({
  id: z.string().min(1, "Edge id cannot be empty"),
  from: z.string().min(1, "from nodeId cannot be empty"),
  to: z.string().min(1, "to nodeId cannot be empty"),
  kind: EdgeKindSchema,
  origin: OriginSchema,
  confidence: z.number().min(0).max(1).default(1.0),
  sim: EdgeSimSchema.optional(),
});
export type ArchitectureEdge = z.infer<typeof EdgeSchema>;

export const OverridesSchema = z.object({
  hiddenNodeIds: z.array(z.string()).default([]),
  hiddenEdgeIds: z.array(z.string()).default([]),
});
export type Overrides = z.infer<typeof OverridesSchema>;

export const ProjectMetaSchema = z.object({
  name: z.string().min(1, "Project name is required"),
  commit: z.string().default("HEAD"),
  generatedAt: z.string().datetime({ message: "generatedAt must be an ISO 8601 string" }),
});
export type ProjectMeta = z.infer<typeof ProjectMetaSchema>;

export const ArchitectureGraphSchema = z
  .object({
    schemaVersion: z.literal(CURRENT_SCHEMA_VERSION, {
      errorMap: () => ({ message: `schemaVersion must be "${CURRENT_SCHEMA_VERSION}"` }),
    }),
    project: ProjectMetaSchema,
    nodes: z.array(NodeSchema).default([]),
    edges: z.array(EdgeSchema).default([]),
    overrides: OverridesSchema.default({ hiddenNodeIds: [], hiddenEdgeIds: [] }),
  })
  .superRefine((graph, ctx) => {
    // 1. Check for duplicate node IDs
    const nodeIds = new Set<string>();
    for (let i = 0; i < graph.nodes.length; i++) {
      const node = graph.nodes[i];
      if (!node) continue;
      if (nodeIds.has(node.id)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: `Duplicate node ID "${node.id}" detected`,
          path: ["nodes", i, "id"],
        });
      } else {
        nodeIds.add(node.id);
      }
    }

    // 2. Check for duplicate edge IDs
    const edgeIds = new Set<string>();
    for (let i = 0; i < graph.edges.length; i++) {
      const edge = graph.edges[i];
      if (!edge) continue;
      if (edgeIds.has(edge.id)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: `Duplicate edge ID "${edge.id}" detected`,
          path: ["edges", i, "id"],
        });
      } else {
        edgeIds.add(edge.id);
      }

      // 3. Check for missing endpoints
      if (!nodeIds.has(edge.from)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: `Edge "${edge.id}" references nonexistent source node "${edge.from}"`,
          path: ["edges", i, "from"],
        });
      }
      if (!nodeIds.has(edge.to)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: `Edge "${edge.id}" references nonexistent target node "${edge.to}"`,
          path: ["edges", i, "to"],
        });
      }
    }
  });

export type ArchitectureGraph = z.infer<typeof ArchitectureGraphSchema>;

export interface ValidationErrorDetail {
  path: string;
  message: string;
}

export class ArchitectureGraphValidationError extends Error {
  public readonly errors: ValidationErrorDetail[];

  constructor(errors: ValidationErrorDetail[]) {
    const formatted = errors.map((e) => `${e.path}: ${e.message}`).join("; ");
    super(`Graph validation failed: ${formatted}`);
    this.name = "ArchitectureGraphValidationError";
    this.errors = errors;
  }
}

export function validateGraph(data: unknown): ArchitectureGraph {
  const result = ArchitectureGraphSchema.safeParse(data);
  if (!result.success) {
    const errorDetails: ValidationErrorDetail[] = result.error.issues.map((issue) => ({
      path: issue.path.join(".") || "root",
      message: issue.message,
    }));
    throw new ArchitectureGraphValidationError(errorDetails);
  }
  return result.data;
}

export function safeValidateGraph(
  data: unknown,
):
  { success: true; data: ArchitectureGraph } | { success: false; errors: ValidationErrorDetail[] } {
  const result = ArchitectureGraphSchema.safeParse(data);
  if (!result.success) {
    const errors: ValidationErrorDetail[] = result.error.issues.map((issue) => ({
      path: issue.path.join(".") || "root",
      message: issue.message,
    }));
    return { success: false, errors };
  }
  return { success: true, data: result.data };
}
