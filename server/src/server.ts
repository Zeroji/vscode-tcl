'use strict';

import {
    IPCMessageReader, IPCMessageWriter,
    createConnection, IConnection, TextDocumentSyncKind,
    TextDocuments, TextDocument, Diagnostic, DiagnosticSeverity,
    InitializeParams, InitializeResult, TextDocumentPositionParams,
    CompletionItem, CompletionItemKind,
    Hover, Files, DocumentSymbol, DocumentSymbolParams, SymbolKind
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
            textDocumentSync: documents.syncKind,
            // Tell the client that the server supports symbols
            documentSymbolProvider: true
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

function shiftRanges(symbols: DocumentSymbol[], offset: number): DocumentSymbol[] {
    symbols.forEach(symbol => {
        symbol.selectionRange.start.line += offset;
        symbol.selectionRange.end.line   += offset;
        symbol.range.start.line          += offset;
        symbol.range.end.line            += offset;
        if (symbol.children)
            shiftRanges(symbol.children, offset);
    });
    return symbols;
}

function countOccurrences(haystack: string, needle: string, position: number = 0): number {
    let count: number = 0;
    while(true) {
        let next = haystack.indexOf(needle, position);
        if (next < 0)
            break;
        count++;
        position = next+1;
    }
    return count;
}

function parseSymbols(lines:string[]): DocumentSymbol[] {
    let symbols: DocumentSymbol[] = [];
    let symbol: DocumentSymbol = null;
    const singleLineSymbols: SymbolKind[] = [SymbolKind.Variable];

    let procMatcher = /(proc\s+)(((?:::)?(?:\w+::)*\w+)\s+(\w+|\{\s*(?:\w+|\{\s*\w+\s+[^}]+\s*\})?(?:\s+\w+|\s+\{\s*\w+\s+[^}]+\s*\})*\s*\}))/;
    let namespaceMatcher = /(namespace\s+eval\s+)(((?:::)?(?:\w+::)*\w+))/;
    let variableMatcher = /(variable\s+)(((?:::)?(?:\w+::)*\w+)\s+((?!")[^\s;]+|"(?:\\ [\\"]|[^\\"])*"))(?=\s*;|\s*$)/;

    /// offset the bracket search in case we're still on first line
    let offsetIndex: number = 0;
    /// whether the opening bracket has been parsed yet
    let foundFirstBracket: boolean;
    /// total number of unclosed brackets found
    let bracketCount: number;
    /// index of last closing bracket in line
    let indexOfLastClose: number;

    for (let li = 0; li < lines.length; li++) {
        const line: string = lines[li];

        if (symbol != null) {
            // keep parsing until end of current symbol
            if (!foundFirstBracket || bracketCount > 0) {
                let opened = countOccurrences(line, '{', offsetIndex);
                let closed = countOccurrences(line, '}', offsetIndex);
                if (opened > 0 && !foundFirstBracket)
                    foundFirstBracket = true;
                if (closed > 0)
                    indexOfLastClose = line.lastIndexOf('}');
                bracketCount += (opened - closed);
                offsetIndex = 0;
            }
            // close and push symbol
            if (foundFirstBracket && bracketCount <= 0) {
                symbol.range.end.line = li;
                symbol.range.end.character = indexOfLastClose + 1;

                // parse children, fix their ranges and add them
                let children: DocumentSymbol[] = parseSymbols(lines.slice(
                    symbol.range.start.line + 1, symbol.range.end.line
                ));
                shiftRanges(children, symbol.range.start.line + 1);
                symbol.children = children;

                symbols.push(symbol);
                symbol = null;
                continue;
            }
            if (symbol)
                continue;
        }

        // try to find symbols
        let match: RegExpMatchArray;
        // common match elements:
        // [1] declaration keyword and whitespace
        // [2] full name
        // [3] short name
        // [4] details
        if (match = procMatcher.exec(line)) {
            symbol = new DocumentSymbol();
            symbol.detail = match[4];
            symbol.kind = SymbolKind.Function;
        } else if (match = namespaceMatcher.exec(line)) {
            symbol = new DocumentSymbol();
            symbol.kind = SymbolKind.Namespace;
        } else if (match = variableMatcher.exec(line)) {
            symbol = new DocumentSymbol();
            symbol.detail = '= ' + match[4];
            symbol.kind = SymbolKind.Variable;
        }

        if (match && symbol) {
            let single: boolean = singleLineSymbols.indexOf(symbol.kind) > -1;

            symbol.name = match[3];
            let index = match.index;
            let start = index + match[1].length;
            let end = start + match[3].length;
            let matchEnd = index + match[0].length;
            symbol.range = {
                start: {line: li, character: index},
                end: {line: null, character: null}
            };
            symbol.selectionRange = {
                start: {line: li, character: start},
                end: {line: li, character: end}
            };
            if (single) {
                symbol.range.end.line = li;
                symbol.range.end.character = matchEnd;
                symbols.push(symbol);
                symbol = null;
            } else {
                offsetIndex = matchEnd;
                foundFirstBracket = false;
                bracketCount = 0;
                li--;
            }
        }
    }
    return symbols;
}

connection.onDocumentSymbol((documentSymbol: DocumentSymbolParams): DocumentSymbol[] => {
    let text = documents.get(documentSymbol.textDocument.uri).getText();
    let lines = text.split(/\r?\n/);
    let symbols: DocumentSymbol[];

    symbols = parseSymbols(lines);

    console.log("Found", symbols.length, "symbols!");
    console.log(symbols);
    
    return symbols;
});