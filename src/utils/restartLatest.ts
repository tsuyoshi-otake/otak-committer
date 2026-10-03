/**
 * Wrap an async task so a new call cancels the running call and starts only
 * after that call has settled.
 *
 * Each call gets its own AbortSignal. A new call aborts the previous call's
 * signal and waits until the previous call has finished, including any
 * cleanup it runs after the abort, so two runs never overlap. A call starts
 * asynchronously; one that is superseded before it starts (even by a call made
 * in the same tick) never starts. A call's rejection is
 * reported to its own caller only, never to the call that replaced it.
 *
 * @param task - The task to run; it should stop promptly once its signal aborts
 * @returns A function that starts the task for the latest call only
 */
export function restartLatest<A extends unknown[]>(
    task: (signal: AbortSignal, ...args: A) => Promise<void>,
): (...args: A) => Promise<void> {
    let previousSettled: Promise<void> = Promise.resolve();
    let previousController: AbortController | undefined;

    return (...args: A) => {
        previousController?.abort();
        const controller = new AbortController();
        const waitForPrevious = previousSettled;

        const run = (async () => {
            await waitForPrevious;
            if (controller.signal.aborted) {
                return;
            }
            await task(controller.signal, ...args);
        })();

        previousController = controller;
        previousSettled = run.then(
            () => undefined,
            () => undefined,
        );
        return run;
    };
}
