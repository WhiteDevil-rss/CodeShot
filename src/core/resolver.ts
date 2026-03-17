import * as vscode from 'vscode';

export interface ThemeColors {
    background: string;
    foreground: string;
    selectionBackground: string;
    cursorColor: string;
}

export function getThemeColors(): ThemeColors {
    const config = vscode.workspace.getConfiguration('workbench');
    const colorCustomizations = config.get<any>('colorCustomizations') || {};
    
    // This is a simplified version. In a webview, we can use CSS variables directly.
    return {
        background: colorCustomizations['editor.background'] || '#1e1e1e',
        foreground: colorCustomizations['editor.foreground'] || '#d4d4d4',
        selectionBackground: colorCustomizations['editor.selectionBackground'] || '#264f78',
        cursorColor: colorCustomizations['editorCursor.foreground'] || '#aeafad'
    };
}
