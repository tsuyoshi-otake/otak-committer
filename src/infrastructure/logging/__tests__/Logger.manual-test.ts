/**
 * Manual test file for Logger
 * This file can be used to manually verify Logger functionality
 * Run this in a VS Code extension development host
 */

import { Logger, LogLevel } from '../Logger.js';

export function testLogger(): void {
    const logger = Logger.getInstance();

    console.log('=== Testing Logger ===');

    // Test 1: Singleton pattern
    const logger2 = Logger.getInstance();
    console.log('Test 1 - Singleton:', logger === logger2 ? 'PASS' : 'FAIL');

    // Test 2: Log level filtering
    logger.setLogLevel(LogLevel.Info);
    console.log('Test 2 - Set log level to Info');

    // Test 3: Different log levels
    logger.debug('This debug message should NOT appear (filtered)');
    logger.info('This info message should appear');
    logger.warning('This warning message should appear');
    logger.error('This error message should appear');

    // Test 4: Logging with additional arguments
    logger.info('Message with args', { key: 'value', number: 42 });

    // Test 5: Change log level to Debug
    logger.setLogLevel(LogLevel.Debug);
    logger.debug('This debug message SHOULD appear now');

    // Test 6: Error with error object
    const testError = new Error('Test error object');
    logger.error('Error with object', testError);

    console.log('=== Logger Tests Complete ===');
    console.log('Check the "otak-committer" output channel in VS Code');
}
