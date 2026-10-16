import cytoscape from "cytoscape";
import type { Core, ElementsDefinition, EventObject } from "cytoscape";
import type { ArchitectureGraph, ArchitectureNode } from "@arch-viz/core";
import { getCytoscapeStyles, NODE_COLORS } from "./theme.js";
import type { ViewerOptions } from "./types.js";

export function transformGraphToElements(graph: ArchitectureGraph): ElementsDefinition {
  const hiddenNodes = new Set(graph.overrides?.hiddenNodeIds ?? []);
  const hiddenEdges = new Set(graph.overrides?.hiddenEdgeIds ?? []);

  const nodes = graph.nodes
    .filter((n) => !hiddenNodes.has(n.id))
    .map((node) => ({
      data: {
        id: node.id,
        label: node.label,
        type: node.type,
        color: NODE_COLORS[node.type] ?? "#94a3b8",
        sourceFile: node.source.file,
        sourceLine: node.source.line,
        origin: node.origin,
        rawNode: node,
      },
    }));

  const nodeIds = new Set(nodes.map((n) => n.data.id));

  const edges = graph.edges
    .filter((e) => !hiddenEdges.has(e.id) && nodeIds.has(e.from) && nodeIds.has(e.to))
    .map((edge) => ({
      data: {
        id: edge.id,
        source: edge.from,
        target: edge.to,
        kind: edge.kind,
        confidence: edge.confidence,
      },
    }));

  return { nodes, edges };
}

export class GraphViewer {
  private cy: Core | null = null;
  private options: ViewerOptions;

  constructor(options: ViewerOptions) {
    this.options = options;
    if (options.container) {
      this.mount(options.container);
    }
  }

  public mount(container: HTMLElement): Core {
    if (this.cy) {
      this.cy.destroy();
    }

    const elements = transformGraphToElements(this.options.graph);
    const styles = getCytoscapeStyles(this.options.theme ?? "dark");

    this.cy = cytoscape({
      container,
      elements,
      style: styles,
      layout: {
        name: "breadthfirst",
        directed: true,
        padding: 40,
        spacingFactor: 1.5,
      },
      minZoom: 0.2,
      maxZoom: 3.0,
      wheelSensitivity: 0.3,
    });

    this.cy.on("tap", "node", (event: EventObject) => {
      const nodeData = event.target.data();
      const rawNode = nodeData.rawNode as ArchitectureNode;
      if (this.options.onNodeClick) {
        this.options.onNodeClick(rawNode);
      }
      if (this.options.onNodeSelect) {
        this.options.onNodeSelect(rawNode.id);
      }
    });

    this.cy.on("tap", (event: EventObject) => {
      if (event.target === this.cy) {
        if (this.options.onNodeSelect) {
          this.options.onNodeSelect(null);
        }
      }
    });

    return this.cy;
  }

  public getCytoscape(): Core | null {
    return this.cy;
  }

  public updateGraph(graph: ArchitectureGraph): void {
    this.options.graph = graph;
    if (this.cy) {
      const elements = transformGraphToElements(graph);
      this.cy.elements().remove();
      this.cy.add(elements);
      this.cy.layout({ name: "breadthfirst", directed: true, padding: 40 }).run();
    }
  }

  public fit(): void {
    this.cy?.fit();
  }

  public zoom(level?: number): number {
    if (level !== undefined && this.cy) {
      this.cy.zoom(level);
    }
    return this.cy?.zoom() ?? 1;
  }

  public pan(pos?: { x: number; y: number }): { x: number; y: number } {
    if (pos && this.cy) {
      this.cy.pan(pos);
    }
    return this.cy?.pan() ?? { x: 0, y: 0 };
  }

  public destroy(): void {
    if (this.cy) {
      this.cy.destroy();
      this.cy = null;
    }
  }
}
