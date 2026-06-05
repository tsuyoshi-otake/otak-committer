import * as assert from 'assert';
import { BaseCommand } from '../BaseCommand';
import { Logger } from '../../infrastructure/logging/Logger';
import { ConfigManager } from '../../infrastructure/config/ConfigManager';
import { StorageManager } from '../../infrastructure/storage/StorageManager';
import { createMockExtensionContext, TestCommand } from './baseCommandTestHelpers';

suite('BaseCommand Context Initialization', () => {
    let mockContext: ReturnType<typeof createMockExtensionContext>;

    setup(() => {
        mockContext = createMockExtensionContext();
    });

    test('should initialize with extension context', () => {
        const command = new TestCommand(mockContext);

        assert.ok(command);
        assert.strictEqual(command.getContext(), mockContext);
    });

    test('should initialize logger instance', () => {
        const command = new TestCommand(mockContext);

        const logger = command.getLogger();
        assert.ok(logger);
        assert.strictEqual(logger, Logger.getInstance());
    });

    test('should initialize config manager', () => {
        const command = new TestCommand(mockContext);

        const config = command.getConfig();
        assert.ok(config);
        assert.ok(config instanceof ConfigManager);
    });

    test('should initialize storage manager with context', () => {
        const command = new TestCommand(mockContext);

        const storage = command.getStorage();
        assert.ok(storage);
        assert.ok(storage instanceof StorageManager);
    });

    test('should have all infrastructure components available', () => {
        const command = new TestCommand(mockContext);

        assert.ok(command.getLogger(), 'Logger should be initialized');
        assert.ok(command.getConfig(), 'ConfigManager should be initialized');
        assert.ok(command.getStorage(), 'StorageManager should be initialized');
        assert.ok(command.getContext(), 'Context should be available');
    });

    test('should share logger singleton across multiple commands', () => {
        const command1 = new TestCommand(mockContext);
        const command2 = new TestCommand(mockContext);

        assert.strictEqual(command1.getLogger(), command2.getLogger());
    });

    test('should create separate config managers for each command', () => {
        const command1 = new TestCommand(mockContext);
        const command2 = new TestCommand(mockContext);

        assert.ok(command1.getConfig() !== command2.getConfig());
    });

    test('should create separate storage managers for each command', () => {
        const command1 = new TestCommand(mockContext);
        const command2 = new TestCommand(mockContext);

        assert.ok(command1.getStorage() !== command2.getStorage());
    });

    test('should require execute implementation', () => {
        const command = new TestCommand(mockContext);

        assert.strictEqual(typeof command.execute, 'function');
    });

    test('should call execute with provided arguments', async () => {
        const command = new TestCommand(mockContext);

        await command.execute('arg1', 'arg2', 123);

        assert.strictEqual(command.executeCalled, true);
        assert.deepStrictEqual(command.executeArgs, ['arg1', 'arg2', 123]);
    });

    test('should handle execute with no arguments', async () => {
        const command = new TestCommand(mockContext);

        await command.execute();

        assert.strictEqual(command.executeCalled, true);
        assert.deepStrictEqual(command.executeArgs, []);
    });

    test('should handle async execute', async () => {
        class AsyncCommand extends BaseCommand {
            public result: string = '';

            async execute(): Promise<void> {
                await new Promise((resolve) => setTimeout(resolve, 10));
                this.result = 'completed';
            }
        }

        const command = new AsyncCommand(mockContext);
        await command.execute();

        assert.strictEqual(command.result, 'completed');
    });
});
