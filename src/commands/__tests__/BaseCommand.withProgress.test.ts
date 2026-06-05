import * as assert from 'assert';
import * as vscode from 'vscode';
import {
    createMockExtensionContext,
    installProgressMock,
    ProgressMock,
    TestCommand,
} from './baseCommandTestHelpers';

suite('BaseCommand withProgress Helper', () => {
    let mockContext: ReturnType<typeof createMockExtensionContext>;
    let progressMock: ProgressMock;

    setup(() => {
        mockContext = createMockExtensionContext();
        progressMock = installProgressMock();
    });

    teardown(() => {
        progressMock.restore();
    });

    test('should execute task with progress notification', async () => {
        const command = new TestCommand(mockContext);
        let taskExecuted = false;

        await command.testWithProgress('Test Progress', async () => {
            taskExecuted = true;
        });

        assert.strictEqual(taskExecuted, true);
        assert.strictEqual(progressMock.progressCalls.length, 1);
    });

    test('should display correct progress title', async () => {
        const command = new TestCommand(mockContext);

        await command.testWithProgress('Loading data...', async () => {});

        assert.strictEqual(progressMock.progressCalls.length, 1);
        assert.strictEqual(progressMock.progressCalls[0].title, 'Loading data...');
    });

    test('should use Notification location', async () => {
        const command = new TestCommand(mockContext);

        await command.testWithProgress('Processing...', async () => {});

        assert.strictEqual(progressMock.progressCalls.length, 1);
        assert.strictEqual(
            progressMock.progressCalls[0].location,
            vscode.ProgressLocation.Notification,
        );
    });

    test('should return task result', async () => {
        const command = new TestCommand(mockContext);
        const expectedResult = { data: 'test result' };

        const result = await command.testWithProgress('Test', async () => expectedResult);

        assert.deepStrictEqual(result, expectedResult);
    });

    test('should handle async tasks', async () => {
        const command = new TestCommand(mockContext);
        let counter = 0;

        const result = await command.testWithProgress('Async Task', async () => {
            await new Promise((resolve) => setTimeout(resolve, 10));
            counter++;
            return counter;
        });

        assert.strictEqual(result, 1);
        assert.strictEqual(counter, 1);
    });

    test('should propagate task errors', async () => {
        const command = new TestCommand(mockContext);
        const testError = new Error('Task failed');

        try {
            await command.testWithProgress('Failing Task', async () => {
                throw testError;
            });
            assert.fail('Should have thrown error');
        } catch (error) {
            assert.strictEqual(error, testError);
        }
    });

    test('should handle multiple sequential progress calls', async () => {
        const command = new TestCommand(mockContext);

        await command.testWithProgress('First Task', async () => 'first');
        await command.testWithProgress('Second Task', async () => 'second');

        assert.strictEqual(progressMock.progressCalls.length, 2);
        assert.strictEqual(progressMock.progressCalls[0].title, 'First Task');
        assert.strictEqual(progressMock.progressCalls[1].title, 'Second Task');
    });

    test('should handle empty title', async () => {
        const command = new TestCommand(mockContext);

        await command.testWithProgress('', async () => 'result');

        assert.strictEqual(progressMock.progressCalls.length, 1);
        assert.strictEqual(progressMock.progressCalls[0].title, '');
    });

    test('should handle tasks that return undefined', async () => {
        const command = new TestCommand(mockContext);

        const result = await command.testWithProgress('Task', async () => {});

        assert.strictEqual(result, undefined);
    });

    test('should handle tasks that return primitive values', async () => {
        const command = new TestCommand(mockContext);

        const stringResult = await command.testWithProgress('String Task', async () => 'test');
        const numberResult = await command.testWithProgress('Number Task', async () => 42);
        const boolResult = await command.testWithProgress('Bool Task', async () => true);

        assert.strictEqual(stringResult, 'test');
        assert.strictEqual(numberResult, 42);
        assert.strictEqual(boolResult, true);
    });
});
