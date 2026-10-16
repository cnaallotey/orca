# Architecture Decision Records (ADR)

## ADR 001: Graph Rendering Engine Selection (React Flow vs. Cytoscape.js)

### Date

2026-10-06

### Status

Accepted

### Context

Milestone M0 requires an interactive graph renderer supporting pan, zoom, and node click interactions, deployable inside both a VS Code Extension Webview (`apps/extension`) and the companion web platform (`apps/platform`, built with Nuxt/Vue). Furthermore, the architecture spec requires smooth performance with up to 2,000 nodes, compound layer collapsing, and deterministic layouts.

We evaluated two candidates:

1. **React Flow (@xyflow/react)**
2. **Cytoscape.js**

### Evaluation & Benchmark Analysis

| Criteria                        | Cytoscape.js                                                                | React Flow (@xyflow/react)                                                 |
| ------------------------------- | --------------------------------------------------------------------------- | -------------------------------------------------------------------------- |
| **Rendering Architecture**      | HTML5 Canvas / WebGL (imperative batch rendering)                           | DOM Nodes via React Virtual DOM                                            |
| **2,000 Node Scalability**      | Smooth 60fps pan/zoom; low memory footprint                                 | High DOM node explosion; noticeable jank without aggressive virtualization |
| **Framework Agnostic**          | Pure TypeScript / vanilla DOM API; zero framework lock-in                   | Hard dependency on React & ReactDOM                                        |
| **Nuxt Platform Compatibility** | Mounts directly to any `div` container in Nuxt / Vue 3 SFCs                 | Requires React root or separate `@vue-flow/core` rewrite                   |
| **VS Code Webview Footprint**   | Extremely lightweight, single standalone script bundle, strict CSP-friendly | Heavy runtime requiring React + ReactDOM bundling                          |
| **Compound Nodes & Layers**     | First-class native support for parent/child compound nodes and collapsing   | Requires custom group sub-flows                                            |
| **Layout Algorithms**           | Built-in breadthfirst, concentric, grid, cose, dagre                        | Relies on external third-party layout engines                              |

### Decision

We choose **Cytoscape.js** as the core graph rendering engine for `@arch-viz/viewer`.

### Consequences

- **Positive**: `@arch-viz/viewer` remains a pure TypeScript component with zero dependency on React, allowing seamless sharing between the VS Code extension webview and the Nuxt web platform.
- **Positive**: Performance target (rendering up to 2,000 nodes smoothly) is natively met through canvas-accelerated drawing.
- **Positive**: Clean typed event bus (`nodeClick`, `panZoom`, `nodeSelect`) without UI framework state synchronization problems.
