import * as vscode from 'vscode';

/**
 * Show a notification to the user for a specified duration.
 *
 * @param title - The notification title
 * @param duration - Duration in milliseconds
 */
export async function showTimedNotification(title: string, duration: number): Promise<void> {
    await vscode.window.withProgress(
        {
            location: vscode.ProgressLocation.Notification,
            title,
            cancellable: false,
        },
        async () => {
            return new Promise<void>((resolve) => {
                setTimeout(resolve, duration);
            });
        },
    );
}
