'use strict';

import * as path from 'path';

import { workspace, ExtensionContext } from 'vscode';
import {
    LanguageClient, LanguageClientOptions, ServerOptions, TransportKind
} from "vscode-languageclient";

let client: LanguageClient;

// this method is called when your extension is activated
// your extension is activated the very first time the command is executed
export function activate(context: ExtensionContext) {    
    // The server is implemented in another project and outputted there
    let serverModule = context.asAbsolutePath(path.join('server', 'out', 'server.js'));
    // The debug options for the server
    let debugOptions = { execArgv: ["--nolazy", "--inspect=6009"]};

    // If the extension is launched in debug mode the the debug server options are used
    // Otherwise the normal ones are used
    let serverOptions: ServerOptions = {
        run: {module: serverModule, transport: TransportKind.ipc},
        debug: {module: serverModule, transport: TransportKind.ipc, options: debugOptions}
    };

    // Options of the language client
    let clientOptions: LanguageClientOptions = {
        // Activate the server for TCL files
        documentSelector: [{ scheme: 'file', language: 'tcl' }],
        synchronize: {
            // Synchronize the section 'tclLanguageServer' of the settings to the server
            // configurationSection: 'tclLanguageServer',
            // Notify the server about file changes to .clientrc files contained in the workspace
            fileEvents: workspace.createFileSystemWatcher('**/.clientrc')
        }
    };

    // Create the language client and start the client.
    client = new LanguageClient('tclLanguageServer', 'TCL Language Server', serverOptions, clientOptions);
    
    // Start the client. This will also launch the server.
    client.start()
}

export function deactivate(): Thenable<void> | undefined {
    if (!client) {
        return undefined;
    }
    return client.stop();
}
