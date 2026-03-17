import * as vscode from 'vscode';
import { extractSelection } from './core/extractor';
import { RendererPanel } from './ui/renderer-panel';


export function activate(context: vscode.ExtensionContext) {
	console.log('Congratulations, your extension "codeshot" is now active!');

	// Manual command trigger (context menu / command palette only)
	let disposable = vscode.commands.registerCommand('codeshot.capture', () => {
		const editor = vscode.window.activeTextEditor;
		if (!editor) {
			return;
		}

		const selection = extractSelection(editor);
		if (!selection) {
			vscode.window.showInformationMessage('Please select some code first.');
			return;
		}

		RendererPanel.createOrShow(context.extensionUri, selection);
	});

	// Live update listener — only updates if panel is already open
	let debounceTimer: NodeJS.Timeout | undefined;

	let selectionListener = vscode.window.onDidChangeTextEditorSelection((e) => {
		// Only update if panel is already open (don't auto-open)
		if (!RendererPanel.currentPanel) {
			return;
		}

		if (e.textEditor !== vscode.window.activeTextEditor) {
			return;
		}

		if (debounceTimer) {
			clearTimeout(debounceTimer);
		}

		debounceTimer = setTimeout(() => {
			const selection = extractSelection(e.textEditor);
			if (selection) {
				RendererPanel.currentPanel?.update(selection);
			}
		}, 300);
	});

	context.subscriptions.push(disposable, selectionListener);
}

export function deactivate() {}
