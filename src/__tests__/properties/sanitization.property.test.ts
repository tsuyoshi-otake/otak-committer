/**
 * Property-based tests for commit message sanitization
 *
 * **Feature: commit-message-generation-robustness**
 * **Properties 4, 5, 6, 7, 8: Sanitization properties**
 * **Validates: Requirements 3.1, 3.2, 3.3, 3.4, 3.5**
 */

import * as fc from 'fast-check';
import { sanitizeCommitMessage } from '../../utils/sanitization';
import { runPropertyTest } from '../../test/helpers/property-test.helper';

suite('Sanitization Property Tests', () => {
    /**
     * **Property 4: Unicode preservation**
     * For any commit message containing valid Unicode characters,
     * sanitization should preserve them without corruption or replacement.
     * **Validates: Requirements 3.1**
     */
    suite('Property 4: Unicode Preservation', () => {
        // Arbitrary for valid Unicode characters (excluding control chars)
        const unicodeCharArbitrary = fc.oneof(
            // Basic Latin (printable)
            fc.integer({ min: 32, max: 126 }).map(c => String.fromCharCode(c)),
            // Japanese Hiragana
            fc.integer({ min: 0x3040, max: 0x309F }).map(c => String.fromCharCode(c)),
            // Japanese Katakana
            fc.integer({ min: 0x30A0, max: 0x30FF }).map(c => String.fromCharCode(c)),
            // CJK Unified Ideographs (subset)
            fc.integer({ min: 0x4E00, max: 0x4EFF }).map(c => String.fromCharCode(c)),
            // Korean Hangul
            fc.integer({ min: 0xAC00, max: 0xACFF }).map(c => String.fromCharCode(c)),
            // Cyrillic
            fc.integer({ min: 0x0400, max: 0x04FF }).map(c => String.fromCharCode(c)),
            // Arabic
            fc.integer({ min: 0x0600, max: 0x06FF }).map(c => String.fromCharCode(c))
        );

        test('Unicode characters should be preserved after sanitization', () => {
            runPropertyTest(
                fc.property(
                    fc.array(unicodeCharArbitrary, { minLength: 1, maxLength: 100 })
                        .map(chars => 'feat: ' + chars.join('')),
                    (message) => {
                        const sanitized = sanitizeCommitMessage(message, { preserveUnicode: true });

                        // Extract Unicode chars from original (excluding ASCII control chars)
                        const originalUnicode = message.split('').filter(c =>
                            c.charCodeAt(0) > 127 && c.charCodeAt(0) < 0x10000
                        );

                        // All Unicode chars should still be present
                        return originalUnicode.every(c => sanitized.includes(c));
                    }
                )
            );
        });

        test('Japanese text should remain readable', () => {
            runPropertyTest(
                fc.property(
                    fc.array(
                        fc.integer({ min: 0x3040, max: 0x309F }).map(c => String.fromCharCode(c)),
                        { minLength: 1, maxLength: 20 }
                    ).map(chars => 'feat: ' + chars.join('')),
                    (message) => {
                        const sanitized = sanitizeCommitMessage(message);
                        // Message length should be similar (within 2x for escaping)
                        return sanitized.length >= message.length * 0.5;
                    }
                )
            );
        });
    });

    /**
     * **Property 5: Shell metacharacter safety**
     * For any commit message containing shell metacharacters,
     * sanitization should escape or neutralize them to prevent command injection.
     * **Validates: Requirements 3.2**
     */
    suite('Property 5: Shell Metacharacter Safety', () => {
        const dangerousPatternArbitrary = fc.oneof(
            // Command substitution
            fc.string({ minLength: 1, maxLength: 20 }).map(s => `$(${s})`),
            // Variable expansion
            fc.string({ minLength: 1, maxLength: 20 }).map(s => `\${${s}}`),
            // Backtick execution
            fc.string({ minLength: 1, maxLength: 20 }).map(s => `\`${s}\``)
        );

        test('command substitution should be neutralized', () => {
            runPropertyTest(
                fc.property(
                    fc.string({ minLength: 1, maxLength: 50 }).map(cmd => `feat: handle $(${cmd})`),
                    (message) => {
                        const sanitized = sanitizeCommitMessage(message);
                        // Should not contain executable patterns
                        return !sanitized.includes('$(') || sanitized.includes('\\$(');
                    }
                )
            );
        });

        test('variable expansion should be neutralized', () => {
            runPropertyTest(
                fc.property(
                    fc.string({ minLength: 1, maxLength: 50 }).map(v => `feat: handle \${${v}}`),
                    (message) => {
                        const sanitized = sanitizeCommitMessage(message);
                        // Should not contain executable patterns
                        return !sanitized.includes('${') || sanitized.includes('\\${');
                    }
                )
            );
        });

        test('backticks should be replaced', () => {
            runPropertyTest(
                fc.property(
                    // Only use simple alphanumeric content inside backticks
                    fc.stringMatching(/^[a-zA-Z0-9]+$/).filter(s => s.length > 0 && s.length < 50)
                        .map(code => `feat: use \`${code}\``),
                    (message) => {
                        const sanitized = sanitizeCommitMessage(message);
                        // Backticks should be converted to single quotes
                        return !sanitized.includes('`');
                    }
                )
            );
        });

        test('multiple dangerous patterns should all be neutralized', () => {
            runPropertyTest(
                fc.property(
                    fc.array(dangerousPatternArbitrary, { minLength: 1, maxLength: 5 })
                        .map(patterns => 'fix: ' + patterns.join(' ')),
                    (message) => {
                        const sanitized = sanitizeCommitMessage(message);
                        // None of the dangerous patterns should remain unescaped
                        // $(, ${, and ` should all be replaced with safe alternatives
                        return !sanitized.includes('$(') && !sanitized.includes('${') && !sanitized.includes('`');
                    }
                )
            );
        });
    });

    /**
     * **Property 6: Markdown code block removal**
     * For any commit message containing markdown code blocks,
     * sanitization should remove the code block markers while preserving content.
     * **Validates: Requirements 3.3**
     */
    suite('Property 6: Markdown Code Block Removal', () => {
        const languageArbitrary = fc.constantFrom('', 'typescript', 'javascript', 'python', 'go', 'rust');

        test('code block markers should be removed', () => {
            runPropertyTest(
                fc.property(
                    fc.tuple(languageArbitrary, fc.string({ minLength: 1, maxLength: 100 })),
                    ([lang, content]) => {
                        const message = `\`\`\`${lang}\n${content}\n\`\`\``;
                        const sanitized = sanitizeCommitMessage(message);
                        return !sanitized.includes('```');
                    }
                )
            );
        });

        test('content inside code blocks should be preserved', () => {
            runPropertyTest(
                fc.property(
                    fc.stringMatching(/^[a-zA-Z0-9]+$/)
                        .filter(s => s.length >= 5 && s.length <= 50),
                    (content) => {
                        const message = `\`\`\`\n${content}\n\`\`\``;
                        const sanitized = sanitizeCommitMessage(message);
                        // Content should be present (possibly trimmed)
                        return sanitized.includes(content.substring(0, Math.min(5, content.length)));
                    }
                )
            );
        });
    });

    /**
     * **Property 7: Typography normalization**
     * For any commit message containing smart quotes or typographic characters,
     * sanitization should normalize them to ASCII equivalents.
     * **Validates: Requirements 3.4**
     */
    suite('Property 7: Typography Normalization', () => {
        // Use Unicode escape sequences for typographic characters
        const typographicCharMap: [string, string][] = [
            ['\u201C', '"'],  // Left double quote
            ['\u201D', '"'],  // Right double quote
            ['\u2018', "'"],  // Left single quote
            ['\u2019', "'"],  // Right single quote
            ['\u2014', '-'],  // Em dash
            ['\u2013', '-'],  // En dash
            ['\u2026', '...'] // Ellipsis
        ];

        test('smart quotes should be normalized', () => {
            runPropertyTest(
                fc.property(
                    fc.string({ minLength: 1, maxLength: 50 }).map(s => `feat: \u201C${s}\u201D`),
                    (message) => {
                        const sanitized = sanitizeCommitMessage(message);
                        return !sanitized.includes('\u201C') && !sanitized.includes('\u201D');
                    }
                )
            );
        });

        test('em dash should be normalized to hyphen', () => {
            runPropertyTest(
                fc.property(
                    fc.string({ minLength: 1, maxLength: 50 }).map(s => `feat: ${s} — update`),
                    (message) => {
                        const sanitized = sanitizeCommitMessage(message);
                        return !sanitized.includes('—');
                    }
                )
            );
        });

        test('ellipsis should be normalized to three dots', () => {
            runPropertyTest(
                fc.property(
                    fc.string({ minLength: 1, maxLength: 50 }).map(s => `feat: ${s}…`),
                    (message) => {
                        const sanitized = sanitizeCommitMessage(message);
                        return !sanitized.includes('…');
                    }
                )
            );
        });

        test('all typographic characters should be normalized', () => {
            runPropertyTest(
                fc.property(
                    fc.array(
                        fc.constantFrom(...typographicCharMap.map(([orig]) => orig)),
                        { minLength: 1, maxLength: 10 }
                    ).map(chars => 'feat: ' + chars.join(' text ')),
                    (message) => {
                        const sanitized = sanitizeCommitMessage(message);
                        // None of the typographic chars should remain
                        return typographicCharMap.every(([orig]) => !sanitized.includes(orig));
                    }
                )
            );
        });
    });

    /**
     * **Property 8: Control character removal**
     * For any commit message containing control characters,
     * sanitization should remove them except for newlines and tabs.
     * **Validates: Requirements 3.5**
     */
    suite('Property 8: Control Character Removal', () => {
        // Control characters (0x00-0x1F, 0x7F) except newline (0x0A) and tab (0x09)
        const controlCharArbitrary = fc.oneof(
            fc.integer({ min: 0x00, max: 0x08 }),
            fc.constant(0x0B), // vertical tab
            fc.constant(0x0C), // form feed
            fc.integer({ min: 0x0E, max: 0x1F }),
            fc.constant(0x7F) // DEL
        ).map(c => String.fromCharCode(c));

        test('control characters should be removed', () => {
            runPropertyTest(
                fc.property(
                    fc.array(controlCharArbitrary, { minLength: 1, maxLength: 10 })
                        .map(chars => 'feat: text' + chars.join('') + ' more'),
                    (message) => {
                        const sanitized = sanitizeCommitMessage(message);
                        // No control chars except newline and tab
                        return !sanitized.split('').some(c => {
                            const code = c.charCodeAt(0);
                            return (code < 32 && code !== 9 && code !== 10) || code === 127;
                        });
                    }
                )
            );
        });

        test('newlines should be preserved', () => {
            runPropertyTest(
                fc.property(
                    fc.tuple(
                        fc.stringMatching(/^[a-zA-Z0-9]+$/).filter(s => s.length >= 1 && s.length <= 50),
                        fc.stringMatching(/^[a-zA-Z0-9]+$/).filter(s => s.length >= 1 && s.length <= 50)
                    ).map(([a, b]) => `feat: ${a}\n\n${b}`),
                    (message) => {
                        const sanitized = sanitizeCommitMessage(message);
                        return sanitized.includes('\n');
                    }
                )
            );
        });

        test('tabs should be preserved', () => {
            runPropertyTest(
                fc.property(
                    fc.string({ minLength: 1, maxLength: 50 })
                        .filter(s => s.trim().length > 0) // Ensure content after tab isn't just whitespace
                        .map(s => `feat: subject\n\t${s.trim()}`), // Ensure non-whitespace content follows tab
                    (message) => {
                        const sanitized = sanitizeCommitMessage(message);
                        return sanitized.includes('\t');
                    }
                )
            );
        });
    });

    /**
     * **Property: Sanitization idempotence**
     * Sanitizing twice should produce the same result as sanitizing once.
     * This ensures stability and predictability of the sanitization process.
     */
    suite('Property: Sanitization Idempotence', () => {
        test('sanitizing twice should equal sanitizing once', () => {
            runPropertyTest(
                fc.property(
                    fc.string({ minLength: 0, maxLength: 500 }),
                    (message) => {
                        const once = sanitizeCommitMessage(message);
                        const twice = sanitizeCommitMessage(once);
                        return once === twice;
                    }
                )
            );
        });

        test('idempotence should hold for messages with special characters', () => {
            runPropertyTest(
                fc.property(
                    fc.string({ minLength: 1, maxLength: 200 })
                        .map(s => `feat: "${s}" — \`code\` $(cmd)`),
                    (message) => {
                        const once = sanitizeCommitMessage(message);
                        const twice = sanitizeCommitMessage(once);
                        return once === twice;
                    }
                )
            );
        });

        test('idempotence should hold for Unicode messages', () => {
            runPropertyTest(
                fc.property(
                    fc.string({ minLength: 1, maxLength: 100 }),
                    (message) => {
                        const once = sanitizeCommitMessage(message);
                        const twice = sanitizeCommitMessage(once);
                        return once === twice;
                    }
                )
            );
        });
    });
});
