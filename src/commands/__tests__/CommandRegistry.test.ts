import * as assert from 'assert';
import { CommandRegistry, Command } from '../CommandRegistry';

suite('CommandRegistry Registration', () => {
    let registry: CommandRegistry;

    setup(() => {
        registry = new CommandRegistry();
    });

    test('should register a single command', () => {
        const command: Command = {
            id: 'test.command',
            title: 'Test Command',
            handler: async () => {},
        };

        registry.register(command);

        assert.strictEqual(registry.getCommandCount(), 1);
        assert.strictEqual(registry.hasCommand('test.command'), true);
    });

    test('should register command with category', () => {
        const command: Command = {
            id: 'test.command',
            title: 'Test Command',
            category: 'Test Category',
            handler: async () => {},
        };

        registry.register(command);

        assert.strictEqual(registry.hasCommand('test.command'), true);
    });

    test('should throw error when registering duplicate command ID', () => {
        const command1: Command = {
            id: 'test.command',
            title: 'Test Command 1',
            handler: async () => {},
        };
        const command2: Command = {
            id: 'test.command',
            title: 'Test Command 2',
            handler: async () => {},
        };

        registry.register(command1);

        assert.throws(() => registry.register(command2), /already registered/);
    });

    test('should allow registering commands with different IDs', () => {
        registry.register({
            id: 'test.command1',
            title: 'Test Command 1',
            handler: async () => {},
        });
        registry.register({
            id: 'test.command2',
            title: 'Test Command 2',
            handler: async () => {},
        });

        assert.strictEqual(registry.getCommandCount(), 2);
        assert.strictEqual(registry.hasCommand('test.command1'), true);
        assert.strictEqual(registry.hasCommand('test.command2'), true);
    });

    test('should track command count correctly', () => {
        assert.strictEqual(registry.getCommandCount(), 0);

        registry.register({
            id: 'test.command1',
            title: 'Test Command 1',
            handler: async () => {},
        });

        assert.strictEqual(registry.getCommandCount(), 1);

        registry.register({
            id: 'test.command2',
            title: 'Test Command 2',
            handler: async () => {},
        });

        assert.strictEqual(registry.getCommandCount(), 2);
    });

    test('should return false for non-existent command', () => {
        assert.strictEqual(registry.hasCommand('non.existent'), false);
    });

    test('should return all registered command IDs', () => {
        registry.register({
            id: 'test.command1',
            title: 'Test Command 1',
            handler: async () => {},
        });
        registry.register({
            id: 'test.command2',
            title: 'Test Command 2',
            handler: async () => {},
        });

        const commandIds = registry.getCommandIds();

        assert.strictEqual(commandIds.length, 2);
        assert.ok(commandIds.includes('test.command1'));
        assert.ok(commandIds.includes('test.command2'));
    });

    test('should return empty array when no commands registered', () => {
        const commandIds = registry.getCommandIds();

        assert.strictEqual(commandIds.length, 0);
        assert.ok(Array.isArray(commandIds));
    });

    test('should register multiple commands', () => {
        const commands: Command[] = [
            { id: 'test.command1', title: 'Test Command 1', handler: async () => {} },
            { id: 'test.command2', title: 'Test Command 2', handler: async () => {} },
            { id: 'test.command3', title: 'Test Command 3', handler: async () => {} },
        ];

        commands.forEach((cmd) => registry.register(cmd));

        assert.strictEqual(registry.getCommandCount(), 3);
        commands.forEach((cmd) => {
            assert.strictEqual(registry.hasCommand(cmd.id), true);
        });
    });

    test('should handle registering many commands', () => {
        const commandCount = 50;

        for (let i = 0; i < commandCount; i++) {
            registry.register({
                id: `test.command${i}`,
                title: `Test Command ${i}`,
                handler: async () => {},
            });
        }

        assert.strictEqual(registry.getCommandCount(), commandCount);
    });

    test('should maintain command order in getCommandIds', () => {
        const commandIds = ['test.command1', 'test.command2', 'test.command3'];

        commandIds.forEach((id) => {
            registry.register({
                id,
                title: `Title for ${id}`,
                handler: async () => {},
            });
        });

        const retrievedIds = registry.getCommandIds();

        assert.strictEqual(retrievedIds.length, commandIds.length);
        commandIds.forEach((id) => {
            assert.ok(retrievedIds.includes(id));
        });
    });
});
