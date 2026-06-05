import * as assert from 'assert';
import { CommandRegistry, Command } from '../CommandRegistry';
import {
    CommandRegistryMocks,
    createMockExtensionContext,
    installCommandRegistryMocks,
} from './commandRegistryTestHelpers';

suite('CommandRegistry Integration Tests', () => {
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

    test('should support complete command lifecycle', async () => {
        let executed = false;

        const command: Command = {
            id: 'test.command',
            title: 'Test Command',
            category: 'Test',
            handler: async () => {
                executed = true;
            },
        };

        registry.register(command);
        assert.strictEqual(registry.hasCommand('test.command'), true);

        registry.registerAll(mockContext);
        assert.strictEqual(mocks.registeredCommands.has('test.command'), true);

        const handler = mocks.registeredCommands.get('test.command');
        assert.ok(handler);
        await handler();

        assert.strictEqual(executed, true);
    });

    test('should handle empty registry', () => {
        assert.strictEqual(registry.getCommandCount(), 0);
        assert.strictEqual(registry.getCommandIds().length, 0);

        registry.registerAll(mockContext);

        assert.strictEqual(mockContext.subscriptions.length, 0);
    });
});
