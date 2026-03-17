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
exports.RendererPanel = void 0;
const vscode = __importStar(require("vscode"));
class RendererPanel {
    static currentPanel;
    _panel;
    _extensionUri;
    _disposables = [];
    static createOrShow(extensionUri, selection) {
        const column = vscode.ViewColumn.Beside;
        if (RendererPanel.currentPanel) {
            RendererPanel.currentPanel._panel.reveal(column);
            RendererPanel.currentPanel._update(selection);
            return;
        }
        const panel = vscode.window.createWebviewPanel('codeshot', 'CodeShot Preview', column, {
            enableScripts: true,
            localResourceRoots: [extensionUri]
        });
        RendererPanel.currentPanel = new RendererPanel(panel, extensionUri, selection);
    }
    constructor(panel, extensionUri, selection) {
        this._panel = panel;
        this._extensionUri = extensionUri;
        this._panel.onDidDispose(() => this.dispose(), null, this._disposables);
        this._panel.webview.onDidReceiveMessage(async (message) => {
            switch (message.command) {
                case 'capture':
                    await this._saveImage(message.data);
                    return;
                case 'showError':
                    vscode.window.showErrorMessage(message.text);
                    return;
            }
        }, null, this._disposables);
        this._update(selection);
    }
    update(selection) {
        // Full re-render for reliable color/highlight updates
        this._update(selection);
    }
    async _saveImage(base64Data) {
        try {
            if (!base64Data || !base64Data.includes(',')) {
                throw new Error('Invalid image data received.');
            }
            const buffer = Buffer.from(base64Data.split(',')[1], 'base64');
            const options = {
                defaultUri: vscode.Uri.file('codeshot.jpg'),
                filters: {
                    'Images': ['jpg', 'jpeg']
                }
            };
            const fileUri = await vscode.window.showSaveDialog(options);
            if (fileUri) {
                await vscode.workspace.fs.writeFile(fileUri, buffer);
                vscode.window.showInformationMessage('CodeShot: Image saved successfully!');
            }
        }
        catch (error) {
            console.error('CodeShot Save Error:', error);
            vscode.window.showErrorMessage(`CodeShot: Failed to save image. ${error.message || ''}`);
        }
    }
    _update(selection) {
        this._panel.webview.html = this._getHtmlForWebview(selection);
    }
    dispose() {
        RendererPanel.currentPanel = undefined;
        this._panel.dispose();
        while (this._disposables.length) {
            const x = this._disposables.pop();
            if (x) {
                x.dispose();
            }
        }
    }
    _getHtmlForWebview(selection) {
        const prismJsUri = this._panel.webview.asWebviewUri(vscode.Uri.joinPath(this._extensionUri, 'resources', 'prism-bundle.min.js'));
        const html2canvasUri = this._panel.webview.asWebviewUri(vscode.Uri.joinPath(this._extensionUri, 'resources', 'html2canvas.min.js'));
        const languageMap = {
            'js': 'javascript', 'javascript': 'javascript',
            'ts': 'typescript', 'typescript': 'typescript',
            'py': 'python', 'python': 'python',
            'md': 'markdown', 'markdown': 'markdown',
            'c': 'clike', 'cpp': 'cpp', 'csharp': 'csharp', 'cs': 'csharp',
            'java': 'java', 'php': 'php', 'go': 'go', 'rs': 'rust', 'rust': 'rust',
            'sql': 'sql', 'html': 'markup', 'xml': 'markup', 'css': 'css',
            'json': 'javascript', 'yaml': 'yaml', 'sh': 'bash', 'bash': 'bash'
        };
        const language = languageMap[selection.languageId] || selection.languageId;
        const lines = selection.text.split('\n');
        // Add exact height constraint to line numbers to perfectly match the code
        const lineNumbersHtml = lines.map((_, i) => `<div style="height: 1.6em;">${selection.startLine + i + 1}</div>`).join('');
        return `
            <!DOCTYPE html>
            <html lang="en">
            <head>
                <meta charset="UTF-8">
                <meta name="viewport" content="width=device-width, initial-scale=1.0">
                <script src="${prismJsUri}"></script>
                <script src="${html2canvasUri}"></script>
                <style>
                    /* Premium Syntax Highlighting - Ultra Vibrant Neon */
                    code[class*="language-"], 
                    pre[class*="language-"] {
                        color: #e4e4e7;
                        background: none !important;
                        font-family: 'JetBrains Mono', 'Fira Code', Consolas, Monaco, 'Andale Mono', monospace;
                        font-size: 14px;
                        direction: ltr;
                        text-align: left;
                        white-space: pre;
                        word-spacing: normal;
                        word-break: normal;
                        /* Explicit line-height matched everywhere */
                        line-height: 1.6;
                        -moz-tab-size: 4;
                        -o-tab-size: 4;
                        tab-size: 4;
                        -webkit-hyphens: none;
                        -moz-hyphens: none;
                        -ms-hyphens: none;
                        hyphens: none;
                        margin: 0;
                    }

                    /* 🎨 Ultra-Vibrant Neon Syntax Colors */
                    .token.comment, .token.prolog, .token.doctype, .token.cdata {
                        color: #6b7994 !important;
                        font-style: italic !important;
                    }
                    .token.namespace { opacity: .85 !important; }

                    .token.string, .token.attr-value { color: #a8ff60 !important; }
                    .token.punctuation { color: #cdd6e4 !important; }
                    .token.operator { color: #ff9ac1 !important; }
                    .token.entity, .token.url, .token.symbol { color: #ff9d00 !important; }
                    .token.number { color: #c792ea !important; }
                    .token.boolean { color: #c792ea !important; font-weight: bold !important; }
                    .token.property, .token.constant { color: #ff6e6e !important; }
                    .token.tag { color: #ff6188 !important; }
                    .token.deleted { color: #ff5555 !important; text-decoration: line-through !important; }
                    .token.inserted { color: #a8ff60 !important; }
                    .token.function { color: #25c9ff !important; font-weight: bold !important; }
                    .token.class-name { color: #78dce8 !important; font-style: italic !important; }
                    .token.keyword { color: #ff2d76 !important; font-weight: bold !important; }
                    .token.atrule, .token.selector { color: #a8ff60 !important; }
                    .token.builtin, .token.char { color: #78dce8 !important; }
                    .token.attr-name { color: #ffb86c !important; font-style: italic !important; }
                    .token.regex { color: #ffd866 !important; }
                    .token.important, .token.variable { color: #ff9d00 !important; }
                    .token.important, .token.bold { font-weight: bold !important; }
                    .token.italic { font-style: italic !important; }

                    body {
                        background-color: #0d0d0d;
                        margin: 0;
                        padding: 0;
                        display: flex;
                        flex-direction: column;
                        align-items: center;
                        min-height: 100vh;
                        overflow-x: hidden;
                        font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
                        color: #fff;
                    }
                    
                    /* Modern Floating Toolbar */
                    .toolbar {
                        position: fixed;
                        top: 20px;
                        background: rgba(37, 37, 38, 0.7);
                        backdrop-filter: blur(12px);
                        -webkit-backdrop-filter: blur(12px);
                        padding: 10px 24px;
                        border-radius: 99px;
                        display: flex;
                        gap: 24px;
                        align-items: center;
                        z-index: 1000;
                        border: 1px solid rgba(255, 255, 255, 0.1);
                        box-shadow: 0 8px 32px rgba(0, 0, 0, 0.4);
                    }
                    
                    /* Scaler Wrapper */
                    #scaler-wrapper {
                        display: flex;
                        justify-content: center;
                        align-items: center;
                        width: 100%;
                        height: calc(100vh - 80px);
                        margin-top: 80px;
                        overflow: hidden;
                    }

                    #scaler {
                        transform-origin: center center;
                        transition: transform 0.2s ease-out;
                        display: flex;
                        justify-content: center;
                        align-items: center;
                    }
                    
                    .control-group {
                        display: flex;
                        align-items: center;
                        gap: 12px;
                        font-size: 12px;
                        text-transform: uppercase;
                        letter-spacing: 0.5px;
                        font-weight: 600;
                        color: rgba(255, 255, 255, 0.6);
                    }
                    
                    select {
                        background: transparent;
                        color: #fff;
                        border: none;
                        font-size: 13px;
                        font-weight: 500;
                        cursor: pointer;
                        outline: none;
                        padding: 4px 8px;
                    }
                    
                    button.primary {
                        background: #fff;
                        color: #000;
                        border: none;
                        padding: 8px 20px;
                        border-radius: 99px;
                        font-weight: 600;
                        cursor: pointer;
                        transition: all 0.2s ease;
                        font-size: 13px;
                    }
                    
                    button.primary:hover {
                        background: #e0e0e0;
                        transform: translateY(-1px);
                    }

                    .viewport-container {
                        padding: 100px 50px;
                        display: flex;
                        justify-content: center;
                        align-items: center;
                        width: 100%;
                        box-sizing: border-box;
                    }
                    
                    #capture-area {
                        padding: 50px;
                        display: flex;
                        justify-content: center;
                        align-items: center;
                        transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
                        background: #1a1a1a;
                        user-select: none !important;
                        -webkit-user-select: none !important;
                    }
                    
                    #capture-area.gradient-1 { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); }
                    #capture-area.gradient-2 { background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%); }
                    #capture-area.gradient-3 { background: linear-gradient(135deg, #5ee7df 0%, #b490ca 100%); }
                    #capture-area.gradient-4 { background: linear-gradient(135deg, #89f7fe 0%, #66a6ff 100%); }
                    #capture-area.gradient-5 { background: linear-gradient(135deg, #fc5c7d 0%, #6a82fb 100%); }
                    #capture-area.gradient-6 { background: linear-gradient(135deg, #00c9ff 0%, #92fe9d 100%); }

                    .window-frame {
                        background-color: var(--vscode-editor-background, #1e1e1e);
                        color: var(--vscode-editor-foreground, #d4d4d4);
                        border-radius: 12px;
                        box-shadow: 0 40px 80px rgba(0, 0, 0, 0.5);
                        overflow: hidden;
                        min-width: 400px;
                        max-width: 1000px;
                        border: 1px solid rgba(255, 255, 255, 0.1);
                    }
                    
                    .window-header {
                        padding: 16px 20px;
                        display: flex;
                        align-items: center;
                        background: rgba(255, 255, 255, 0.03);
                    }
                    
                    .window-controls {
                        display: flex;
                        gap: 8px;
                    }
                    
                    .dot {
                        width: 12px;
                        height: 12px;
                        border-radius: 50%;
                    }
                    .red { background-color: #ff5f56; }
                    .yellow { background-color: #ffbd2e; }
                    .green { background-color: #27c93f; }
                    
                    .code-body {
                        display: flex;
                        padding: 10px 24px 30px 24px;
                        font-family: 'JetBrains Mono', 'Fira Code', Consolas, Monaco, 'Andale Mono', monospace;
                        font-size: 14px;
                        line-height: 1.6;
                    }
                    
                    .line-numbers {
                        text-align: right;
                        padding-right: 28px;
                        color: rgba(255,255,255,0.4);
                        user-select: none;
                        font-variant-numeric: tabular-nums;
                        display: flex;
                        flex-direction: column;
                        /* Match exactly with the pre/code font settings */
                        font-family: 'JetBrains Mono', 'Fira Code', Consolas, Monaco, 'Andale Mono', monospace;
                        font-size: 14px;
                        line-height: 1.6;
                        /* Prevent it from misaligning via padding or margin */
                        margin: 0;
                        padding-top: 0;
                        padding-bottom: 0;
                    }
                    
                    pre {
                        margin: 0;
                        white-space: pre;
                        font-family: inherit;
                        background: transparent !important;
                    }
                    code {
                        font-family: inherit;
                        background: transparent !important;
                    }
                    ::selection {
                        background: transparent !important;
                    }
                </style>
            </head>
            <body>
                <div class="toolbar">
                    <div class="control-group">
                        <span>Padding</span>
                        <select id="padding-select" onchange="updatePadding(this.value)">
                            <option value="24px">S</option>
                            <option value="50px" selected>M</option>
                            <option value="80px">L</option>
                            <option value="120px">XL</option>
                        </select>
                    </div>
                    <div class="control-group">
                        <span>Scene</span>
                        <select id="bg-select" onchange="updateBg(this.value)">
                            <option value="default">Solid</option>
                            <option value="gradient-1" selected>Dusk</option>
                            <option value="gradient-2">Sunset</option>
                            <option value="gradient-3">Sea</option>
                            <option value="gradient-4">Sky</option>
                            <option value="gradient-5">Candy</option>
                            <option value="gradient-6">Mint</option>
                        </select>
                    </div>
                    <button class="primary" onclick="capture()">Capture</button>
                </div>
                <div class="viewport-container" id="scaler-wrapper">
                    <div id="scaler">
                        <div id="capture-area" class="gradient-1">
                            <div class="window-frame">
                                <div class="window-header">
                                    <div class="window-controls">
                                        <div class="dot red"></div>
                                        <div class="dot yellow"></div>
                                        <div class="dot green"></div>
                                    </div>
                                </div>
                                <div class="code-body">
                                    <div class="line-numbers">${lineNumbersHtml}</div>
                                    <pre class="language-${language}"><code class="language-${language}">${this._escapeHtml(selection.text)}</code></pre>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
                <script>
                    var vscode = acquireVsCodeApi();
                    
                    // Trigger highlight on load
                    document.addEventListener('DOMContentLoaded', function() {
                        if (window.Prism) {
                            Prism.highlightAll();
                        }
                    });
                    
                    // Fallback immediate highlight
                    setTimeout(function() {
                        if (window.Prism) { Prism.highlightAll(); }
                        updateScale();
                    }, 100);

                    function updateScale() {
                        var wrapper = document.getElementById('scaler-wrapper');
                        var scaler = document.getElementById('scaler');
                        var area = document.getElementById('capture-area');
                        
                        var pad = 40;
                        var availableWidth = wrapper.clientWidth - pad;
                        var availableHeight = wrapper.clientHeight - pad;
                        
                        var scaleX = availableWidth / area.offsetWidth;
                        var scaleY = availableHeight / area.offsetHeight;
                        var scale = Math.min(1, scaleX, scaleY);
                        
                        scaler.style.transform = 'scale(' + scale + ')';
                    }

                    window.addEventListener('resize', updateScale);
                    setTimeout(updateScale, 100);

                    function updatePadding(val) {
                        document.getElementById('capture-area').style.padding = val;
                        setTimeout(updateScale, 50);
                    }
                    
                    function updateBg(val) {
                        var area = document.getElementById('capture-area');
                        area.classList.remove('gradient-1', 'gradient-2', 'gradient-3', 'gradient-4', 'gradient-5', 'gradient-6');
                        if (val !== 'default') {
                            area.classList.add(val);
                        }
                    }

                    // Explicitly pull colors for html2canvas
                    function copyStyles(src, dest) {
                        var style = window.getComputedStyle(src);
                        dest.style.color = style.color;
                        dest.style.backgroundColor = style.backgroundColor;
                        dest.style.fontWeight = style.fontWeight;
                        dest.style.fontStyle = style.fontStyle;
                        dest.style.fontFamily = style.fontFamily;
                        dest.style.fontSize = style.fontSize;
                        dest.style.lineHeight = style.lineHeight;
                    }

                    function capture() {
                        var area = document.getElementById('capture-area');
                        var btn = document.querySelector('button.primary');
                        var originalText = btn.innerText;
                        
                        btn.innerText = 'Capturing...';
                        btn.disabled = true;

                        // Ensure no text is selected before capture
                        window.getSelection().removeAllRanges();

                        // Pre-process before cloning: explicitly bake all tokens into inline styles on the REAL dom
                        // HTML2Canvas struggles with external stylesheets loaded inside webviews
                        var tokens = area.querySelectorAll('.token, .line-numbers, .window-frame, .code-body, pre, code');
                        tokens.forEach(function(token) {
                            var style = window.getComputedStyle(token);
                            token.style.setProperty('color', style.color, 'important');
                            token.style.setProperty('font-style', style.fontStyle, 'important');
                            token.style.setProperty('font-weight', style.fontWeight, 'important');
                            token.style.setProperty('background', style.background, 'important');
                            token.style.setProperty('background-color', style.backgroundColor, 'important');
                            token.style.setProperty('font-family', style.fontFamily, 'important');
                            token.style.setProperty('font-size', style.fontSize, 'important');
                            token.style.setProperty('line-height', style.lineHeight, 'important');
                        });

                        html2canvas(area, {
                            backgroundColor: null,
                            scale: 3,
                            logging: false,
                            useCORS: true,
                            allowTaint: true,
                            imageTimeout: 0,
                            removeContainer: true,
                            onclone: function(clonedDoc) {
                                var clonedArea = clonedDoc.getElementById('capture-area');
                                clonedArea.style.userSelect = 'none';
                                
                                var clonedScaler = clonedDoc.getElementById('scaler');
                                if (clonedScaler) {
                                    clonedScaler.style.transform = 'none';
                                    clonedScaler.style.width = 'auto';
                                    clonedScaler.style.height = 'auto';
                                }
                            }
                        }).then(function(canvas) {
                            // Clean up our inline styles from the real DOM
                            tokens.forEach(function(token) {
                                token.style.removeProperty('color');
                                token.style.removeProperty('font-style');
                                token.style.removeProperty('font-weight');
                                token.style.removeProperty('background');
                                token.style.removeProperty('background-color');
                                token.style.removeProperty('font-family');
                                token.style.removeProperty('font-size');
                                token.style.removeProperty('line-height');
                            });

                            var data = canvas.toDataURL('image/jpeg', 0.95);
                            vscode.postMessage({
                                command: 'capture',
                                data: data
                            });
                            btn.innerText = originalText;
                            btn.disabled = false;
                        }).catch(function(err) {
                            vscode.postMessage({
                                command: 'showError',
                                text: 'Failed to capture: ' + err.message
                            });
                            btn.innerText = originalText;
                            btn.disabled = false;
                        });
                    }
                </script>
            </body>
            </html>
        `;
    }
    _escapeHtml(unsafe) {
        return unsafe
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;")
            .replace(/"/g, "&quot;")
            .replace(/'/g, "&#039;");
    }
}
exports.RendererPanel = RendererPanel;
//# sourceMappingURL=renderer-panel.js.map