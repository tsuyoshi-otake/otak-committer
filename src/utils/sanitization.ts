/**
 * Enhanced commit message sanitization utilities
 *
 * **Feature: commit-message-generation-robustness**
 * **Validates: Requirements 3.1, 3.2, 3.3, 3.4, 3.5**
 */

/**
 * Options for sanitization behavior
 */
export interface SanitizationOptions {
    /** Preserve Unicode characters (default: true) */
    preserveUnicode?: boolean;
    /** Escape shell metacharacters (default: true) */
    escapeShellMetachars?: boolean;
    /** Remove control characters (default: true) */
    removeControlChars?: boolean;
    /** Normalize typographic characters (default: true) */
    normalizeTypography?: boolean;
}

const DEFAULT_OPTIONS: Required<SanitizationOptions> = {
    preserveUnicode: true,
    escapeShellMetachars: true,
    removeControlChars: true,
    normalizeTypography: true
};

/**
 * Escape shell metacharacters to prevent command injection
 *
 * @param text - Text to escape
 * @returns Escaped text
 *
 * **Property 5: Shell metacharacter safety**
 */
export function escapeShellMetacharacters(text: string): string {
    return text
        // Neutralize command substitution $(...) by replacing $ with safe character
        .replace(/\$\(/g, '(dollar)(')
        // Neutralize variable expansion ${...}
        .replace(/\$\{/g, '(dollar){')
        // Convert backticks to single quotes for code references (including empty backticks)
        .replace(/`([^`]*)`/g, "'$1'")
        // Remove any remaining lone backticks
        .replace(/`/g, "'");
}

/**
 * Normalize typographic characters to ASCII equivalents
 *
 * @param text - Text to normalize
 * @returns Normalized text
 *
 * **Property 7: Typography normalization**
 */
export function normalizeTypography(text: string): string {
    return text
        // Normalize smart double quotes (U+201C, U+201D)
        .replace(/[\u201C\u201D]/g, '"')
        // Normalize smart single quotes (U+2018, U+2019)
        .replace(/[\u2018\u2019]/g, "'")
        // Normalize em dash to hyphen (U+2014)
        .replace(/\u2014/g, '-')
        // Normalize en dash to hyphen (U+2013)
        .replace(/\u2013/g, '-')
        // Normalize ellipsis (U+2026)
        .replace(/\u2026/g, '...');
}

/**
 * Remove control characters except newlines and tabs
 *
 * @param text - Text to clean
 * @returns Cleaned text
 *
 * **Property 8: Control character removal**
 */
export function removeControlCharacters(text: string): string {
    // Remove control characters 0x00-0x08, 0x0B, 0x0C, 0x0E-0x1F, 0x7F
    // Preserve 0x09 (tab) and 0x0A (newline)
    return text.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '');
}

/**
 * Remove markdown code block markers while preserving content
 *
 * @param text - Text containing potential code blocks
 * @returns Text with code block markers removed
 *
 * **Property 6: Markdown code block removal**
 */
export function removeMarkdownCodeBlocks(text: string): string {
    // Remove opening code block with optional language specifier
    let result = text.replace(/^```[a-zA-Z]*\s*\n/gm, '');

    // Remove closing code block
    result = result.replace(/\n```$/gm, '');

    // Also handle code blocks at very start/end without newlines
    result = result.replace(/^```[a-zA-Z]*\s*/g, '');
    result = result.replace(/\s*```$/g, '');

    return result;
}

/**
 * Sanitize a commit message with comprehensive character handling
 *
 * @param message - The commit message to sanitize
 * @param options - Optional sanitization options
 * @returns Sanitized commit message
 *
 * **Properties 4-8: Unicode, Shell safety, Markdown, Typography, Control chars**
 */
export function sanitizeCommitMessage(
    message: string,
    options?: SanitizationOptions
): string {
    const opts = { ...DEFAULT_OPTIONS, ...options };
    let result = message;

    // Step 1: Remove markdown code blocks
    result = removeMarkdownCodeBlocks(result);

    // Step 2: Escape shell metacharacters (idempotent - already escaped strings stay the same)
    if (opts.escapeShellMetachars) {
        result = escapeShellMetacharacters(result);
    }

    // Step 3: Normalize typography (idempotent - already normalized chars stay the same)
    if (opts.normalizeTypography) {
        result = normalizeTypography(result);
    }

    // Step 4: Remove control characters (idempotent - no control chars left after first pass)
    if (opts.removeControlChars) {
        result = removeControlCharacters(result);
    }

    // Step 5: Trim whitespace
    result = result.trim();

    // Step 6: Normalize multiple consecutive newlines (idempotent)
    result = result.replace(/\n{3,}/g, '\n\n');
    result = result.replace(/\n\s*\n/g, '\n\n');

    // Step 7: Remove trailing period from subject line (first line) - only if not part of ellipsis
    const firstNewline = result.indexOf('\n');
    if (firstNewline === -1) {
        // Single line - remove trailing single period (but not ellipsis)
        if (result.endsWith('.') && !result.endsWith('...')) {
            result = result.slice(0, -1);
        }
    } else {
        // Multi-line - remove trailing period from first line only (but not ellipsis)
        const firstLine = result.substring(0, firstNewline);
        const rest = result.substring(firstNewline);
        if (firstLine.endsWith('.') && !firstLine.endsWith('...')) {
            result = firstLine.slice(0, -1) + rest;
        }
    }

    return result;
}

/**
 * Check if a string contains dangerous shell patterns
 *
 * @param text - Text to check
 * @returns true if dangerous patterns are found
 */
export function containsDangerousPatterns(text: string): boolean {
    const dangerousPatterns = [
        /\$\([^)]*\)/, // Command substitution $(...)
        /\$\{[^}]*\}/, // Variable expansion ${...}
        /`[^`]*`/,     // Backtick execution
    ];

    return dangerousPatterns.some(pattern => pattern.test(text));
}

/**
 * Validate that a commit message is safe for git
 *
 * @param message - The message to validate
 * @returns true if the message is safe
 */
export function isCommitMessageSafe(message: string): boolean {
    // Check for control characters (except newlines and tabs)
    const hasControlChars = /[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/.test(message);
    if (hasControlChars) {
        return false;
    }

    // Check for unescaped dangerous patterns
    if (containsDangerousPatterns(message)) {
        return false;
    }

    return true;
}
