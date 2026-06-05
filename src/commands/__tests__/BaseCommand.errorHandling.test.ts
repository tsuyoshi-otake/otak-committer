import * as assert from 'assert';
import { BaseCommand } from '../BaseCommand';
import {
    createMockExtensionContext,
    ErrorHandlerMock,
    installErrorHandlerMock,
    TestCommand,
} from './baseCommandTestHelpers';

suite('BaseCommand handleError Helper', () => {
    let mockContext: ReturnType<typeof createMockExtensionContext>;
    let errorMock: ErrorHandlerMock;

    setup(() => {
        mockContext = createMockExtensionContext();
        errorMock = installErrorHandlerMock();
    });

    teardown(() => {
        errorMock.restore();
    });

    test('should route error through ErrorHandler', () => {
        const command = new TestCommand(mockContext);
        const testError = new Error('Test error');

        command.testHandleError(testError, 'test operation');

        assert.strictEqual(errorMock.handledErrors.length, 1);
        assert.strictEqual(errorMock.handledErrors[0].error, testError);
    });

    test('should include operation in context', () => {
        const command = new TestCommand(mockContext);

        command.testHandleError(new Error('Test error'), 'performing action');

        assert.strictEqual(errorMock.handledErrors.length, 1);
        assert.strictEqual(errorMock.handledErrors[0].context.operation, 'performing action');
    });

    test('should include component name in context', () => {
        const command = new TestCommand(mockContext);

        command.testHandleError(new Error('Test error'), 'test operation');

        assert.strictEqual(errorMock.handledErrors.length, 1);
        assert.strictEqual(errorMock.handledErrors[0].context.component, 'TestCommand');
    });

    test('should use constructor name as component', () => {
        class CustomCommand extends BaseCommand {
            async execute(): Promise<void> {}

            public testError(error: unknown, operation: string): void {
                this.handleErrorSilently(error, operation);
            }
        }

        const command = new CustomCommand(mockContext);

        command.testError(new Error('Test error'), 'test');

        assert.strictEqual(errorMock.handledErrors.length, 1);
        assert.strictEqual(errorMock.handledErrors[0].context.component, 'CustomCommand');
    });

    test('should handle different error types', () => {
        const command = new TestCommand(mockContext);
        const standardError = new Error('Standard error');
        const typeError = new TypeError('Type error');
        const stringError = 'String error';
        const objectError = { message: 'Object error' };

        command.testHandleError(standardError, 'op1');
        command.testHandleError(typeError, 'op2');
        command.testHandleError(stringError, 'op3');
        command.testHandleError(objectError, 'op4');

        assert.strictEqual(errorMock.handledErrors.length, 4);
        assert.strictEqual(errorMock.handledErrors[0].error, standardError);
        assert.strictEqual(errorMock.handledErrors[1].error, typeError);
        assert.strictEqual(errorMock.handledErrors[2].error, stringError);
        assert.strictEqual(errorMock.handledErrors[3].error, objectError);
    });

    test('should handle null and undefined errors', () => {
        const command = new TestCommand(mockContext);

        command.testHandleError(null, 'null error');
        command.testHandleError(undefined, 'undefined error');

        assert.strictEqual(errorMock.handledErrors.length, 2);
        assert.strictEqual(errorMock.handledErrors[0].error, null);
        assert.strictEqual(errorMock.handledErrors[1].error, undefined);
    });

    test('should handle empty operation string', () => {
        const command = new TestCommand(mockContext);

        command.testHandleError(new Error('Test error'), '');

        assert.strictEqual(errorMock.handledErrors.length, 1);
        assert.strictEqual(errorMock.handledErrors[0].context.operation, '');
    });

    test('should handle multiple errors sequentially', () => {
        const command = new TestCommand(mockContext);

        command.testHandleError(new Error('Error 1'), 'operation 1');
        command.testHandleError(new Error('Error 2'), 'operation 2');
        command.testHandleError(new Error('Error 3'), 'operation 3');

        assert.strictEqual(errorMock.handledErrors.length, 3);
        assert.strictEqual(errorMock.handledErrors[0].context.operation, 'operation 1');
        assert.strictEqual(errorMock.handledErrors[1].context.operation, 'operation 2');
        assert.strictEqual(errorMock.handledErrors[2].context.operation, 'operation 3');
    });

    test('should create proper ErrorContext structure', () => {
        const command = new TestCommand(mockContext);

        command.testHandleError(new Error('Test error'), 'test operation');

        assert.strictEqual(errorMock.handledErrors.length, 1);
        const context = errorMock.handledErrors[0].context;

        assert.ok(context.hasOwnProperty('operation'));
        assert.ok(context.hasOwnProperty('component'));
        assert.strictEqual(typeof context.operation, 'string');
        assert.strictEqual(typeof context.component, 'string');
    });
});
