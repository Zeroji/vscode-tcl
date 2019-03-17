'use strict';

import {
    IPCMessageReader, IPCMessageWriter,
    createConnection, IConnection, TextDocumentSyncKind,
    TextDocuments, TextDocument, Diagnostic, DiagnosticSeverity,
    InitializeParams, InitializeResult, TextDocumentPositionParams,
    CompletionItem, CompletionItemKind,
    Hover, Files
} from 'vscode-languageserver';

import * as fs from 'fs';
import * as path from 'path';

// Create a connection for the server. The connection uses Node's IPC as a transport
let connection: IConnection = createConnection(new IPCMessageReader(process), new IPCMessageWriter(process));

// Listen on the connection
connection.listen();

// Create a simple text document manager. The text document
// manager supports full document sync only
let documents: TextDocuments = new TextDocuments();
// Make the text document manager listen on the connection
// for open, change and close text document events
documents.listen(connection);

/// After the server has started the client sends an initialize request. The server receives
// in the passed params the rootPath of the workspace plus the client capabilities.
let workspaceRoot: string;

connection.onInitialize((params): InitializeResult => {
    workspaceRoot = params.rootPath;

    return {
        capabilities: {
            // Tell the client that the server works in FULL text document sync mode
            textDocumentSync: documents.syncKind,
            // Tell the client that the server supports code complete
            completionProvider: {
                resolveProvider: true,
                "triggerCharacters": [ '$' ]
            },
            hoverProvider: true
        }
    };
});

connection.onCompletion((textDocumentPosition: TextDocumentPositionParams): CompletionItem[] => {
    let text = documents.get(textDocumentPosition.textDocument.uri).getText();
    let lines = text.split(/\r?\n/g);
    let position = textDocumentPosition.position;

    let line = lines[position.line];
    // let index = line.lastIndexOf('$', position.character);
    
    let results = new Array<CompletionItem>();
    if(line.substr(0, 4) === 'set ') {
        for(var a = 0; a < 4; a++) {
            results.push({
                label: 'Item#'+a,
                kind: CompletionItemKind.Variable,
                data: 'color-' + a
            });
        }
    }
    return results;

});

connection.onCompletionResolve((item: CompletionItem): CompletionItem => {
    if(item.data.startsWith('color-')) {
        item.detail = 'Details';
        item.documentation = 'http://info.org/';
    }

    return item;
});