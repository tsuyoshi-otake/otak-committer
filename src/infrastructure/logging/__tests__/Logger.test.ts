/**
 * Unit tests for Logger
 * Note: These tests verify the Logger's core logic.
 * Full integration tests with VS Code APIs should be run in the extension test environment.
 */

import * as assert from 'assert';
import { Logger, LogLevel } from '../Logger.js';

suite('Logger Unit Tests', () => {
    suite('LogLevel Enum', () => {
        test('LogLevel enum values are correctly ordered', () => {
            assert.strictEqual(LogLevel.Debug, 0);
            assert.strictEqual(LogLevel.Info, 1);
            assert.strictEqual(LogLevel.Warning, 2);
            assert.strictEqual(LogLevel.Error, 3);
        });

        test('LogLevel enum has correct string names', () => {
            assert.strictEqual(LogLevel[LogLevel.Debug], 'Debug');
            assert.strictEqual(LogLevel[LogLevel.Info], 'Info');
            assert.strictEqual(LogLevel[LogLevel.Warning], 'Warning');
            assert.strictEqual(LogLevel[LogLevel.Error], 'Error');
        });

        test('Log levels can be compared for filtering', () => {
            const currentLevel = LogLevel.Info;

            // Debug should be filtered (0 < 1)
            assert.strictEqual(LogLevel.Debug < currentLevel, true);

            // Info should pass (1 >= 1)
            assert.strictEqual(LogLevel.Info >= currentLevel, true);

            // Warning should pass (2 >= 1)
            assert.strictEqual(LogLevel.Warning >= currentLevel, true);

            // Error should pass (3 >= 1)
            assert.strictEqual(LogLevel.Error >= currentLevel, true);
        });
    });

    suite('Log Level Filtering', () => {
        let logger: Logger;
        let loggedMessages: string[];
        let originalAppendLine: any;

        setup(() => {
            logger = Logger.getInstance();
            loggedMessages = [];

            // Mock the output channel's appendLine method
            const outputChannel = (logger as any).outputChannel;
            originalAppendLine = outputChannel.appendLine;
            outputChannel.appendLine = (message: string) => {
                loggedMessages.push(message);
            };
        });

        teardown(() => {
            // Restore original appendLine
            const outputChannel = (logger as any).outputChannel;
            outputChannel.appendLine = originalAppendLine;
            loggedMessages = [];
        });

        test('should filter messages below current log level', () => {
            logger.setLogLevel(LogLevel.Warning);

            logger.debug('Debug message');
            logger.info('Info message');
            logger.warning('Warning message');
            logger.error('Error message');

            // Only Warning and Error should be logged
            const warningMessages = loggedMessages.filter((msg) => msg.includes('[WARNING]'));
            const errorMessages = loggedMessages.filter((msg) => msg.includes('[ERROR]'));
            const debugMessages = loggedMessages.filter((msg) => msg.includes('[DEBUG]'));
            const infoMessages = loggedMessages.filter((msg) => msg.includes('[INFO]'));

            assert.strictEqual(warningMessages.length, 1);
            assert.strictEqual(errorMessages.length, 1);
            assert.strictEqual(debugMessages.length, 0);
            assert.strictEqual(infoMessages.length, 0);
        });

        test('should log all messages when level is Debug', () => {
            logger.setLogLevel(LogLevel.Debug);

            logger.debug('Debug message');
            logger.info('Info message');
            logger.warning('Warning message');
            logger.error('Error message');

            const debugMessages = loggedMessages.filter((msg) => msg.includes('[DEBUG]'));
            const infoMessages = loggedMessages.filter((msg) => msg.includes('[INFO]'));
            const warningMessages = loggedMessages.filter((msg) => msg.includes('[WARNING]'));
            const errorMessages = loggedMessages.filter((msg) => msg.includes('[ERROR]'));

            assert.strictEqual(debugMessages.length, 1);
            assert.strictEqual(infoMessages.length, 1);
            assert.strictEqual(warningMessages.length, 1);
            assert.strictEqual(errorMessages.length, 1);
        });

        test('should only log Error messages when level is Error', () => {
            logger.setLogLevel(LogLevel.Error);

            logger.debug('Debug message');
            logger.info('Info message');
            logger.warning('Warning message');
            logger.error('Error message');

            const errorMessages = loggedMessages.filter((msg) => msg.includes('[ERROR]'));
            const otherMessages = loggedMessages.filter(
                (msg) =>
                    msg.includes('[DEBUG]') || msg.includes('[INFO]') || msg.includes('[WARNING]'),
            );

            assert.strictEqual(errorMessages.length, 1);
            assert.strictEqual(otherMessages.length, 0);
        });

        test('should respect log level changes dynamically', () => {
            logger.setLogLevel(LogLevel.Info);
            logger.debug('Should not appear');

            const beforeChange = loggedMessages.length;

            logger.setLogLevel(LogLevel.Debug);
            logger.debug('Should appear');

            const afterChange = loggedMessages.length;

            assert.strictEqual(beforeChange, 0);
            assert.strictEqual(afterChange, 1);
        });
    });

    suite('Message Formatting', () => {
        let logger: Logger;
        let loggedMessages: string[];
        let originalAppendLine: any;

        setup(() => {
            logger = Logger.getInstance();
            logger.setLogLevel(LogLevel.Debug);
            loggedMessages = [];

            const outputChannel = (logger as any).outputChannel;
            originalAppendLine = outputChannel.appendLine;
            outputChannel.appendLine = (message: string) => {
                loggedMessages.push(message);
            };
        });

        teardown(() => {
            const outputChannel = (logger as any).outputChannel;
            outputChannel.appendLine = originalAppendLine;
            loggedMessages = [];
        });

        test('should format message with timestamp and log level', () => {
            logger.info('Test message');

            const message = loggedMessages[0];

            // Check format: [timestamp] [LEVEL] message
            assert.ok(message.includes('[INFO]'));
            assert.ok(message.includes('Test message'));
            assert.ok(message.match(/\[\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z\]/));
        });

        test('should format debug messages correctly', () => {
            logger.debug('Debug test');

            const message = loggedMessages[0];
            assert.ok(message.includes('[DEBUG]'));
            assert.ok(message.includes('Debug test'));
        });

        test('should format warning messages correctly', () => {
            logger.warning('Warning test');

            const message = loggedMessages[0];
            assert.ok(message.includes('[WARNING]'));
            assert.ok(message.includes('Warning test'));
        });

        test('should format error messages correctly', () => {
            logger.error('Error test');

            const message = loggedMessages[0];
            assert.ok(message.includes('[ERROR]'));
            assert.ok(message.includes('Error test'));
        });

        test('should include additional arguments as JSON', () => {
            logger.info('Test with args', { key: 'value' }, [1, 2, 3]);

            // First message is the formatted log line
            // Second message should be the JSON stringified args
            assert.ok(loggedMessages.length >= 2);

            const argsMessage = loggedMessages[1];
            assert.ok(argsMessage.includes('"key"'));
            assert.ok(argsMessage.includes('"value"'));
        });

        test('should handle empty additional arguments', () => {
            logger.info('Test without args');

            // Should only have one message (the formatted log line)
            // No additional JSON output for empty args
            const relevantMessages = loggedMessages.filter(
                (msg) => msg.includes('Test without args') || msg.includes('['),
            );
            assert.strictEqual(relevantMessages.length, 1);
        });

        test('should handle error objects in error method', () => {
            const testError = new Error('Test error');
            logger.error('Error occurred', testError);

            assert.ok(loggedMessages.length >= 1);
            assert.ok(loggedMessages[0].includes('[ERROR]'));
            assert.ok(loggedMessages[0].includes('Error occurred'));
        });

        test('should use ISO timestamp format', () => {
            logger.info('Timestamp test');

            const message = loggedMessages[0];
            const timestampMatch = message.match(
                /\[(\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z)\]/,
            );

            assert.ok(timestampMatch);

            // Verify it's a valid ISO string
            const timestamp = timestampMatch![1];
            const date = new Date(timestamp);
            assert.ok(!isNaN(date.getTime()));
        });

        test('should uppercase log level names', () => {
            logger.debug('test');
            logger.info('test');
            logger.warning('test');
            logger.error('test');

            assert.ok(loggedMessages.some((msg) => msg.includes('[DEBUG]')));
            assert.ok(loggedMessages.some((msg) => msg.includes('[INFO]')));
            assert.ok(loggedMessages.some((msg) => msg.includes('[WARNING]')));
            assert.ok(loggedMessages.some((msg) => msg.includes('[ERROR]')));
        });
    });

    suite('Output Channel Integration', () => {
        let logger: Logger;

        setup(() => {
            logger = Logger.getInstance();
        });

        test('should have an output channel', () => {
            const outputChannel = (logger as any).outputChannel;
            assert.ok(outputChannel);
            assert.strictEqual(typeof outputChannel.appendLine, 'function');
            assert.strictEqual(typeof outputChannel.show, 'function');
            assert.strictEqual(typeof outputChannel.dispose, 'function');
        });

        test('should expose show method', () => {
            assert.strictEqual(typeof logger.show, 'function');
        });

        test('should expose dispose method', () => {
            assert.strictEqual(typeof logger.dispose, 'function');
        });

        test('should call appendLine on output channel when logging', () => {
            let appendLineCalled = false;
            const outputChannel = (logger as any).outputChannel;
            const originalAppendLine = outputChannel.appendLine;

            outputChannel.appendLine = () => {
                appendLineCalled = true;
            };

            logger.info('Test');

            assert.strictEqual(appendLineCalled, true);

            // Restore
            outputChannel.appendLine = originalAppendLine;
        });
    });

    suite('Singleton Pattern', () => {
        test('should return same instance on multiple getInstance calls', () => {
            const instance1 = Logger.getInstance();
            const instance2 = Logger.getInstance();

            assert.strictEqual(instance1, instance2);
        });

        test('should maintain log level across getInstance calls', () => {
            const instance1 = Logger.getInstance();
            instance1.setLogLevel(LogLevel.Error);

            const instance2 = Logger.getInstance();
            const logLevel = (instance2 as any).logLevel;

            assert.strictEqual(logLevel, LogLevel.Error);
        });
    });
});
