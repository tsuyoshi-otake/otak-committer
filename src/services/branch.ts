import * as vscode from 'vscode';

export interface BranchSelection {
    base: string;
    compare: string;
}

export interface BranchManager {
    getCurrentBranch(): Promise<string | undefined>;
    getBranches(): Promise<string[]>;
}

export class BranchSelector {
    static readonly DEFAULT_BASE_BRANCHES = ['develop', 'main', 'master'];

    static sortBranches(branches: string[], currentBranch?: string): vscode.QuickPickItem[] {
        return branches
            .map(branch => ({
                label: branch,
                description: branch === currentBranch ? '(current)' : undefined,
                sortOrder: this.DEFAULT_BASE_BRANCHES.indexOf(branch)
            }))
            .sort((a, b) => {
                if (a.sortOrder !== -1 || b.sortOrder !== -1) {
                    return (a.sortOrder === -1 ? 999 : a.sortOrder) - (b.sortOrder === -1 ? 999 : b.sortOrder);
                }
                return a.label.localeCompare(b.label);
            });
    }

    static async selectBranches(manager: BranchManager): Promise<BranchSelection | undefined> {
        const branches = await manager.getBranches();
        const currentBranch = await manager.getCurrentBranch();

        const baseItems = this.sortBranches(
            branches.filter(b => b !== currentBranch)
        );
        
        const baseItem = await vscode.window.showQuickPick(baseItems, {
            placeHolder: 'Select base branch'
        });

        if (!baseItem) {
            return undefined;
        }

        const compareItems = branches
            .filter(branch => branch !== baseItem.label)
            .map(branch => ({
                label: branch,
                description: branch === currentBranch ? '(current)' : undefined
            }))
            .sort((a, b) => {
                if (a.label === currentBranch) return -1;
                if (b.label === currentBranch) return 1;
                return a.label.localeCompare(b.label);
            });

        const compareItem = await vscode.window.showQuickPick(compareItems, {
            placeHolder: 'Select compare branch'
        });

        if (!compareItem) {
            return undefined;
        }

        return {
            base: baseItem.label,
            compare: compareItem.label
        };
    }
}