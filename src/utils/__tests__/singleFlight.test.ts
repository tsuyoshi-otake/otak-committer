import * as assert from 'assert';
import { singleFlight } from '../singleFlight';

function deferred() {
    let resolve!: () => void;
    let reject!: (error: Error) => void;
    const promise = new Promise<void>((res, rej) => {
        resolve = res;
        reject = rej;
    });
    return { promise, resolve, reject };
}

suite('singleFlight', () => {
    test('skips a call made while the previous call is running', async () => {
        const gate = deferred();
        let runs = 0;
        let skipped = 0;
        const guarded = singleFlight(
            async () => {
                runs++;
                await gate.promise;
            },
            () => skipped++,
        );

        const first = guarded();
        await guarded();
        gate.resolve();
        await first;

        assert.strictEqual(runs, 1);
        assert.strictEqual(skipped, 1);
    });

    test('runs again once the previous call has finished', async () => {
        let runs = 0;
        const guarded = singleFlight(async () => {
            runs++;
        });

        await guarded();
        await guarded();

        assert.strictEqual(runs, 2);
    });

    test('a failed call releases the guard and keeps its error', async () => {
        const gate = deferred();
        let runs = 0;
        const guarded = singleFlight(async () => {
            runs++;
            if (runs === 1) {
                await gate.promise;
            }
        });

        const first = guarded();
        gate.reject(new Error('boom'));
        await assert.rejects(first, /boom/);
        await guarded();

        assert.strictEqual(runs, 2);
    });

    test('forwards the arguments of the call that runs', async () => {
        const seen: unknown[][] = [];
        const guarded = singleFlight(async (...args: unknown[]) => {
            seen.push(args);
        });

        await guarded('scm', 1);

        assert.deepStrictEqual(seen, [['scm', 1]]);
    });
});
