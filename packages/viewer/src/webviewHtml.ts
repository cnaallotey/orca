import type { ArchitectureGraph } from "@arch-viz/core";
import { getCytoscapeStyles, NODE_COLORS } from "./theme.js";

export interface WebviewHtmlOptions {
  graph: ArchitectureGraph;
  cspSource: string;
  nonce: string;
  cytoscapeScriptUri?: string;
}

export function getWebviewHtml(options: WebviewHtmlOptions): string {
  const { graph, cspSource, nonce, cytoscapeScriptUri } = options;
  const initialGraphJson = JSON.stringify(graph);
  const stylesJson = JSON.stringify(getCytoscapeStyles("dark"));
  const colorsJson = JSON.stringify(NODE_COLORS);

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src ${cspSource} 'unsafe-inline'; script-src 'nonce-${nonce}' ${cspSource};">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Architecture Graph</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    html, body {
      width: 100%;
      height: 100%;
      overflow: hidden;
      background-color: var(--vscode-editor-background, #1e1e1e);
      color: var(--vscode-editor-foreground, #cccccc);
      font-family: var(--vscode-font-family, system-ui, sans-serif);
    }
    #toolbar {
      position: absolute;
      top: 12px;
      left: 12px;
      z-index: 100;
      display: flex;
      flex-wrap: wrap;
      align-items: center;
      gap: 6px;
      background: rgba(30, 30, 30, 0.88);
      backdrop-filter: blur(8px);
      padding: 6px 10px;
      border-radius: 6px;
      border: 1px solid var(--vscode-panel-border, #333333);
      font-size: 12px;
      max-width: calc(100% - 24px);
    }
    button {
      background: var(--vscode-button-background, #0e639c);
      color: var(--vscode-button-foreground, #ffffff);
      border: none;
      padding: 4px 8px;
      border-radius: 4px;
      cursor: pointer;
      font-size: 11px;
    }
    button:hover {
      background: var(--vscode-button-hoverBackground, #1177bb);
    }
    #btn-hide {
      background: #b91c1c;
    }
    #btn-hide:hover {
      background: #dc2626;
    }
    input[type="text"], select {
      background: var(--vscode-input-background, #2d2d2d);
      color: var(--vscode-input-foreground, #cccccc);
      border: 1px solid var(--vscode-input-border, #454545);
      padding: 3px 6px;
      border-radius: 4px;
      font-size: 11px;
      outline: none;
    }
    input[type="text"]:focus, select:focus {
      border-color: var(--vscode-focusBorder, #007fd4);
    }
    #search-input {
      width: 110px;
    }
    #status {
      display: flex;
      align-items: center;
      padding-left: 4px;
      color: #9ca3af;
      font-size: 11px;
    }
    #cy {
      width: 100%;
      height: 100%;
      display: block;
    }
  </style>
  ${cytoscapeScriptUri ? `<script nonce="${nonce}" src="${cytoscapeScriptUri}"></script>` : ""}
</head>
<body>
  <div id="toolbar">
    <button id="btn-fit">Fit</button>
    <button id="btn-zoom-in">+</button>
    <button id="btn-zoom-out">-</button>
    <input id="search-input" type="text" placeholder="Filter..." />
    <select id="filter-type">
      <option value="all">All Types</option>
      <option value="route">Routes</option>
      <option value="database">Database</option>
      <option value="externalApi">External APIs</option>
      <option value="env">Env</option>
      <option value="module">Modules</option>
    </select>
    <button id="btn-hide" style="display:none;">Hide Selected</button>
    <button id="btn-export">Export JSON</button>
    <div id="status"><span id="node-count">0</span> nodes</div>
  </div>
  <div id="cy"></div>

  <script nonce="${nonce}">
    (function() {
      const vscode = typeof acquireVsCodeApi === 'function' ? acquireVsCodeApi() : null;
      let initialGraph = ${initialGraphJson};
      const cytoscapeStyles = ${stylesJson};
      const nodeColors = ${colorsJson};
      let selectedNodeId = null;

      function transformGraph(graph) {
        const hiddenNodes = new Set((graph.overrides && graph.overrides.hiddenNodeIds) || []);
        const hiddenEdges = new Set((graph.overrides && graph.overrides.hiddenEdgeIds) || []);

        const nodes = (graph.nodes || [])
          .filter(n => !hiddenNodes.has(n.id))
          .map(node => ({
            data: {
              id: node.id,
              label: node.label,
              type: node.type,
              color: nodeColors[node.type] || '#94a3b8',
              sourceFile: node.source.file,
              sourceLine: node.source.line,
              origin: node.origin,
              rawNode: node
            }
          }));

        const nodeIds = new Set(nodes.map(n => n.data.id));

        const edges = (graph.edges || [])
          .filter(e => !hiddenEdges.has(e.id) && nodeIds.has(e.from) && nodeIds.has(e.to))
          .map(edge => ({
            data: {
              id: edge.id,
              source: edge.from,
              target: edge.to,
              kind: edge.kind,
              confidence: edge.confidence
            }
          }));

        return { nodes, edges };
      }

      function initGraph(graph) {
        const elements = transformGraph(graph);
        const nodeCountEl = document.getElementById('node-count');
        if (nodeCountEl) nodeCountEl.textContent = elements.nodes.length;

        if (typeof cytoscape === 'undefined') {
          console.error("Cytoscape library not loaded");
          return;
        }

        const cy = cytoscape({
          container: document.getElementById('cy'),
          elements: elements,
          style: cytoscapeStyles,
          layout: {
            name: 'breadthfirst',
            directed: true,
            padding: 40,
            spacingFactor: 1.4
          },
          minZoom: 0.2,
          maxZoom: 3.0,
          wheelSensitivity: 0.3
        });

        const hideBtn = document.getElementById('btn-hide');

        cy.on('tap', 'node', function(evt) {
          const rawNode = evt.target.data('rawNode');
          selectedNodeId = evt.target.data('id');
          if (hideBtn) hideBtn.style.display = 'inline-block';
          if (vscode && rawNode) {
            vscode.postMessage({
              type: 'nodeSelected',
              node: rawNode
            });
          }
        });

        cy.on('tap', function(evt) {
          if (evt.target === cy) {
            selectedNodeId = null;
            if (hideBtn) hideBtn.style.display = 'none';
          }
        });

        function applyFilters() {
          const search = (document.getElementById('search-input')?.value || '').toLowerCase().trim();
          const typeFilter = document.getElementById('filter-type')?.value || 'all';

          cy.batch(() => {
            cy.nodes().forEach(node => {
              const data = node.data();
              const matchSearch = !search || data.label.toLowerCase().includes(search) || data.id.toLowerCase().includes(search);
              const matchType = typeFilter === 'all' || data.type === typeFilter;
              if (matchSearch && matchType) {
                node.show();
              } else {
                node.hide();
              }
            });
          });
        }

        document.getElementById('search-input')?.addEventListener('input', applyFilters);
        document.getElementById('filter-type')?.addEventListener('change', applyFilters);

        hideBtn?.addEventListener('click', () => {
          if (selectedNodeId && vscode) {
            vscode.postMessage({
              type: 'hideNode',
              nodeId: selectedNodeId
            });
            cy.getElementById(selectedNodeId).hide();
            selectedNodeId = null;
            hideBtn.style.display = 'none';
          }
        });

        document.getElementById('btn-export')?.addEventListener('click', () => {
          if (vscode) {
            vscode.postMessage({ type: 'exportJson' });
          }
        });

        document.getElementById('btn-fit')?.addEventListener('click', () => cy.fit());
        document.getElementById('btn-zoom-in')?.addEventListener('click', () => cy.zoom(cy.zoom() * 1.2));
        document.getElementById('btn-zoom-out')?.addEventListener('click', () => cy.zoom(cy.zoom() * 0.8));

        window.addEventListener('message', event => {
          const message = event.data;
          if (message.type === 'updateGraph' && message.graph) {
            const nextElements = transformGraph(message.graph);
            cy.elements().remove();
            cy.add(nextElements);
            cy.layout({ name: 'breadthfirst', directed: true, padding: 40 }).run();
            if (nodeCountEl) nodeCountEl.textContent = nextElements.nodes.length;
            applyFilters();
          }
        });
      }

      if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => initGraph(initialGraph));
      } else {
        initGraph(initialGraph);
      }
    })();
  </script>
</body>
</html>`;
}
