import * as vscode from 'vscode';

/**
 * Branch selection result
 */
export interface BranchSelection {
    /** The base branch name */
    base: string;
    /** The compare branch name */
    compare: string;
}

/**
 * Interface for managing Git branches
 */
export interface BranchManager {
    /** Get the current branch name */
    getCurrentBranch(): Promise<string | undefined>;
    /** Get all branches in the repository */
    getBranches(): Promise<string[]>;
}

/**
 * Utility class for branch selection operations
 * 
 * Provides methods for sorting and selecting branches with user-friendly
 * quick pick interfaces.
 * 
 * @example
 * ```typescript
 * const selection = await BranchSelector.selectBranches(branchManager);
 * if (selection) {
 *   console.log(`Selected: ${selection.base} <- ${selection.compare}`);
 * }
 * ```
 */
export class BranchSelector {
    /** Default base branches that are prioritized in selection */
    static readonly DEFAULT_BASE_BRANCHES = ['develop', 'main', 'master'];

    /**
     * Sort branches for display in quick pick
     * 
     * Prioritizes default base branches and marks the current branch.
     * 
     * @param branches - Array of branch names
     * @param currentBranch - The current branch name (optional)
     * @returns Sorted array of quick pick items
     * 
     * @example
     * ```typescript
     * const items = BranchSelector.sortBranches(branches, 'feature/new');
     * ```
     */
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

    /**
     * Prompt user to select base and compare branches
     * 
     * Shows two sequential quick pick menus for selecting branches.
     * The current branch is highlighted and prioritized in the compare selection.
     * 
     * @param manager - Branch manager instance
     * @returns Branch selection or undefined if cancelled
     * 
     * @example
     * ```typescript
     * const selection = await BranchSelector.selectBranches(branchManager);
     * if (selection) {
     *   console.log(`Creating PR: ${selection.compare} -> ${selection.base}`);
     * }
     * ```
     */
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
                if (a.label === currentBranch) {
                    return -1;
                }
                if (b.label === currentBranch) {
                    return 1;
                }
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