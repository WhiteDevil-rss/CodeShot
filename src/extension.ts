import * as vscode from 'vscode';
import { extractSelection } from './core/extractor';
import { RendererPanel } from './ui/renderer-panel';


export function activate(context: vscode.ExtensionContext) {
	console.log('Congratulations, your extension "codeshot" is now active!');

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

	// Live Update Listener
	let selectionListener = vscode.window.onDidChangeTextEditorSelection((e) => {
		if (RendererPanel.currentPanel && e.textEditor === vscode.window.activeTextEditor) {
			const selection = extractSelection(e.textEditor);
			if (selection) {
				RendererPanel.currentPanel.update(selection);
			}
		}
	});

	context.subscriptions.push(disposable, selectionListener);
}

export function deactivate() {}
