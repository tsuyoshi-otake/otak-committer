import * as assert from 'assert';
import { isOpenAIAuthenticationError } from '../errorGuards';

function apiError(status: number, message: string): Error & { status: number } {
    return Object.assign(new Error(message), { status });
}

suite('isOpenAIAuthenticationError', () => {
    test('treats HTTP 401 as an authentication failure', () => {
        assert.strictEqual(isOpenAIAuthenticationError(apiError(401, 'Incorrect API key')), true);
    });

    test('does not treat other statuses as authentication failures even if the message mentions keys', () => {
        const cases = [
            apiError(400, "Invalid 'api key' parameter format in request"),
            apiError(403, 'Authentication succeeded but the project lacks access'),
            apiError(429, 'Rate limit reached for api key'),
            apiError(500, 'Upstream authentication service unavailable'),
        ];

        for (const error of cases) {
            assert.strictEqual(isOpenAIAuthenticationError(error), false, error.message);
        }
    });

    test('falls back to message matching only when no status is present', () => {
        assert.strictEqual(isOpenAIAuthenticationError(new Error('Unauthorized')), true);
        assert.strictEqual(isOpenAIAuthenticationError(new Error('socket hang up')), false);
    });

    test('ignores a non-numeric status field', () => {
        const error = Object.assign(new Error('api key missing'), { status: 'unknown' });

        assert.strictEqual(isOpenAIAuthenticationError(error), true);
    });
});
