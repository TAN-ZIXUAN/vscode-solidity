'use strict';
import * as path from 'path';
import * as vscode from 'vscode';
import { Compiler } from './compiler';
import { LanguageClient, LanguageClientOptions, ServerOptions, TransportKind, RevealOutputChannelOn, WorkspaceChange } from 'vscode-languageclient';
// tslint:disable-next-line:no-duplicate-imports
import { workspace, WorkspaceFolder } from 'vscode';
import { formatDocument } from './formatter/prettierFormatter';
import { compilerType } from './solcCompiler';

let diagnosticCollection: vscode.DiagnosticCollection;
let compiler: Compiler;

export async function activate(context: vscode.ExtensionContext) {
    const ws = workspace.workspaceFolders;
    diagnosticCollection = vscode.languages.createDiagnosticCollection('solidity');
    compiler = new Compiler(context.extensionPath);

    context.subscriptions.push(diagnosticCollection);

    context.subscriptions.push(vscode.commands.registerCommand('solidity.compilerInfo', async () => {
        await compiler.outputCompilerInfoEnsuringInitialised();
    }));

    context.subscriptions.push(vscode.commands.registerCommand('solidity.solcReleases', async () => {
        compiler.outputSolcReleases();
    }));

    context.subscriptions.push(vscode.commands.registerCommand('solidity.selectWorkspaceRemoteSolcVersion', async () => {
        compiler.selectRemoteVersion(vscode.ConfigurationTarget.Workspace);
    }));

    context.subscriptions.push(vscode.commands.registerCommand('solidity.downloadRemoteSolcVersion', async () => {
        const root = vscode.workspace.workspaceFolders[0];
        compiler.downloadRemoteVersion(root.uri.fsPath);
    }));

    context.subscriptions.push(vscode.commands.registerCommand('solidity.downloadRemoteVersionAndSetLocalPathSetting', async () => {
        const root = vscode.workspace.workspaceFolders[0];
        compiler.downloadRemoteVersionAndSetLocalPathSetting(vscode.ConfigurationTarget.Workspace, root.uri.fsPath);
    }));


    context.subscriptions.push(vscode.commands.registerCommand('solidity.selectGlobalRemoteSolcVersion', async () => {
        compiler.selectRemoteVersion(vscode.ConfigurationTarget.Global);
    }));

    context.subscriptions.push(vscode.commands.registerCommand('solidity.changeDefaultCompilerType', async () => {
        compiler.changeDefaultCompilerType(vscode.ConfigurationTarget.Workspace);
    }));


    context.subscriptions.push(
        vscode.languages.registerDocumentFormattingEditProvider('solidity', {
            provideDocumentFormattingEdits(document: vscode.TextDocument): vscode.TextEdit[] {
                return formatDocument(document, context);
            },
        }));

    const serverModule = path.join(__dirname, 'server.js');
    const serverOptions: ServerOptions = {
        debug: {
            module: serverModule,
            options: {
                execArgv: ['--nolazy', '--inspect=6009'],
            },
            transport: TransportKind.ipc,
        },
        run: {
            module: serverModule,
            transport: TransportKind.ipc,
        },
    };

    const clientOptions: LanguageClientOptions = {
        documentSelector: [
            { language: 'solidity', scheme: 'file' },
            { language: 'solidity', scheme: 'untitled' },
        ],
        revealOutputChannelOn: RevealOutputChannelOn.Never,
        synchronize: {
            // Synchronize the setting section 'solidity' to the server
            configurationSection: 'solidity',
            // Notify the server about file changes to '.sol.js files contain in the workspace (TODO node, linter)
            // fileEvents: vscode.workspace.createFileSystemWatcher('**/.sol.js'),
        },
        initializationOptions: context.extensionPath,
    };

    let clientDisposable;

    if (ws) {
        clientDisposable = new LanguageClient(
            'solidity',
            'Solidity Language Server',
            serverOptions,
            clientOptions).start();
    }
    // Push the disposable to the context's subscriptions so that the
    // client can be deactivated on extension deactivation
    context.subscriptions.push(clientDisposable);
}
