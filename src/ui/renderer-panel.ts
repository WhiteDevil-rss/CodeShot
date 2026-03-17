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
        this._panel.webview.postMessage({
            command: 'updateSelection',
            text: selection.text,
            startLine: selection.startLine,
            languageId: selection.languageId
        });
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
            'json': 'javascript', // Fallback to JS for JSON if needed
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
                    /* Premium Syntax Highlighting - Optimized for Capture */
                    code[class*="language-"], 
                    pre[class*="language-"] {
                        color: #f8f8f2;
                        background: none !important;
                        font-family: 'JetBrains Mono', 'Fira Code', Consolas, Monaco, 'Andale Mono', monospace;
                        font-size: 14px;
                        direction: ltr;
                        text-align: left;
                        white-space: pre;
                        word-spacing: normal;
                        word-break: normal;
                        line-height: 1.5;
                        -moz-tab-size: 4;
                        -o-tab-size: 4;
                        tab-size: 4;
                        -webkit-hyphens: none;
                        -moz-hyphens: none;
                        -ms-hyphens: none;
                        hyphens: none;
                    }

                    .token.comment, .token.prolog, .token.doctype, .token.cdata { color: #8292a2; font-style: italic; }
                    .token.namespace { opacity: .7; }
                    .token.string, .token.attr-value { color: #e6db74; }
                    .token.punctuation, .token.operator { color: #f8f8f2; }
                    .token.entity, .token.url, .token.symbol, .token.number, .token.boolean { color: #ae81ff; }
                    .token.property, .token.tag, .token.deleted, .token.constant { color: #f92672; }
                    .token.function, .token.class-name { color: #a6e22e; }
                    .token.keyword, .token.atrule, .token.selector, .token.builtin { color: #66d9ef; font-weight: bold; }
                    .token.regex, .token.important, .token.variable { color: #fd971f; }
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
                        height: calc(100vh - 80px); /* Account for toolbar */
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
                        background: transparent !important; /* Force transparent background */
                    }
                    code {
                        font-family: inherit;
                        background: transparent !important;
                    }
                    /* Remove any potential selection background on capture */
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
                    const vscode = acquireVsCodeApi();
                    
                    window.addEventListener('message', event => {
                        const message = event.data;
                        if (message.command === 'updateSelection') {
                            const codeElement = document.querySelector('pre code');
                            const preElement = document.querySelector('pre');
                            const lineNumbers = document.querySelector('.line-numbers');
                            
                            // Update dynamic language classes
                            const languageMap: { [key: string]: string } = {
                                'js': 'javascript', 'javascript': 'javascript',
                                'ts': 'typescript', 'typescript': 'typescript',
                                'py': 'python', 'python': 'python',
                                'md': 'markdown', 'markdown': 'markdown',
                                'c': 'clike', 'cpp': 'cpp', 'cs': 'csharp', 'csharp': 'csharp',
                                'java': 'java', 'php': 'php', 'go': 'go', 'rs': 'rust', 'rust': 'rust',
                                'sql': 'sql', 'html': 'markup', 'xml': 'markup', 'css': 'css',
                                'json': 'javascript', 'yaml': 'yaml', 'bash': 'bash'
                            };
                            const lang = languageMap[message.languageId] || message.languageId;
                            preElement.className = 'language-' + lang;
                            codeElement.className = 'language-' + lang;

                            // Update code
                            codeElement.textContent = message.text;
                            
                            // Highlight
                            if (window.Prism) {
                                Prism.highlightElement(codeElement);
                            }

                            // Update line numbers
                            const lines = message.text.split('\\n');
                            const lineNumbersHtml = lines.map((_, i) => \`<div>\${message.startLine + i + 1}</div>\`).join('');
                            lineNumbers.innerHTML = lineNumbersHtml;

                            // Re-calculate scale after update
                            setTimeout(updateScale, 50);
                        }
                    });

                    // Trigger highlight on initial load
                    document.addEventListener('DOMContentLoaded', () => {
                        if (window.Prism) {
                            Prism.highlightAll();
                        }
                    });
                    
                    // Fallback for immediate highlight if DOMContentLoaded already fired
                    setTimeout(() => {
                        if (window.Prism) Prism.highlightAll();
                        updateScale();
                    }, 100);

                    function updateScale() {
                        const wrapper = document.getElementById('scaler-wrapper');
                        const scaler = document.getElementById('scaler');
                        const area = document.getElementById('capture-area');
                        
                        const pad = 40; // Some breathing room
                        const availableWidth = wrapper.clientWidth - pad;
                        const availableHeight = wrapper.clientHeight - pad;
                        
                        const scaleX = availableWidth / area.offsetWidth;
                        const scaleY = availableHeight / area.offsetHeight;
                        const scale = Math.min(1, scaleX, scaleY);
                        
                        scaler.style.transform = \`scale(\${scale})\`;
                    }

                    window.addEventListener('resize', updateScale);
                    setTimeout(updateScale, 100);

                    function updatePadding(val) {
                        document.getElementById('capture-area').style.padding = val;
                    }
                    
                    function updateBg(val) {
                        const area = document.getElementById('capture-area');
                        area.classList.remove('gradient-1', 'gradient-2', 'gradient-3', 'gradient-4');
                        if (val !== 'default') {
                            area.classList.add(val);
                        }
                    }

                    function capture() {
                        const area = document.getElementById('capture-area');
                        const btn = document.querySelector('button.primary');
                        const originalText = btn.innerText;
                        
                        btn.innerText = 'Capturing...';
                        btn.disabled = true;

                        // Ensure no text is selected before capture
                        window.getSelection().removeAllRanges();

                        html2canvas(area, {
                            backgroundColor: null,
                            scale: 3, // Increased for ultra-high quality
                            logging: false,
                            useCORS: true,
                            imageTimeout: 0,
                            removeContainer: true,
                            onclone: (clonedDoc) => {
                                // Double check the cloned DOM for colors
                                const clonedArea = clonedDoc.getElementById('capture-area');
                                clonedArea.style.userSelect = 'none';
                                
                                // Ensure the scaler is removed to avoid weird cropping
                                const clonedScaler = clonedDoc.getElementById('scaler');
                                if (clonedScaler) {
                                    clonedScaler.style.transform = 'none';
                                    clonedScaler.style.width = 'auto';
                                    clonedScaler.style.height = 'auto';
                                }

                                // High fidelity - Inline the computed colors into the clone
                                // This is the ONLY way to guarantee html2canvas sees them
                                const originalArea = document.getElementById('capture-area');
                                const originalTokens = originalArea.querySelectorAll('.token');
                                const clonedTokens = clonedArea.querySelectorAll('.token');
                                
                                clonedTokens.forEach((token, idx) => {
                                    const originalToken = originalTokens[idx];
                                    if (originalToken) {
                                        const style = window.getComputedStyle(originalToken);
                                        token.style.color = style.color;
                                        token.style.fontWeight = style.fontWeight;
                                        token.style.fontStyle = style.fontStyle;
                                    }
                                });
                            }
                        }).then(canvas => {
                            const data = canvas.toDataURL('image/jpeg', 0.95);
                            vscode.postMessage({
                                command: 'capture',
                                data: data
                            });
                            btn.innerText = originalText;
                            btn.disabled = false;
                        }).catch(err => {
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
