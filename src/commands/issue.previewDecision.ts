/**
 * Next state of the issue preview loop after the modification input closes.
 *
 * Only an explicit "create" choice in the action picker may publish the issue, so
 * dismissing the modification input never resolves to the unchanged preview.
 */
export type IssueModificationStep =
    | { action: 'regenerate'; instructions: string }
    | { action: 'choose-again' };

/**
 * Resolve the modification input without performing UI or generation side effects.
 *
 * @param instructions - Text entered by the user, or undefined when the input was dismissed (Esc)
 * @returns Regenerate with the instructions, or return to the action picker
 */
export function decideIssueModificationStep(
    instructions: string | undefined,
): IssueModificationStep {
    if (instructions === undefined || !instructions.trim()) {
        return { action: 'choose-again' };
    }
    return { action: 'regenerate', instructions };
}
