/**
 * Wrap an async task so a call made while a previous call is still running is
 * skipped instead of starting a second, overlapping run.
 *
 * The in-flight flag is cleared when the running call settles, whether it
 * resolves or rejects, so a failure never blocks later calls.
 *
 * @param task - The task to guard
 * @param onSkipped - Called for each skipped call (e.g. to log it)
 * @returns A guarded function; a skipped call resolves immediately
 */
export function singleFlight<A extends unknown[]>(
    task: (...args: A) => Promise<void>,
    onSkipped?: () => void,
): (...args: A) => Promise<void> {
    let running = false;
    return async (...args: A) => {
        if (running) {
            onSkipped?.();
            return;
        }
        running = true;
        try {
            await task(...args);
        } finally {
            running = false;
        }
    };
}
