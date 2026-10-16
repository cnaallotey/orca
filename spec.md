# Architecture Visualizer: Product Spec

Status: Draft v0.1

## 1. Overview

A VS Code extension that scans a codebase and renders its architecture as an interactive graph. A companion platform stores versions of that graph, lets teams share it, and simulates traffic flowing through the system to expose bottlenecks and failure risks.

The architecture graph is the core product. The extension produces it. The platform stores, diffs and simulates it.

## 2. Goals

- Generate an accurate architecture graph from a repo with zero manual setup.
- Let developers click any node and jump to the code behind it.
- Let teams track how architecture changes over time and across pull requests.
- Let teams simulate load and failure scenarios before they happen in production.

## 3. Non Goals (v1)

- Supporting every language. Launch with one stack.
- Runtime tracing as a requirement. It is an optional enrichment later.
- Replacing full observability tools.
- Editing code from the diagram.

## 4. Target Users

- Developers joining an unfamiliar codebase.
- Tech leads documenting and reviewing system design.
- Engineering teams planning for scale or reliability.

## 5. Launch Stack Scope

TypeScript, Vue, Nuxt and Node. Other stacks (Next, Express variants, Laravel) come after the detector interface is proven.

## 6. System Components

1. **Core library** (`packages/core`): graph schema, merge logic, validation. No VS Code dependencies.
2. **Analyzer** (`packages/analyzer`): scans files and emits graph nodes and edges through pluggable detectors.
3. **VS Code extension** (`apps/extension`): commands, webview, jump to code, auth, push to platform.
4. **Webview UI** (`packages/viewer`): React Flow or Cytoscape graph renderer, shared with the platform.
5. **Platform web app** (`apps/platform`): projects, versions, diffs, sharing, simulation UI.
6. **Platform API** (`apps/api`): auth, graph storage, version history, simulation jobs.
7. **Simulation engine** (`packages/sim`): discrete event simulator, runs in browser or on the server.
8. **GitHub Action** (`apps/action`): regenerates and uploads the graph on merge.

## 7. Graph Schema (the contract)

Version the schema from day one. Every file carries `schemaVersion`.

```json
{
  "schemaVersion": "0.1.0",
  "project": { "name": "string", "commit": "string", "generatedAt": "ISO string" },
  "nodes": [
    {
      "id": "string",
      "type": "service | route | module | database | queue | cache | externalApi | job | env",
      "label": "string",
      "source": { "file": "string", "line": 0 },
      "origin": "detected | ai | manual",
      "meta": {},
      "sim": {
        "latencyMs": { "p50": 0, "p95": 0 },
        "capacityRps": 0,
        "concurrencyLimit": 0,
        "failureRate": 0,
        "costPerCall": 0
      }
    }
  ],
  "edges": [
    {
      "id": "string",
      "from": "nodeId",
      "to": "nodeId",
      "kind": "calls | reads | writes | publishes | subscribes | imports",
      "origin": "detected | ai | manual",
      "confidence": 0.0,
      "sim": { "callRatio": 1.0, "timeoutMs": 0, "retries": 0 }
    }
  ],
  "overrides": { "hiddenNodeIds": [], "hiddenEdgeIds": [] }
}
```

Rules:

- Node and edge IDs must be stable across scans. Derive them from type plus file path plus symbol name.
- Anything with `origin: manual` survives regeneration.
- `sim` is optional. Missing values fall back to defaults per node type.

## 8. Detectors (launch set)

Each detector implements one interface: `detect(context) => { nodes, edges }`.

1. **Nuxt routes**: `pages/`, `server/api/`, `server/routes/`, middleware.
2. **Nitro and Node handlers**: event handlers, Express style routes.
3. **HTTP clients**: `fetch`, `$fetch`, `useFetch`, axios calls, resolved to internal routes or external APIs.
4. **Data access**: Prisma schema and client usage, Drizzle, raw SQL, Postgres connection strings.
5. **Queues and jobs**: BullMQ, cron definitions.
6. **Third party SDKs**: Stripe, Paystack, PostHog, Customer.io and similar, mapped to external API nodes.
7. **Infrastructure**: Dockerfile, docker compose, Terraform, Kubernetes manifests.
8. **Env vars**: map variables to the services they configure.

Parsing uses Tree sitter for TypeScript and Vue single file components. Detectors must be unit tested against fixture repos.

## 9. Optional AI Pass

- Off by default. User opts in per project.
- Sends only ambiguous files or snippets, never the whole repo.
- Output is tagged `origin: ai` with a confidence score and is easy to accept or reject.
- Generates short node descriptions.

## 10. VS Code Extension Requirements

Commands:

1. `Architecture: Scan Workspace`
2. `Architecture: Open Graph`
3. `Architecture: Export JSON`
4. `Architecture: Push to Platform`
5. `Architecture: Sign In`

Webview features:

- Pan, zoom, search, and filter by node type.
- Layers: services, modules, data.
- Click a node to open the source file at the right line.
- Add, edit or hide nodes and edges manually.
- Show stale markers when files changed since the last scan.

Performance targets:

- Scan a 500 file repo in under 15 seconds.
- Render up to 2,000 nodes smoothly using layer collapsing.
- Incremental rescan on file save.

## 11. Platform Requirements

Phase 2:

- Auth with GitHub and email.
- Projects, with graph versions stored per commit.
- Graph diff view showing added, removed and changed nodes and edges.
- GitHub Action to upload the graph on merge and comment a diff on pull requests.
- Shareable and embeddable read only diagrams.
- Auto generated docs from the graph.

## 12. Traffic Simulation (Phase 3)

Model:

- Discrete event simulation over the graph.
- Each node has latency distribution, capacity, concurrency limit, failure rate, cost.
- Each edge has call ratio, timeout and retry policy.

Scenarios:

1. Traffic spike at a chosen multiplier.
2. A node slows down.
3. A node goes down.
4. Retry storm.

Outputs:

- Animated traffic over the graph.
- Bottleneck ranking, p50 and p95 end to end latency, error rate, cascading failure path, estimated cost.

Calibration:

- Import OpenTelemetry traces or logs to fill `sim` values from real data.
- Users can override any value manually.

Execution:

- Small graphs run in the browser in a web worker.
- Large graphs run as server jobs.

## 13. Tech Choices

- Language: TypeScript across the monorepo.
- Monorepo tooling: pnpm workspaces.
- Extension: VS Code Extension API, webview bundled with Vite.
- Platform: Nuxt, PostgreSQL, Tailwind CSS.
- Graph rendering: React Flow or Cytoscape (decide in the first spike).
- Parsing: Tree sitter.

## 14. Milestones

1. **M0, Spike (1 week):** parse a Nuxt repo, emit a hardcoded graph, render it in a webview.
2. **M1, Core MVP (3 to 4 weeks):** schema, five detectors, jump to code, JSON export, manual edits that persist.
3. **M2, Polish (2 weeks):** incremental scans, layers, search, performance work, marketplace release.
4. **M3, Platform (4 to 6 weeks):** auth, push, versions, diffs, GitHub Action, share links.
5. **M4, Simulation (6+ weeks):** engine, scenarios, animation, OpenTelemetry import.

## 15. Business Model

- Free: extension, local graph, JSON export.
- Paid per team: platform history, diffs, sharing, simulation, calibration.

## 16. Risks

1. **Static analysis misses dynamic calls.** Mitigation: manual edges, AI pass, confidence scores.
2. **Large graphs become unreadable.** Mitigation: layers, collapsing, filters.
3. **Simulation looks precise but runs on guessed numbers.** Mitigation: label defaults clearly, push calibration from real traces.
4. **Code privacy concerns.** Mitigation: analysis runs locally, only the graph is uploaded, AI pass is opt in.

## 17. Open Questions

1. Final name and branding.
2. React Flow or Cytoscape.
3. Self hosted platform option for enterprise.
4. Which second stack comes after Nuxt and Node.
5. Pricing tiers.

## 18. Success Metrics

- Time from install to first rendered graph under 2 minutes.
- Share of detected edges that users keep versus delete.
- Weekly active projects pushing to the platform.
- Simulation runs per paying team per month.
