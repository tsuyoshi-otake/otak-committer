import * as assert from 'assert';
import { CommandRegistry, Command } from '../CommandRegistry';
import {
    CommandRegistryMocks,
    createMockExtensionContext,
    installCommandRegistryMocks,
} from './commandRegistryTestHelpers';

suite('CommandRegistry Error Handling', () => {
    let registry: CommandRegistry;
    let mockContext: ReturnType<typeof createMockExtensionContext>;
    let mocks: CommandRegistryMocks;

    setup(() => {
        registry = new CommandRegistry();
        mockContext = createMockExtensionContext();
        mocks = installCommandRegistryMocks();
    });

    teardown(() => {
        mocks.restore();
    });

    test('should handle errors through ErrorHandler', async () => {
        const testError = new Error('Command failed');

        registry.register({
            id: 'test.command',
            title: 'Test Command',
            handler: async () => {
                throw testError;
            },
        });
        registry.registerAll(mockContext);

        const handler = mocks.registeredCommands.get('test.command');
        assert.ok(handler);

        await handler();

        assert.strictEqual(mocks.handledErrors.length, 1);
        assert.strictEqual(mocks.handledErrors[0].error, testError);
    });

    test('should include command metadata in error context', async () => {
        const testError = new Error('Command failed');

        registry.register({
            id: 'test.command',
            title: 'Test Command',
            category: 'Test Category',
            handler: async () => {
                throw testError;
            },
        });
        registry.registerAll(mockContext);

        const handler = mocks.registeredCommands.get('test.command');
        assert.ok(handler);

        await handler();

        assert.strictEqual(mocks.handledErrors.length, 1);
        const context = mocks.handledErrors[0].context;

        assert.ok(context.operation.includes('Test Command'));
        assert.strictEqual(context.component, 'CommandRegistry');
        assert.strictEqual(context.metadata.commandId, 'test.command');
        assert.strictEqual(context.metadata.commandTitle, 'Test Command');
        assert.strictEqual(context.metadata.commandCategory, 'Test Category');
    });

    test('should not throw when command handler throws', async () => {
        registry.register({
            id: 'test.command',
            title: 'Test Command',
            handler: async () => {
                throw new Error('Command failed');
            },
        });
        registry.registerAll(mockContext);

        const handler = mocks.registeredCommands.get('test.command');
        assert.ok(handler);

        await handler();

        assert.strictEqual(mocks.handledErrors.length, 1);
    });

    test('should handle errors in synchronous handlers', async () => {
        const testError = new Error('Sync command failed');

        registry.register({
            id: 'test.command',
            title: 'Test Command',
            handler: () => {
                throw testError;
            },
        });
        registry.registerAll(mockContext);

        const handler = mocks.registeredCommands.get('test.command');
        assert.ok(handler);

        await handler();

        assert.strictEqual(mocks.handledErrors.length, 1);
        assert.strictEqual(mocks.handledErrors[0].error, testError);
    });

    test('should handle errors in multiple command executions', async () => {
        registry.register({
            id: 'test.command',
            title: 'Test Command',
            handler: async () => {
                throw new Error('Command failed');
            },
        });
        registry.registerAll(mockContext);

        const handler = mocks.registeredCommands.get('test.command');
        assert.ok(handler);

        await handler();
        await handler();

        assert.strictEqual(mocks.handledErrors.length, 2);
    });

    test('should handle different error types', async () => {
        const commands: Command[] = [
            {
                id: 'test.error1',
                title: 'Error Command 1',
                handler: async () => {
                    throw new Error('Standard error');
                },
            },
            {
                id: 'test.error2',
                title: 'Error Command 2',
                handler: async () => {
                    throw new TypeError('Type error');
                },
            },
            {
                id: 'test.error3',
                title: 'Error Command 3',
                handler: async () => {
                    throw new Error('String error');
                },
            },
        ];

        commands.forEach((cmd) => registry.register(cmd));
        registry.registerAll(mockContext);

        for (const cmd of commands) {
            const handler = mocks.registeredCommands.get(cmd.id);
            assert.ok(handler);
            await handler();
        }

        assert.strictEqual(mocks.handledErrors.length, 3);
    });
});
