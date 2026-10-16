import path from "node:path";
import * as vscode from "vscode";

export async function jumpToSourceLine(
  workspaceRoot: string,
  relativeFile: string,
  lineNumber: number,
): Promise<vscode.TextEditor | undefined> {
  const fullPath = path.isAbsolute(relativeFile)
    ? relativeFile
    : path.join(workspaceRoot, relativeFile);

  const fileUri = vscode.Uri.file(fullPath);

  try {
    const document = await vscode.workspace.openTextDocument(fileUri);
    const zeroBasedLine = Math.max(0, lineNumber - 1);
    const lineRange = new vscode.Range(
      new vscode.Position(zeroBasedLine, 0),
      new vscode.Position(zeroBasedLine, 0),
    );

    const editor = await vscode.window.showTextDocument(document, {
      selection: lineRange,
      preview: false,
      viewColumn: vscode.ViewColumn.One,
    });

    editor.revealRange(lineRange, vscode.TextEditorRevealType.InCenter);
    return editor;
  } catch (error) {
    vscode.window.showErrorMessage(
      `Architecture Visualizer: Could not open source file "${relativeFile}": ${String(error)}`,
    );
    return undefined;
  }
}
