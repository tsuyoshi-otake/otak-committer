import * as assert from 'assert';
import { CancellationTokenLike, runWithAbortOnCancel } from '../cancellation';

function createToken(cancelled = false) {
    const listeners = new Set<() => void>();
    let isCancelled = cancelled;
    const token: CancellationTokenLike & { cancel(): void; listenerCount(): number } = {
        get isCancellationRequested() {
            return isCancelled;
        },
        onCancellationRequested(listener) {
            listeners.add(listener);
            return { dispose: () => listeners.delete(listener) };
        },
        cancel() {
            isCancelled = true;
            for (const listener of [...listeners]) {
                listener();
            }
        },
        listenerCount: () => listeners.size,
    };
    return token;
}

suite('runWithAbortOnCancel', () => {
    test('aborts the signal when the progress is cancelled mid-task', async () => {
        const token = createToken();

        await assert.rejects(
            runWithAbortOnCancel(
                token,
                (signal) =>
                    new Promise<never>((_resolve, reject) => {
                        signal.addEventListener('abort', () =>
                            reject(Object.assign(new Error('aborted'), { name: 'AbortError' })),
                        );
                        token.cancel();
                    }),
            ),
            /aborted/,
        );
    });

    test('passes an already-aborted signal when the token was cancelled before the task', async () => {
        const token = createToken(true);

        const aborted = await runWithAbortOnCancel(token, async (signal) => signal.aborted);

        assert.strictEqual(aborted, true);
    });

    test('returns the task result and disposes the token subscription', async () => {
        const token = createToken();

        const result = await runWithAbortOnCancel(token, async (signal) => {
            assert.strictEqual(signal.aborted, false);
            assert.strictEqual(token.listenerCount(), 1);
            return 42;
        });

        assert.strictEqual(result, 42);
        assert.strictEqual(token.listenerCount(), 0);
    });
});
