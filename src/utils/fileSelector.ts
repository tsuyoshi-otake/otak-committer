import * as vscode from 'vscode';
import * as path from 'path';

interface FileQuickPickItem extends vscode.QuickPickItem {
    file: string;
}

export async function selectFiles(files: string[]): Promise<string[]> {
    // Get workspace root
    const workspaceRoot = vscode.workspace.workspaceFolders?.[0]?.uri.fsPath;
    if (!workspaceRoot) {
        throw new Error('No workspace folder found');
    }

    const quickPick = vscode.window.createQuickPick<FileQuickPickItem>();
    const selectedFiles = new Set<string>();

    // Convert full paths to relative paths
    const relativePaths = files.map(file => {
        const relativePath = path.relative(workspaceRoot, file);
        return relativePath.replace(/\\/g, '/'); // Normalize to forward slashes
    });

    const createItems = () => relativePaths.map(file => ({
        label: selectedFiles.has(file) ? '$(check) ' + file : file,
        description: selectedFiles.has(file) ? 'Selected' : '',
        file
    }));

    quickPick.items = createItems();
    quickPick.title = 'Select files to include in analysis (Enter to select/deselect)';
    quickPick.placeholder = 'Type to search files';

    // Add buttons
    quickPick.buttons = [
        {
            iconPath: new vscode.ThemeIcon('arrow-right'),
            tooltip: 'Next'
        }
    ];

    // Filter functionality
    quickPick.onDidChangeValue(value => {
        const searchValue = value.toLowerCase();
        quickPick.items = relativePaths
            .filter(file => 
                file.toLowerCase().includes(searchValue) ||
                selectedFiles.has(file)
            )
            .map(file => ({
                label: selectedFiles.has(file) ? '$(check) ' + file : file,
                description: selectedFiles.has(file) ? 'Selected' : '',
                file
            }));
    });

    // Handle selection changes
    quickPick.onDidAccept(async () => {
        const selected = quickPick.activeItems[0];
        if (selected) {
            if (selectedFiles.has(selected.file)) {
                selectedFiles.delete(selected.file);
            } else {
                selectedFiles.add(selected.file);
            }
            quickPick.items = createItems();

            // フォーカスを維持
            const currentValue = quickPick.value;
            quickPick.value = '';
            quickPick.value = currentValue;
        }
    });

    quickPick.onDidTriggerButton(() => {
        quickPick.hide();
    });

    return new Promise<string[]>(resolve => {
        // Handle final selection
        const disposables: vscode.Disposable[] = [];

        disposables.push(
            quickPick.onDidHide(() => {
                disposables.forEach(d => d.dispose());
                // Convert back to full paths when returning
                resolve([...selectedFiles].map(relativePath => 
                    path.join(workspaceRoot, relativePath)
                ));
            })
        );

        quickPick.show();
    });
}