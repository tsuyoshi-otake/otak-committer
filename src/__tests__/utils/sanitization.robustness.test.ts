/**
 * Unit tests for enhanced commit message sanitization
 *
 * **Feature: commit-message-generation-robustness**
 * **Validates: Requirements 3.1, 3.2, 3.3, 3.4, 3.5**
 */

import * as assert from 'assert';
import {
    sanitizeCommitMessage,
    escapeShellMetacharacters,
    normalizeTypography,
    removeControlCharacters
} from '../../utils/sanitization';

suite('Sanitization Robustness Tests', () => {
    suite('Unicode Preservation (Requirement 3.1)', () => {
        test('should preserve Japanese characters', () => {
            const message = 'feat: add user support';
            const sanitized = sanitizeCommitMessage(message);
            assert.ok(sanitized.includes(''));
        });

        test('should preserve Chinese characters', () => {
            const message = 'fix: resolve issue';
            const sanitized = sanitizeCommitMessage(message);
            assert.ok(sanitized.includes(''));
        });

        test('should preserve Korean characters', () => {
            const message = 'docs: update documentation';
            const sanitized = sanitizeCommitMessage(message);
            assert.ok(sanitized.includes(''));
        });

        test('should preserve emoji when not stripped', () => {
            const message = 'feat: add sparkle effect';
            const sanitized = sanitizeCommitMessage(message, { preserveUnicode: true });
            assert.ok(sanitized.includes(''));
        });

        test('should preserve Arabic characters', () => {
            const message = 'fix: issue in user module';
            const sanitized = sanitizeCommitMessage(message);
            assert.ok(sanitized.includes(''));
        });

        test('should preserve Russian characters', () => {
            const message = 'docs: update documentation';
            const sanitized = sanitizeCommitMessage(message);
            assert.ok(sanitized.includes(''));
        });
    });

    suite('Shell Metacharacter Escaping (Requirement 3.2)', () => {
        test('should escape command substitution $()', () => {
            const message = 'fix: handle $(command) injection';
            const sanitized = sanitizeCommitMessage(message);
            // Should neutralize by replacing the dangerous pattern
            assert.ok(!sanitized.includes('$('));
            assert.ok(sanitized.includes('(dollar)('));
        });

        test('should escape variable expansion ${}', () => {
            const message = 'fix: handle ${VAR} expansion';
            const sanitized = sanitizeCommitMessage(message);
            assert.ok(!sanitized.includes('${'));
            assert.ok(sanitized.includes('(dollar){'));
        });

        test('should escape backticks', () => {
            const message = 'feat: use `code` blocks';
            const sanitized = sanitizeCommitMessage(message);
            // Backticks should be converted to single quotes
            assert.ok(!sanitized.includes('`'));
            assert.ok(sanitized.includes("'code'"));
        });

        test('should preserve backslashes', () => {
            const message = 'fix: handle file\\path\\issue';
            const sanitized = sanitizeCommitMessage(message);
            // Backslashes should be preserved
            assert.ok(sanitized.includes('\\'));
        });

        test('should handle dollar signs in normal context', () => {
            const message = 'fix: update $100 pricing';
            const sanitized = sanitizeCommitMessage(message);
            // Single dollar sign without parentheses should be preserved
            assert.ok(sanitized.includes('$'));
        });
    });

    suite('Markdown Code Block Removal (Requirement 3.3)', () => {
        test('should remove opening markdown code blocks', () => {
            const message = '```typescript\nfeat: add feature\n```';
            const sanitized = sanitizeCommitMessage(message);
            assert.ok(!sanitized.includes('```'));
        });

        test('should remove code blocks with language specifier', () => {
            const message = '```javascript\nconsole.log("test")\n```';
            const sanitized = sanitizeCommitMessage(message);
            assert.ok(!sanitized.includes('```'));
        });

        test('should preserve content inside code blocks', () => {
            const message = '```\nfeat: add new feature\n```';
            const sanitized = sanitizeCommitMessage(message);
            assert.ok(sanitized.includes('feat: add new feature'));
        });

        test('should handle multiple code blocks', () => {
            const message = '```ts\ncode1\n```\ntext\n```js\ncode2\n```';
            const sanitized = sanitizeCommitMessage(message);
            assert.ok(!sanitized.includes('```'));
        });
    });

    suite('Typography Normalization (Requirement 3.4)', () => {
        test('should normalize left double quote', () => {
            const message = 'fix: update \u201Cquoted\u201D text';
            const sanitized = sanitizeCommitMessage(message);
            assert.strictEqual(sanitized.includes('"'), true);
            assert.strictEqual(sanitized.includes('\u201C'), false);
        });

        test('should normalize right double quote', () => {
            const message = 'fix: update \u201Cquoted\u201D text';
            const sanitized = sanitizeCommitMessage(message);
            assert.strictEqual(sanitized.includes('\u201D'), false);
        });

        test('should normalize left single quote', () => {
            const message = "fix: update \u2018quoted\u2019 text";
            const sanitized = sanitizeCommitMessage(message);
            assert.strictEqual(sanitized.includes("'"), true);
            assert.strictEqual(sanitized.includes('\u2018'), false);
        });

        test('should normalize right single quote', () => {
            const message = "fix: update \u2018quoted\u2019 text";
            const sanitized = sanitizeCommitMessage(message);
            assert.strictEqual(sanitized.includes('\u2019'), false);
        });

        test('should normalize em dash to hyphen', () => {
            const message = 'fix: update text \u2014 with dash';
            const sanitized = sanitizeCommitMessage(message);
            assert.strictEqual(sanitized.includes('\u2014'), false);
            assert.strictEqual(sanitized.includes('-'), true);
        });

        test('should normalize en dash to hyphen', () => {
            const message = 'fix: update pages 1\u201310';
            const sanitized = sanitizeCommitMessage(message);
            assert.strictEqual(sanitized.includes('\u2013'), false);
            assert.strictEqual(sanitized.includes('-'), true);
        });

        test('should normalize ellipsis', () => {
            const message = 'feat: add feature\u2026';
            const sanitized = sanitizeCommitMessage(message);
            assert.strictEqual(sanitized.includes('\u2026'), false);
            assert.strictEqual(sanitized.includes('...'), true);
        });
    });

    suite('Control Character Removal (Requirement 3.5)', () => {
        test('should remove null character', () => {
            const message = 'feat: add\x00feature';
            const sanitized = sanitizeCommitMessage(message);
            assert.ok(!sanitized.includes('\x00'));
        });

        test('should remove bell character', () => {
            const message = 'feat: add\x07feature';
            const sanitized = sanitizeCommitMessage(message);
            assert.ok(!sanitized.includes('\x07'));
        });

        test('should remove backspace character', () => {
            const message = 'feat: add\x08feature';
            const sanitized = sanitizeCommitMessage(message);
            assert.ok(!sanitized.includes('\x08'));
        });

        test('should preserve newlines', () => {
            const message = 'feat: add feature\n\nBody text here';
            const sanitized = sanitizeCommitMessage(message);
            assert.ok(sanitized.includes('\n'));
        });

        test('should preserve tabs', () => {
            const message = 'feat: add feature\n\tindented text';
            const sanitized = sanitizeCommitMessage(message);
            assert.ok(sanitized.includes('\t'));
        });

        test('should remove form feed', () => {
            const message = 'feat: add\x0Cfeature';
            const sanitized = sanitizeCommitMessage(message);
            assert.ok(!sanitized.includes('\x0C'));
        });

        test('should remove escape character', () => {
            const message = 'feat: add\x1Bfeature';
            const sanitized = sanitizeCommitMessage(message);
            assert.ok(!sanitized.includes('\x1B'));
        });

        test('should remove delete character', () => {
            const message = 'feat: add\x7Ffeature';
            const sanitized = sanitizeCommitMessage(message);
            assert.ok(!sanitized.includes('\x7F'));
        });
    });

    suite('Sanitization Options', () => {
        test('should respect preserveUnicode option', () => {
            const message = 'feat: add feature test';
            const sanitized = sanitizeCommitMessage(message, { preserveUnicode: true });
            assert.ok(sanitized.includes('test'));
        });

        test('should respect escapeShellMetachars option', () => {
            const message = 'fix: $(command)';
            const sanitized = sanitizeCommitMessage(message, { escapeShellMetachars: true });
            assert.ok(!sanitized.includes('$('));
            assert.ok(sanitized.includes('(dollar)('));
        });

        test('should respect normalizeTypography option', () => {
            // Use actual Unicode smart quote characters
            const message = 'fix: \u201Csmart quotes\u201D';
            const sanitized = sanitizeCommitMessage(message, { normalizeTypography: true });
            assert.ok(!sanitized.includes('\u201C'));
            assert.ok(!sanitized.includes('\u201D'));
        });

        test('should respect removeControlChars option', () => {
            const message = 'feat: with\x00control';
            const sanitized = sanitizeCommitMessage(message, { removeControlChars: true });
            assert.ok(!sanitized.includes('\x00'));
        });
    });

    suite('Utility Functions', () => {
        test('escapeShellMetacharacters should escape dangerous patterns', () => {
            const text = '$(cmd) `backtick` ${var}';
            const escaped = escapeShellMetacharacters(text);
            assert.ok(!escaped.includes('$('));
            assert.ok(!escaped.includes('`'));
            assert.ok(!escaped.includes('${'));
            assert.ok(escaped.includes('(dollar)('));
            assert.ok(escaped.includes("'backtick'"));
            assert.ok(escaped.includes('(dollar){'));
        });

        test('normalizeTypography should convert all typographic characters', () => {
            // Use Unicode escape sequences for smart quotes
            const text = '\u201Cquotes\u201D \u2014 dash \u2013 n-dash \u2026ellipsis';
            const normalized = normalizeTypography(text);
            assert.ok(!normalized.includes('\u201C'));
            assert.ok(!normalized.includes('\u201D'));
            assert.ok(!normalized.includes('\u2014'));
            assert.ok(!normalized.includes('\u2013'));
            assert.ok(!normalized.includes('\u2026'));
        });

        test('removeControlCharacters should keep valid content', () => {
            const text = 'valid\ntext\twith\x00control\x1B';
            const cleaned = removeControlCharacters(text);
            assert.ok(cleaned.includes('valid'));
            assert.ok(cleaned.includes('text'));
            assert.ok(cleaned.includes('\n'));
            assert.ok(cleaned.includes('\t'));
            assert.ok(!cleaned.includes('\x00'));
        });
    });

    suite('Edge Cases', () => {
        test('should handle empty string', () => {
            const sanitized = sanitizeCommitMessage('');
            assert.strictEqual(sanitized, '');
        });

        test('should handle string with only whitespace', () => {
            const sanitized = sanitizeCommitMessage('   \n   ');
            assert.strictEqual(sanitized.trim(), '');
        });

        test('should handle very long messages', () => {
            const longMessage = 'feat: ' + 'a'.repeat(10000);
            const sanitized = sanitizeCommitMessage(longMessage);
            assert.ok(sanitized.length > 0);
        });

        test('should handle combined special characters', () => {
            const message = 'fix: \u201Csmart\u201D `code` \u2014 $(cmd) \x00';
            const sanitized = sanitizeCommitMessage(message);
            // Should handle all problematic characters
            assert.ok(!sanitized.includes('`'));
            assert.ok(!sanitized.includes('$('));
            assert.ok(!sanitized.includes('\x00'));
            assert.ok(!sanitized.includes('\u201C'));
            assert.ok(!sanitized.includes('\u2014'));
        });

        test('should remove trailing period from subject line', () => {
            const message = 'feat: add new feature.';
            const sanitized = sanitizeCommitMessage(message);
            assert.ok(!sanitized.endsWith('.') || sanitized.includes('\n'));
        });

        test('should normalize multiple consecutive newlines', () => {
            const message = 'feat: subject\n\n\n\nBody';
            const sanitized = sanitizeCommitMessage(message);
            assert.ok(!sanitized.includes('\n\n\n'));
        });
    });
});
