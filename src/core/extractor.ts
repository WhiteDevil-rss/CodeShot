import * as vscode from 'vscode';

export interface CodeSelection {
    text: string;
    languageId: string;
    startLine: number;
    endLine: number;
    filename: string;
}

export function extractSelection(editor: vscode.TextEditor): CodeSelection | null {
    const selection = editor.selection;
    if (selection.isEmpty) {
        return null;
    }

    const text = editor.document.getText(selection);
    const languageId = editor.document.languageId;
    const filename = editor.document.fileName;

    return {
        text,
        languageId,
        startLine: selection.start.line,
        endLine: selection.end.line,
        filename
    };
}
