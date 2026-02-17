import * as vscode from 'vscode';
import * as path from 'path';

interface FileQuickPickItem extends vscode.QuickPickItem {
    fullPath: string;
}

export async function selectFiles(files: string[]): Promise<string[] | undefined> {
    // Get workspace root
    const workspaceRoot = vscode.workspace.workspaceFolders?.[0]?.uri.fsPath;
    if (!workspaceRoot) {
        throw new Error('No workspace folder found');
    }

    const items: FileQuickPickItem[] = files.map((fullPath) => ({
        label: path.relative(workspaceRoot, fullPath).replace(/\\/g, '/'),
        fullPath,
    }));

    const selected = await vscode.window.showQuickPick(items, {
        canPickMany: true,
        ignoreFocusOut: true,
        title: 'Select files to include in analysis',
        placeHolder: 'Type to search files',
    });

    if (!selected) {
        return undefined;
    }

    return selected.map((item) => item.fullPath);
}
