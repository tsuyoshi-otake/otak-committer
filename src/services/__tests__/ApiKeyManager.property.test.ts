/**
 * Property-based tests for endpoint-aware API key validation.
 */

import * as fc from 'fast-check';
import { runPropertyTest } from '../../test/helpers/property-test.helper';
import { ApiKeyManager } from '../ApiKeyManager';

const OFFICIAL_SUFFIX_CHARACTERS =
    'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789_-';
const CUSTOM_BASE_URL = 'https://gateway.example.com/openai/v1';

function stringFromCharacters(
    characters: string,
    minLength: number,
    maxLength: number,
): fc.Arbitrary<string> {
    return fc
        .array(fc.constantFrom(...characters), { minLength, maxLength })
        .map((charactersInValue) => charactersInValue.join(''));
}

suite('ApiKeyManager Property Tests', () => {
    suite('Official OpenAI endpoint format', () => {
        test('accepts every supported prefix with a valid suffix', () => {
            const supportedPrefix = fc.constantFrom(
                '',
                'proj-',
                'svcacct-',
                'admin-',
                'or-',
                'ant-',
            );
            const validSuffix = stringFromCharacters(
                OFFICIAL_SUFFIX_CHARACTERS,
                20,
                100,
            );

            runPropertyTest(
                fc.property(supportedPrefix, validSuffix, (prefix, suffix) =>
                    ApiKeyManager.validateKeyFormat(`sk-${prefix}${suffix}`),
                ),
            );
        });

        test('rejects suffixes shorter than twenty characters', () => {
            const shortSuffix = stringFromCharacters(
                OFFICIAL_SUFFIX_CHARACTERS,
                0,
                19,
            );

            runPropertyTest(
                fc.property(shortSuffix, (suffix) =>
                    !ApiKeyManager.validateKeyFormat(`sk-${suffix}`),
                ),
            );
        });

        test('rejects unsupported prefixes and characters', () => {
            const unsupportedPrefix = fc.constantFrom(
                'pk-',
                'ak-',
                'key-',
                'sk-project-',
                'SK-',
            );
            const validSuffix = stringFromCharacters(
                OFFICIAL_SUFFIX_CHARACTERS,
                20,
                60,
            );
            const invalidCharacter = fc.constantFrom(
                '!',
                '@',
                '#',
                '$',
                '%',
                '.',
                '/',
                ' ',
                '\t',
            );

            runPropertyTest(
                fc.property(
                    unsupportedPrefix,
                    validSuffix,
                    invalidCharacter,
                    (prefix, suffix, invalid) =>
                        !ApiKeyManager.validateKeyFormat(`${prefix}${suffix}`) &&
                        !ApiKeyManager.validateKeyFormat(
                            `sk-${suffix}${invalid}${suffix}`,
                        ),
                ),
            );
        });

        test('trims only surrounding whitespace before applying the exact pattern', () => {
            const validSuffix = stringFromCharacters(
                OFFICIAL_SUFFIX_CHARACTERS,
                20,
                60,
            );

            runPropertyTest(
                fc.property(validSuffix, (suffix) =>
                    ApiKeyManager.validateKeyFormat(` \t sk-${suffix} \r\n`),
                ),
            );
        });
    });

    suite('Custom gateway format', () => {
        test('accepts any non-empty trimmed credential', () => {
            runPropertyTest(
                fc.property(
                    fc.string({ minLength: 1, maxLength: 100 }).filter(
                        (value) => value.trim().length > 0,
                    ),
                    (credential) =>
                        ApiKeyManager.validateKeyFormat(
                            credential,
                            CUSTOM_BASE_URL,
                        ),
                ),
            );
        });

        test('rejects empty and whitespace-only credentials', () => {
            runPropertyTest(
                fc.property(
                    fc.constantFrom('', ' ', '\t', '\n', ' \r\n '),
                    (credential) =>
                        !ApiKeyManager.validateKeyFormat(
                            credential,
                            CUSTOM_BASE_URL,
                        ),
                ),
            );
        });
    });

    suite('Credential confidentiality', () => {
        test('redacts every occurrence without changing unrelated text', () => {
            const manager = new ApiKeyManager({} as any, {} as any);
            const validSuffix = stringFromCharacters(
                OFFICIAL_SUFFIX_CHARACTERS,
                20,
                60,
            );

            runPropertyTest(
                fc.property(validSuffix, (suffix) => {
                    const apiKey = `sk-${suffix}`;
                    const message = `Rejected ${apiKey}; retrying ${apiKey}`;
                    const sanitized = manager.sanitizeErrorMessage(
                        message,
                        apiKey,
                    );
                    return (
                        !sanitized.includes(apiKey) &&
                        sanitized ===
                            'Rejected [REDACTED]; retrying [REDACTED]'
                    );
                }),
            );
        });
    });
});
