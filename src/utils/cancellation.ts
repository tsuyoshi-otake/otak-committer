/**
 * Structural subset of `vscode.CancellationToken`, so this module stays vscode-free.
 */
export interface CancellationTokenLike {
    readonly isCancellationRequested: boolean;
    onCancellationRequested(listener: () => void): { dispose(): unknown };
}

/**
 * Run a task with an AbortSignal that aborts when the token is cancelled.
 *
 * Bridges a cancellable progress notification to request cancellation: aborting
 * the signal makes in-flight OpenAI requests reject with an abort error, which
 * callers propagate and `ErrorHandler` treats as a user cancellation. The token
 * subscription is disposed once the task settles.
 *
 * @param token - Cancellation token of the progress notification
 * @param task - Work that forwards the signal to every cancellable request
 * @returns The task result
 */
export async function runWithAbortOnCancel<T>(
    token: CancellationTokenLike,
    task: (signal: AbortSignal) => Promise<T>,
): Promise<T> {
    const controller = new AbortController();
    if (token.isCancellationRequested) {
        controller.abort();
    }
    const subscription = token.onCancellationRequested(() => controller.abort());
    try {
        return await task(controller.signal);
    } finally {
        subscription.dispose();
    }
}
