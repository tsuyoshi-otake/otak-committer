import * as assert from 'assert';
import {
    invalidateValidatedConnection,
    isConnectionValidated,
    markConnectionValidated,
} from '../../services/openaiKeyValidationCache';

suite('OpenAI connection validation cache', () => {
    test('keys validation by both credential and canonical endpoint', () => {
        const key = `custom-${Date.now()}`;
        const endpointA = 'https://gateway-a.example/v1';
        const endpointB = 'https://gateway-b.example/v1';

        markConnectionValidated(key, `${endpointA}/`);

        assert.strictEqual(isConnectionValidated(key, endpointA), true);
        assert.strictEqual(isConnectionValidated(key, endpointB), false);
        assert.strictEqual(isConnectionValidated(`${key}-other`, endpointA), false);

        invalidateValidatedConnection(key, endpointA);
        assert.strictEqual(isConnectionValidated(key, endpointA), false);
    });

    test('invalidates only the selected endpoint identity', () => {
        const key = `custom-${Date.now()}-isolated`;
        const endpointA = 'https://gateway-a.example/v1';
        const endpointB = 'https://gateway-b.example/v1';

        markConnectionValidated(key, endpointA);
        markConnectionValidated(key, endpointB);
        invalidateValidatedConnection(key, endpointA);

        assert.strictEqual(isConnectionValidated(key, endpointA), false);
        assert.strictEqual(isConnectionValidated(key, endpointB), true);

        invalidateValidatedConnection(key, endpointB);
    });

    test('never caches a blank credential', () => {
        markConnectionValidated('   ', 'https://gateway.example/v1');
        assert.strictEqual(isConnectionValidated('   ', 'https://gateway.example/v1'), false);
    });
});
