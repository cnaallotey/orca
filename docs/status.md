# Milestone M0 Status & Execution Plan

## Milestone Goal

Complete Milestone M0 from `spec.md`.
**Acceptance Test**: Open a Nuxt repo in VS Code, run "Architecture: Scan Workspace", see an interactive graph of its routes, click a route and land on the right line of code in the editor.

---

## Tasks Breakdown

### Task 1: Graph Schema Contract, Validation, Stable IDs & Merge Function

- **Owning Agent**: Schema Guardian (`packages/core`)
- **Status**: Complete (Verified)
- **Deliverables**:
  - `packages/core/src/schema.ts`: Zod schema matching `spec.md` section 7, strict validation and field-level error reporting.
  - `packages/core/src/ids.ts`: Deterministic stable ID hashing for nodes and edges.
  - `packages/core/src/merge.ts`: `mergeGraphs(previous, next)` retaining manual nodes/edges and marking disappeared detected items as removed.
  - `packages/core/src/migrations.ts`: Schema migration framework.
  - Unit tests in `schema.test.ts`, `ids.test.ts`, `merge.test.ts`.

### Task 2: AST Parser Setup, Detector Interface & Nuxt Routes Detector

- **Owning Agent**: Analyzer Engineer (`packages/analyzer`)
- **Status**: Complete (Verified)
- **Deliverables**:
  - `packages/analyzer/src/types.ts`: `Detector` and `DetectorContext` interfaces.
  - `packages/analyzer/src/parser.ts`: Tree-sitter WebAssembly parser initialization for TypeScript, JavaScript, and Vue SFCs.
  - `packages/analyzer/src/detectors/nuxt-routes.ts`: Detector for `pages/`, `server/api/`, and `server/routes/` with precise handler line detection.
  - `packages/analyzer/src/scanner.ts`: Workspace scan runner and graph assembler.
  - Unit tests in `nuxt-routes.test.ts`.

### Task 3: Nuxt Fixture & Golden Test Suite

- **Owning Agent**: QA Engineer (`fixtures/`, test suites)
- **Status**: Complete (Verified)
- **Deliverables**:
  - `fixtures/nuxt-sample`: Realistic Nuxt app fixture containing `pages/index.vue`, `pages/about.vue`, `pages/users/[id].vue`, `server/api/users.ts`, `server/api/users.post.ts`, `server/routes/health.ts`.
  - `fixtures/nuxt-sample/expected-graph.json`: Checked-in expected architecture graph.
  - `packages/analyzer/src/golden.test.ts`: Golden regression test verifying exact match against expected graph.

### Task 4: Interactive Graph Viewer & Renderer Spike

- **Owning Agent**: Viewer Engineer (`packages/viewer`)
- **Status**: Complete (Verified)
- **Deliverables**:
  - `docs/decisions.md`: ADR 001 recording Cytoscape.js evaluation over React Flow for 2,000 node canvas performance, zero-React webview footprint, and Nuxt compatibility.
  - `packages/viewer/src/renderer.ts`: `GraphViewer` class with pan, zoom, fit, and node click event emission.
  - `packages/viewer/src/theme.ts`: Styled node types and dark/light mode stylesheets.
  - `packages/viewer/src/webviewHtml.ts`: CSP-compliant webview HTML generation with nonces and message protocol listener.
  - Unit tests in `renderer.test.ts`.

### Task 5: VS Code Extension Scaffold, Command & Jump-To-Code

- **Owning Agent**: Extension Engineer (`apps/extension`)
- **Status**: Complete (Verified)
- **Deliverables**:
  - `apps/extension/package.json`: Manifest registering `architecture.scanWorkspace` command and declaring `@arch-viz/*` dependencies.
  - `apps/extension/src/extension.ts`: Activation logic running `@arch-viz/analyzer` with VS Code progress notification.
  - `apps/extension/src/webviewPanel.ts`: Webview panel hosting `@arch-viz/viewer` with strict CSP.
  - `apps/extension/src/navigator.ts`: `jumpToSourceLine` opening source file in editor and highlighting target line.
  - `apps/extension/src/messages.ts`: Typed protocol for webview message exchange.
  - Unit tests in `extension.test.ts`.

### Task 6: Milestone M0 Review & Verification

- **Owning Agent**: Reviewer
- **Status**: Complete (Approved)
- **Outcome**: Full monorepo verification suite (format, lint, typecheck, test, build) passing with 0 errors across 11 test suites and 24 tests.

### Task 7: Extension Bundling & .vsix Package Delivery

- **Owning Agent**: Extension Engineer (`apps/extension`)
- **Status**: Complete (Verified)
- **Deliverables**:
  - `apps/extension/scripts/bundle.mjs`: Standalone esbuild bundle script producing `dist/extension.cjs` and copying required WebAssembly grammars (`tree-sitter.wasm`, `tree-sitter-typescript.wasm`, `tree-sitter-javascript.wasm`, `tree-sitter-vue.wasm`) into `dist/wasms/`.
  - `apps/extension/package.json`: Configured with extension metadata (`publisher: arch-viz`, `main: ./dist/extension.cjs`, `repository`, `engines`).
  - `apps/extension/.vscodeignore`: Excludes test, source, and build cache files to ensure minimal VSIX footprint.
  - `apps/extension/README.md` & `apps/extension/LICENSE.md`: Extension documentation and MIT license.
  - `apps/extension/vscode-architecture-visualizer-0.1.0.vsix`: Packaged standalone installer ready for direct installation in VS Code.

---

## Current Status

- **M0 Progress**: 100% Complete & Packaged
  - [x] Step 1: Monorepo Setup & Toolchain
  - [x] Step 2: Plan the work (`docs/status.md`)
  - [x] Step 3.1: Schema Guardian (`packages/core`)
  - [x] Step 3.2: Analyzer Engineer (`packages/analyzer`)
  - [x] Step 3.3: QA Engineer (`fixtures/`, golden tests)
  - [x] Step 3.4: Viewer Engineer (`packages/viewer`, `docs/decisions.md`)
  - [x] Step 3.5: Extension Engineer (`apps/extension`)
  - [x] Step 3.6: Reviewer
  - [x] Packaging: Standalone `.vsix` packaged & verified

---

## Milestone M1: Core MVP Plan

### Milestone Goal

Deliver Milestone M1 from `spec.md` Section 14:

- Schema validation & overrides persistence contract
- 5 working detectors (Nuxt routes + middleware, Nitro/Node handlers, HTTP clients `$fetch`/`fetch`/`axios`, Data Access Prisma/SQL, and Environment variables)
- Jump to code across all detected nodes
- JSON Export command (`Architecture: Export JSON`) and `Architecture: Open Graph`
- Manual edits (hide nodes/edges, add manual nodes) that persist across scans via `.architecture/overrides.json`

### Numbered Tasks for M1

#### Task M1.1: Schema & Overrides Contract (`packages/core`)

- **Owning Agent**: Schema Guardian
- **Goal**: Formalize the `.architecture/overrides.json` schema and implement helpers to apply manual overrides and preserve manual edits deterministically during rescans.
- **Files Touched**: `packages/core/src/overrides.ts`, `packages/core/src/schema.ts`, `packages/core/src/index.ts`, `packages/core/src/overrides.test.ts`.
- **Acceptance Test**: Unit tests confirm overrides validation, serialization, and deterministic merging with detected graphs.

#### Task M1.2: HTTP Clients Detector & Route Resolution (`packages/analyzer`)

- **Owning Agent**: Analyzer Engineer
- **Goal**: Implement `HttpClientDetector` to parse `$fetch`, `useFetch`, `fetch`, and `axios` calls in `.vue`, `.ts`, and `.js` files. Match internal route URLs against detected route nodes (creating `calls` edge with high confidence) or emit `externalApi` nodes for external URLs.
- **Files Touched**: `packages/analyzer/src/detectors/http-client.ts`, `packages/analyzer/src/scanner.ts`, `packages/analyzer/src/index.ts`, `packages/analyzer/src/http-client.test.ts`.
- **Acceptance Test**: Unit test verifies that calling `$fetch('/api/users')` links the calling page/route to `/api/users`, while `fetch('https://api.stripe.com')` creates an `externalApi` node and edge.

#### Task M1.3: Data Access & Environment Variables Detectors (`packages/analyzer`)

- **Owning Agent**: Analyzer Engineer
- **Goal**:
  1. Build `DataAccessDetector` scanning `prisma/schema.prisma` (generating `database` model nodes) and code using Prisma client/SQL (generating `reads`/`writes` edges).
  2. Build `EnvDetector` scanning `.env.example` and `process.env` / `useRuntimeConfig()` references.
- **Files Touched**: `packages/analyzer/src/detectors/data-access.ts`, `packages/analyzer/src/detectors/env.ts`, `packages/analyzer/src/scanner.ts`, `packages/analyzer/src/index.ts`, `packages/analyzer/src/data-access.test.ts`.
- **Acceptance Test**: Scans Prisma schema and runtime configs to produce database and env nodes with correct edges.

#### Task M1.4: Multi-Detector Golden Fixture & Regression Tests (`fixtures/`, `packages/analyzer`)

- **Owning Agent**: QA Engineer
- **Goal**: Expand `fixtures/nuxt-sample` with Prisma models, `$fetch` client calls, and runtime config. Update `expected-graph.json` and expand golden tests.
- **Files Touched**: `fixtures/nuxt-sample/...`, `packages/analyzer/src/golden.test.ts`.
- **Acceptance Test**: Golden test passes comparing all 5 detectors output against checked-in expected graph.

#### Task M1.5: Viewer UI: Node Filtering, Search & Manual Actions (`packages/viewer`)

- **Owning Agent**: Viewer Engineer
- **Goal**: Add search bar, type filtering (routes, databases, external APIs, etc.), visual styling per node type, and manual action triggers (hide/unhide node, add manual node) that emit events to the extension host.
- **Files Touched**: `packages/viewer/src/renderer.ts`, `packages/viewer/src/theme.ts`, `packages/viewer/src/webviewHtml.ts`, `packages/viewer/src/types.ts`, `packages/viewer/src/renderer.test.ts`.
- **Acceptance Test**: Viewer tests verify node search/filtering and action event emissions.

#### Task M1.6: Extension: Export JSON, Open Graph & Persistent Overrides (`apps/extension`)

- **Owning Agent**: Extension Engineer
- **Goal**: Register `Architecture: Export JSON` and `Architecture: Open Graph` commands; listen for webview manual edit events and persist them to `.architecture/overrides.json`; reload overrides during scan.
- **Files Touched**: `apps/extension/src/commands.ts`, `apps/extension/src/overridesManager.ts`, `apps/extension/src/extension.ts`, `apps/extension/src/webviewPanel.ts`, `apps/extension/package.json`, `apps/extension/src/extension.test.ts`.
- **Acceptance Test**: In VS Code, hiding a node writes `.architecture/overrides.json`, a rescan retains the override, and `Export JSON` writes the graph to disk.

#### Task M1.7: M1 Review, Verification & Packaging (`apps/extension`, root)

- **Owning Agent**: Reviewer
- **Goal**: Run complete test suite, linter, typecheck, format check, and re-package the M1 `.vsix` bundle.
- **Acceptance Test**: Monorepo checks pass with exit code 0 and new `.vsix` is created and verified.
