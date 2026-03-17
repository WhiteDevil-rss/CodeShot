"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.activate = activate;
exports.deactivate = deactivate;
const vscode = __importStar(require("vscode"));
const extractor_1 = require("./core/extractor");
const renderer_panel_1 = require("./ui/renderer-panel");
function activate(context) {
    console.log('Congratulations, your extension "codeshot" is now active!');
    let disposable = vscode.commands.registerCommand('codeshot.capture', () => {
        const editor = vscode.window.activeTextEditor;
        if (!editor) {
            return;
        }
        const selection = (0, extractor_1.extractSelection)(editor);
        if (!selection) {
            vscode.window.showInformationMessage('Please select some code first.');
            return;
        }
        renderer_panel_1.RendererPanel.createOrShow(context.extensionUri, selection);
    });
    // Live Update Listener
    let selectionListener = vscode.window.onDidChangeTextEditorSelection((e) => {
        if (renderer_panel_1.RendererPanel.currentPanel && e.textEditor === vscode.window.activeTextEditor) {
            const selection = (0, extractor_1.extractSelection)(e.textEditor);
            if (selection) {
                renderer_panel_1.RendererPanel.currentPanel.update(selection);
            }
        }
    });
    context.subscriptions.push(disposable, selectionListener);
}
function deactivate() { }
//# sourceMappingURL=extension.js.map