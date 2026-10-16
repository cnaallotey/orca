# Architecture Visualizer

Architecture Visualizer is an interactive architecture graph generator and route visualizer for Nuxt repositories in VS Code.

## Features (Milestone M0)

- **Scan Workspace**: Automatically analyzes your Nuxt project using Tree-sitter AST parsing.
- **Route Graph**: Displays all pages, server API endpoints, and server routes in an interactive graph powered by Cytoscape.
- **Jump to Code**: Click any route node in the graph to immediately jump to the exact source file and line definition in the VS Code editor.

## Getting Started

1. Open any Nuxt project workspace in VS Code.
2. Open the Command Palette (`Ctrl+Shift+P` or `Cmd+Shift+P`).
3. Run `Architecture: Scan Workspace`.
4. Explore the generated architecture graph in the side panel. Click any route node to navigate directly to its implementation.
