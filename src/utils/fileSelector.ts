import * as vscode from 'vscode';

interface FileQuickPickItem extends vscode.QuickPickItem {
    file: string;
    selected: boolean;
}

export async function selectFiles(files: string[]): Promise<string[]> {
    const quickPick = vscode.window.createQuickPick<FileQuickPickItem>();
    const items = files.map(file => ({
        label: `${file}`,
        file,
        selected: false,
        description: '',
        picked: false
    }));

    quickPick.items = items;
    quickPick.canSelectMany = true;
    quickPick.title = 'Select files to include in analysis';
    quickPick.placeholder = 'Type to search files, Space to select/deselect';

    // Filter functionality
    quickPick.onDidChangeValue(value => {
        const searchValue = value.toLowerCase();
        quickPick.items = items.filter(item => 
            item.file.toLowerCase().includes(searchValue) ||
            (item.picked && 'Selected'.toLowerCase().includes(searchValue))
        ).map(item => ({
            ...item,
            description: item.picked ? '$(check) Selected' : ''
        }));
    });

    // Track selected items
    const selectedFiles = new Set<string>();
    quickPick.onDidChangeSelection(items => {
        items.forEach(item => {
            if (!selectedFiles.has(item.file)) {
                selectedFiles.add(item.file);
                item.picked = true;
                item.description = '$(check) Selected';
            } else {
                selectedFiles.delete(item.file);
                item.picked = false;
                item.description = '';
            }
        });
        quickPick.items = [...quickPick.items];
    });

    return new Promise<string[]>(resolve => {
        quickPick.onDidAccept(() => {
            const selected = quickPick.items
                .filter(item => item.picked)
                .map(item => item.file);
            quickPick.dispose();
            resolve(selected);
        });

        quickPick.onDidHide(() => {
            quickPick.dispose();
            resolve([]);
        });

        quickPick.show();
    });
}