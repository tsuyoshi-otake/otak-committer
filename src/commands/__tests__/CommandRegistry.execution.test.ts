import * as assert from 'assert';
import { CommandRegistry, Command } from '../CommandRegistry';
import {
    CommandRegistryMocks,
    createMockExtensionContext,
    installCommandRegistryMocks,
} from './commandRegistryTestHelpers';

suite('CommandRegistry Command Execution', () => {
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

    test('should register commands with VS Code', () => {
        const command: Command = {
            id: 'test.command',
            title: 'Test Command',
            handler: async () => {},
        };

        registry.register(command);
        registry.registerAll(mockContext);

        assert.strictEqual(mocks.registeredCommands.has('test.command'), true);
    });

    test('should execute command handler when invoked', async () => {
        let executed = false;

        registry.register({
            id: 'test.command',
            title: 'Test Command',
            handler: async () => {
                executed = true;
            },
        });
        registry.registerAll(mockContext);

        const handler = mocks.registeredCommands.get('test.command');
        assert.ok(handler);

        await handler();

        assert.strictEqual(executed, true);
    });

    test('should pass arguments to command handler', async () => {
        let receivedArgs: any[] = [];

        registry.register({
            id: 'test.command',
            title: 'Test Command',
            handler: async (...args: any[]) => {
                receivedArgs = args;
            },
        });
        registry.registerAll(mockContext);

        const handler = mocks.registeredCommands.get('test.command');
        assert.ok(handler);

        await handler('arg1', 'arg2', 123);

        assert.deepStrictEqual(receivedArgs, ['arg1', 'arg2', 123]);
    });

    test('should handle synchronous command handlers', async () => {
        let executed = false;

        registry.register({
            id: 'test.command',
            title: 'Test Command',
            handler: () => {
                executed = true;
            },
        });
        registry.registerAll(mockContext);

        const handler = mocks.registeredCommands.get('test.command');
        assert.ok(handler);

        await handler();

        assert.strictEqual(executed, true);
    });

    test('should add disposables to context subscriptions', () => {
        registry.register({
            id: 'test.command',
            title: 'Test Command',
            handler: async () => {},
        });

        const initialSubscriptionCount = mockContext.subscriptions.length;

        registry.registerAll(mockContext);

        assert.strictEqual(mockContext.subscriptions.length, initialSubscriptionCount + 1);
    });

    test('should register all commands with VS Code', () => {
        const commands: Command[] = [
            { id: 'test.command1', title: 'Test Command 1', handler: async () => {} },
            { id: 'test.command2', title: 'Test Command 2', handler: async () => {} },
            { id: 'test.command3', title: 'Test Command 3', handler: async () => {} },
        ];

        commands.forEach((cmd) => registry.register(cmd));
        registry.registerAll(mockContext);

        assert.strictEqual(mocks.registeredCommands.size, 3);
        commands.forEach((cmd) => {
            assert.strictEqual(mocks.registeredCommands.has(cmd.id), true);
        });
    });

    test('should handle multiple command executions', async () => {
        let executionCount = 0;

        registry.register({
            id: 'test.command',
            title: 'Test Command',
            handler: async () => {
                executionCount++;
            },
        });
        registry.registerAll(mockContext);

        const handler = mocks.registeredCommands.get('test.command');
        assert.ok(handler);

        await handler();
        await handler();
        await handler();

        assert.strictEqual(executionCount, 3);
    });
});
