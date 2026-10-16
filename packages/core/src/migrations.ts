import { ArchitectureGraph, CURRENT_SCHEMA_VERSION, validateGraph } from "./schema.js";

export type MigrationStep = (data: Record<string, unknown>) => Record<string, unknown>;

export const MIGRATIONS: Record<string, MigrationStep> = {
  // Version migrations will be registered here as new versions are introduced.
  // e.g. "0.0.9": (data) => ({ ...data, schemaVersion: "0.1.0" })
};

/**
 * Migrates any raw graph payload to the current schema version and validates it.
 */
export function migrateGraph(raw: unknown): ArchitectureGraph {
  if (!raw || typeof raw !== "object") {
    return validateGraph(raw);
  }

  let current = { ...(raw as Record<string, unknown>) };
  const currentVersion = typeof current.schemaVersion === "string" ? current.schemaVersion : "";

  // If already matches current schema version, validate directly
  if (currentVersion === CURRENT_SCHEMA_VERSION) {
    return validateGraph(current);
  }

  // Sequentially apply migrations if older version detected
  if (currentVersion in MIGRATIONS) {
    const migrator = MIGRATIONS[currentVersion];
    if (migrator) {
      current = migrator(current);
    }
  }

  return validateGraph(current);
}
