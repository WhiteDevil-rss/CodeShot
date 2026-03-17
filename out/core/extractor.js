"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.extractSelection = extractSelection;
function extractSelection(editor) {
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
//# sourceMappingURL=extractor.js.map