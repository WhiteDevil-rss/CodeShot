import * as vscode from 'vscode';
import { CodeSelection } from '../core/extractor';

export class RendererPanel {
    public static currentPanel: RendererPanel | undefined;
    private readonly _panel: vscode.WebviewPanel;
    private readonly _extensionUri: vscode.Uri;
    private _disposables: vscode.Disposable[] = [];

    public static createOrShow(extensionUri: vscode.Uri, selection: CodeSelection) {
        const column = vscode.ViewColumn.Beside;

        if (RendererPanel.currentPanel) {
            RendererPanel.currentPanel._panel.reveal(column);
            RendererPanel.currentPanel._update(selection);
            return;
        }

        const panel = vscode.window.createWebviewPanel(
            'codeshot',
            'CodeShot Preview',
            column,
            {
                enableScripts: true,
                localResourceRoots: [extensionUri]
            }
        );

        RendererPanel.currentPanel = new RendererPanel(panel, extensionUri, selection);
    }

    private constructor(panel: vscode.WebviewPanel, extensionUri: vscode.Uri, selection: CodeSelection) {
        this._panel = panel;
        this._extensionUri = extensionUri;
        this._panel.onDidDispose(() => this.dispose(), null, this._disposables);
        this._panel.webview.onDidReceiveMessage(
            async message => {
                switch (message.command) {
                    case 'capture':
                        await this._saveImage(message.data);
                        return;
                    case 'showError':
                        vscode.window.showErrorMessage(message.text);
                        return;
                }
            },
            null,
            this._disposables
        );
        this._update(selection);
    }

    public update(selection: CodeSelection) {
        // Full re-render for reliable color/highlight updates
        this._update(selection);
    }

    private async _saveImage(base64Data: string) {
        try {
            if (!base64Data || !base64Data.includes(',')) {
                throw new Error('Invalid image data received.');
            }

            const buffer = Buffer.from(base64Data.split(',')[1], 'base64');
            const options: vscode.SaveDialogOptions = {
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
        } catch (error: any) {
            console.error('CodeShot Save Error:', error);
            vscode.window.showErrorMessage(`CodeShot: Failed to save image. ${error.message || ''}`);
        }
    }

    private _update(selection: CodeSelection) {
        this._panel.webview.html = this._getHtmlForWebview(selection);
    }

    public dispose() {
        RendererPanel.currentPanel = undefined;
        this._panel.dispose();
        while (this._disposables.length) {
            const x = this._disposables.pop();
            if (x) {
                x.dispose();
            }
        }
    }

    private _getHtmlForWebview(selection: CodeSelection) {
        const prismJsUri = this._panel.webview.asWebviewUri(vscode.Uri.joinPath(this._extensionUri, 'resources', 'prism-bundle.min.js'));
        const html2canvasUri = this._panel.webview.asWebviewUri(vscode.Uri.joinPath(this._extensionUri, 'resources', 'html2canvas.min.js'));
        
        const languageMap: { [key: string]: string } = {
            'js': 'javascript',
            'javascript': 'javascript',
            'ts': 'typescript',
            'typescript': 'typescript',
            'py': 'python',
            'python': 'python',
            'md': 'markdown',
            'markdown': 'markdown',
            'c': 'clike',
            'cpp': 'cpp',
            'csharp': 'csharp',
            'cs': 'csharp',
            'java': 'java',
            'php': 'php',
            'go': 'go',
            'rs': 'rust',
            'rust': 'rust',
            'sql': 'sql',
            'html': 'markup',
            'xml': 'markup',
            'css': 'css',
            'json': 'javascript',
            'yaml': 'yaml',
            'sh': 'bash',
            'bash': 'bash'
        };
        const language = languageMap[selection.languageId] || selection.languageId;
        
        const lines = selection.text.split('\n');
        const lineNumbersHtml = lines.map((_, i) => `<div>${selection.startLine + i + 1}</div>`).join('');

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
                        line-height: 1.6;
                        -moz-tab-size: 4;
                        -o-tab-size: 4;
                        tab-size: 4;
                        -webkit-hyphens: none;
                        -moz-hyphens: none;
                        -ms-hyphens: none;
                        hyphens: none;
                    }

                    /* 🎨 Ultra-Vibrant Neon Syntax Colors */
                    .token.comment, .token.prolog, .token.doctype, .token.cdata {
                        color: #6b7994;
                        font-style: italic;
                    }
                    .token.namespace { opacity: .85; }

                    /* Strings — Electric Lime Green */
                    .token.string, .token.attr-value {
                        color: #a8ff60;
                    }

                    /* Punctuation — Soft White */
                    .token.punctuation {
                        color: #cdd6e4;
                    }

                    /* Operators — Hot Pink */
                    .token.operator {
                        color: #ff9ac1;
                    }

                    /* Entities, URLs, Symbols — Hot Orange */
                    .token.entity, .token.url, .token.symbol {
                        color: #ff9d00;
                    }

                    /* Numbers — Ultraviolet Purple */
                    .token.number {
                        color: #c792ea;
                    }

                    /* Booleans — Purple with bold */
                    .token.boolean {
                        color: #c792ea;
                        font-weight: bold;
                    }

                    /* Properties, Constants — Coral Red */
                    .token.property, .token.constant {
                        color: #ff6e6e;
                    }

                    /* Tags — Coral Flame */
                    .token.tag {
                        color: #ff6188;
                    }

                    /* Deleted — Red strikethrough */
                    .token.deleted {
                        color: #ff5555;
                        text-decoration: line-through;
                    }

                    /* Inserted — Green */
                    .token.inserted {
                        color: #a8ff60;
                    }

                    /* Functions — Vivid Cyan */
                    .token.function {
                        color: #25c9ff;
                        font-weight: bold;
                    }

                    /* Class names — Aqua Blue Italic */
                    .token.class-name {
                        color: #78dce8;
                        font-style: italic;
                    }

                    /* Keywords — Neon Magenta */
                    .token.keyword {
                        color: #ff2d76;
                        font-weight: bold;
                    }

                    /* At-rules, Selectors — Lime */
                    .token.atrule, .token.selector {
                        color: #a8ff60;
                    }

                    /* Builtins, Chars — Aqua */
                    .token.builtin, .token.char {
                        color: #78dce8;
                    }

                    /* Attr names — Orange Italic */
                    .token.attr-name {
                        color: #ffb86c;
                        font-style: italic;
                    }

                    /* Regex — Sunbeam Yellow */
                    .token.regex {
                        color: #ffd866;
                    }

                    /* Important, Variables — Hot Orange */
                    .token.important, .token.variable {
                        color: #ff9d00;
                    }
                    .token.important, .token.bold { font-weight: bold; }
                    .token.italic { font-style: italic; }

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
                        background-color: var(--vscode-editor-background);
                        color: var(--vscode-editor-foreground);
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
                        font-family: var(--vscode-editor-font-family);
                        font-size: var(--vscode-editor-font-size);
                        line-height: 1.6;
                    }
                    
                    .line-numbers {
                        text-align: right;
                        padding-right: 28px;
                        color: var(--vscode-editorLineNumber-foreground, #858585);
                        user-select: none;
                        opacity: 0.4;
                        font-variant-numeric: tabular-nums;
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

                    function capture() {
                        var area = document.getElementById('capture-area');
                        var btn = document.querySelector('button.primary');
                        var originalText = btn.innerText;
                        
                        btn.innerText = 'Capturing...';
                        btn.disabled = true;

                        // Ensure no text is selected before capture
                        window.getSelection().removeAllRanges();

                        html2canvas(area, {
                            backgroundColor: null,
                            scale: 3,
                            logging: false,
                            useCORS: true,
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

                                // Inline computed colors for html2canvas fidelity
                                var originalArea = document.getElementById('capture-area');
                                var originalTokens = originalArea.querySelectorAll('.token');
                                var clonedTokens = clonedArea.querySelectorAll('.token');
                                
                                clonedTokens.forEach(function(token, idx) {
                                    var originalToken = originalTokens[idx];
                                    if (originalToken) {
                                        var style = window.getComputedStyle(originalToken);
                                        token.style.color = style.color;
                                        token.style.fontWeight = style.fontWeight;
                                        token.style.fontStyle = style.fontStyle;
                                    }
                                });
                            }
                        }).then(function(canvas) {
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

    private _escapeHtml(unsafe: string) {
        return unsafe
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;")
            .replace(/"/g, "&quot;")
            .replace(/'/g, "&#039;");
    }
}
