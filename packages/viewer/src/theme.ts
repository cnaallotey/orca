import type { StylesheetStyle } from "cytoscape";

export const NODE_COLORS: Record<string, string> = {
  service: "#3b82f6", // blue
  route: "#10b981", // emerald green
  module: "#8b5cf6", // violet
  database: "#f59e0b", // amber
  queue: "#ec4899", // pink
  cache: "#06b6d4", // cyan
  externalApi: "#6366f1", // indigo
  job: "#f97316", // orange
  env: "#64748b", // slate
};

export function getCytoscapeStyles(theme: "light" | "dark" = "dark"): StylesheetStyle[] {
  const isDark = theme === "dark";
  const textColor = isDark ? "#f3f4f6" : "#111827";
  const edgeColor = isDark ? "#6b7280" : "#9ca3af";
  const nodeBorder = isDark ? "#374151" : "#e5e7eb";

  return [
    {
      selector: "node",
      style: {
        label: "data(label)",
        color: textColor,
        "font-size": "12px",
        "font-family": "system-ui, -apple-system, sans-serif",
        "text-valign": "bottom",
        "text-margin-y": 6,
        "background-color": "data(color)",
        width: 38,
        height: 38,
        "border-width": 2,
        "border-color": nodeBorder,
      },
    },
    {
      selector: "node[type = 'route']",
      style: {
        shape: "round-rectangle",
        width: 50,
        height: 30,
        "text-valign": "center",
        "text-margin-y": 0,
        color: "#ffffff",
        "font-weight": "bold",
        "font-size": "11px",
      },
    },
    {
      selector: "node[type = 'database']",
      style: {
        shape: "barrel",
        width: 44,
        height: 44,
        "text-valign": "bottom",
        "text-margin-y": 4,
      },
    },
    {
      selector: "node[type = 'externalApi']",
      style: {
        shape: "diamond",
        width: 42,
        height: 42,
        "text-valign": "bottom",
        "text-margin-y": 4,
      },
    },
    {
      selector: "node[type = 'env']",
      style: {
        shape: "hexagon",
        width: 36,
        height: 36,
        "text-valign": "bottom",
        "text-margin-y": 4,
      },
    },
    {
      selector: "node[origin = 'manual']",
      style: {
        "border-style": "dashed",
        "border-width": 3,
        "border-color": "#a855f7",
      },
    },
    {
      selector: "node:selected",
      style: {
        "border-width": 3,
        "border-color": "#38bdf8",
      },
    },
    {
      selector: "edge",
      style: {
        width: 2,
        "line-color": edgeColor,
        "target-arrow-color": edgeColor,
        "target-arrow-shape": "triangle",
        "curve-style": "bezier",
        label: "data(kind)",
        "font-size": "10px",
        color: isDark ? "#9ca3af" : "#6b7280",
        "text-rotation": "autorotate",
        "text-margin-y": -8,
      },
    },
    {
      selector: "edge[confidence < 0.8]",
      style: {
        "line-style": "dashed",
      },
    },
    {
      selector: "edge:selected",
      style: {
        width: 3,
        "line-color": "#38bdf8",
        "target-arrow-color": "#38bdf8",
      },
    },
  ];
}
