import * as assert from 'assert';
import { ErrorHandler } from '../../infrastructure/error/ErrorHandler';
import { createMockExtensionContext, TestCommand } from './baseCommandTestHelpers';

suite('BaseCommand Integration Tests', () => {
    let mockContext: ReturnType<typeof createMockExtensionContext>;

    setup(() => {
        mockContext = createMockExtensionContext();
    });

    test('should use infrastructure components together', async () => {
        const command = new TestCommand(mockContext);
        const logger = command.getLogger();
        const config = command.getConfig();
        const storage = command.getStorage();

        assert.ok(logger);
        assert.ok(config);
        assert.ok(storage);

        logger.setLogLevel(0);
        const allConfig = config.getAll();
        assert.ok(allConfig);
    });

    test('should handle errors during progress tasks', async () => {
        const command = new TestCommand(mockContext);
        const testError = new Error('Task failed');
        let errorHandled = false;
        const originalHandle = ErrorHandler.handle;

        (ErrorHandler as any).handle = () => {
            errorHandled = true;
        };

        try {
            await command.testWithProgress('Failing Task', async () => {
                throw testError;
            });
        } catch (error) {
            command.testHandleError(error, 'progress task');
        }

        ErrorHandler.handle = originalHandle;

        assert.strictEqual(errorHandled, true);
    });

    test('should maintain context across multiple operations', async () => {
        const command = new TestCommand(mockContext);

        await command.testWithProgress('Operation 1', async () => 'result1');
        command.testHandleError(new Error('Test'), 'operation 2');
        await command.execute('test');

        assert.strictEqual(command.getContext(), mockContext);
        assert.ok(command.getLogger());
        assert.ok(command.getConfig());
        assert.ok(command.getStorage());
    });
});
