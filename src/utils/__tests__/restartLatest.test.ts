import * as assert from 'assert';
import { restartLatest } from '../restartLatest';

function deferred() {
    let resolve!: () => void;
    const promise = new Promise<void>((res) => {
        resolve = res;
    });
    return { promise, resolve };
}

function abortedError(signal: AbortSignal): Promise<never> {
    return new Promise((_, reject) => {
        signal.addEventListener('abort', () => reject(new Error('aborted')), { once: true });
    });
}

suite('restartLatest', () => {
    test('a new call aborts the running call and starts only after its cleanup finished', async () => {
        const events: string[] = [];
        const cleanupGate = deferred();
        const started = deferred();
        const run = restartLatest(async (signal: AbortSignal, name: string) => {
            events.push(`${name} start`);
            if (name !== 'first') {
                return;
            }
            started.resolve();
            try {
                await abortedError(signal);
            } finally {
                events.push('first aborted');
                await cleanupGate.promise;
                events.push('first cleanup done');
            }
        });

        const first = run('first');
        await started.promise;
        const second = run('second');
        await new Promise((resolve) => setTimeout(resolve, 10));
        assert.deepStrictEqual(events, ['first start', 'first aborted']);

        cleanupGate.resolve();
        await assert.rejects(first, /aborted/);
        await second;

        assert.deepStrictEqual(events, [
            'first start',
            'first aborted',
            'first cleanup done',
            'second start',
        ]);
    });

    test('a call superseded while it waits never starts', async () => {
        const started: string[] = [];
        const firstGate = deferred();
        const firstStarted = deferred();
        const run = restartLatest(async (_signal: AbortSignal, name: string) => {
            started.push(name);
            if (name === 'first') {
                firstStarted.resolve();
                await firstGate.promise;
            }
        });

        const first = run('first');
        await firstStarted.promise;
        const second = run('second');
        const third = run('third');
        firstGate.resolve();
        await Promise.all([first, second, third]);

        assert.deepStrictEqual(started, ['first', 'third']);
    });

    test("the replaced call's failure reaches only its own caller", async () => {
        const firstStarted = deferred();
        const run = restartLatest(async (signal: AbortSignal, name: string) => {
            if (name === 'first') {
                firstStarted.resolve();
                await abortedError(signal);
            }
        });

        const first = run('first');
        await firstStarted.promise;
        const second = run('second');

        await assert.rejects(first, /aborted/);
        await assert.doesNotReject(second);
    });

    test('a call after a finished call starts with a fresh, unaborted signal', async () => {
        const signals: AbortSignal[] = [];
        const run = restartLatest(async (signal: AbortSignal) => {
            signals.push(signal);
            assert.strictEqual(signal.aborted, false);
        });

        await run();
        await run();

        assert.strictEqual(signals.length, 2);
        assert.notStrictEqual(signals[0], signals[1]);
    });
});
