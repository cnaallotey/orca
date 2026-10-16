import { vi } from "vitest";

export const commands = {
  registerCommand: vi.fn((cmd: string, handler: (...args: unknown[]) => unknown) => {
    return { cmd, handler, dispose: vi.fn() };
  }),
};

export const workspace = {
  workspaceFolders: [
    {
      uri: { fsPath: "/mock/workspace" },
      name: "mock-workspace",
    },
  ],
  openTextDocument: vi.fn(),
  onDidSaveTextDocument: vi.fn(() => ({ dispose: vi.fn() })),
  fs: {
    writeFile: vi.fn(),
    readFile: vi.fn(),
  },
};

export const window = {
  withProgress: vi.fn(async (_options, task) => {
    return task({ report: vi.fn() });
  }),
  showInformationMessage: vi.fn(),
  showWarningMessage: vi.fn(),
  showErrorMessage: vi.fn(),
  createWebviewPanel: vi.fn(() => ({
    webview: {
      cspSource: "vscode-webview:",
      asWebviewUri: (uri: { fsPath: string }) => `vscode-webview://${uri.fsPath}`,
      html: "",
      postMessage: vi.fn(),
      onDidReceiveMessage: vi.fn(),
    },
    reveal: vi.fn(),
    onDidDispose: vi.fn(),
  })),
  showTextDocument: vi.fn(async () => ({
    revealRange: vi.fn(),
  })),
  activeTextEditor: undefined,
};

export const ProgressLocation = {
  Notification: 15,
};

export const ViewColumn = {
  One: 1,
  Beside: 2,
};

export const Uri = {
  file: (p: string) => ({ fsPath: p, scheme: "file" }),
  joinPath: (base: { fsPath: string }, ...parts: string[]) => ({
    fsPath: `${base.fsPath}/${parts.join("/")}`,
    scheme: "file",
  }),
};

export class Position {
  constructor(
    public readonly line: number,
    public readonly character: number,
  ) {}
}

export class Range {
  constructor(
    public readonly start: Position,
    public readonly end: Position,
  ) {}
}

export const TextEditorRevealType = {
  InCenter: 1,
};
