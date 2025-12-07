# Design Document: Commit Message Generation Robustness

## Overview

This design addresses robustness issues in commit message generation when handling large changesets, special characters, and edge cases. The current implementation has limitations that can cause generation failures or produce incorrect results when dealing with:

- Large file counts (>50 files) or extensive changes (>200K tokens)
- Windows reserved device names (CON, PRN, AUX, etc.)
- Special characters (Unicode, shell metacharacters, control characters)
- Edge cases (empty diffs, binary files, whitespace-only changes)

The solution enhances the existing GitService and sanitization utilities to handle these scenarios gracefully while maintaining backward compatibility.

## Architecture

The design follows the existing service-oriented architecture with enhancements to three main components:

1. **GitService** (`src/services/git.ts`)
   - Enhanced diff retrieval with intelligent truncation
   - File categorization and summarization
   - Windows reserved name detection and handling

2. **Sanitization Utilities** (`src/utils/index.ts`)
   - Enhanced `sanitizeCommitMessage` function
   - Unicode normalization
   - Shell metacharacter escaping
   - Control character removal

3. **Error Handling** (`src/commands/CommitCommand.ts`)
   - Detailed error messages with context
   - User-friendly notifications
   - Graceful degradation

## Components and Interfaces

### Enhanced GitService

```typescript
interface DiffResult {
    content: string;
    metadata: {
        fileCount: number;
        isTruncated: boolean;
        originalTokens?: number;
        truncatedTokens?: number;
        hasReservedNames: boolean;
        reservedFiles?: string[];
        categories?: {
            added: string[];
            modified: string[];
            deleted: string[];
            renamed: string[];
            binary: string[];
        };
    };
}

class GitService {
    // Enhanced diff retrieval with metadata
    async getDiff(): Promise<DiffResult | undefined>;
    
    // Categorize files by operation type
    private categorizeFiles(files: StatusFile[]): FileCategories;
    
    // Generate summary for large changesets
    private generateFileSummary(categories: FileCategories): string;
    
    // Check for Windows reserved names
    private isWindowsReservedName(filePath: string): boolean;
}
```

### Enhanced Sanitization

```typescript
interface SanitizationOptions {
    preserveUnicode?: boolean;
    escapeShellMetachars?: boolean;
    removeControlChars?: boolean;
    normalizeTypography?: boolean;
}

function sanitizeCommitMessage(
    message: string,
    options?: SanitizationOptions
): string;

// New utility functions
function escapeShellMetacharacters(text: string): string;
function normalizeUnicode(text: string): string;
function removeControlCharacters(text: string): string;
```

### Error Context

```typescript
interface ErrorContext {
    operation: string;
    details?: {
        fileCount?: number;
        tokenCount?: number;
        errorType?: string;
        apiError?: any;
    };
}

function handleCommitError(error: Error, context: ErrorContext): void;
```

## Data Models

### File Categories

```typescript
interface FileCategories {
    added: string[];
    modified: string[];
    deleted: string[];
    renamed: Array<{ from: string; to: string }>;
    binary: string[];
}
```

### Diff Metadata

```typescript
interface DiffMetadata {
    fileCount: number;
    isTruncated: boolean;
    originalTokens?: number;
    truncatedTokens?: number;
    hasReservedNames: boolean;
    reservedFiles?: string[];
    categories?: FileCategories;
}
```

## Correctness Properties

*A property is a characteristic or behavior that should hold true across all valid executions of a system-essentially, a formal statement about what the system should do. Properties serve as the bridge between human-readable specifications and machine-verifiable correctness guarantees.*

### Property 1: Truncation preserves file context

*For any* diff that exceeds 200K tokens, truncating the diff should preserve complete file headers and not cut off in the middle of a file's changes.
**Validates: Requirements 1.1**

### Property 2: File categorization completeness

*For any* set of staged files, categorizing them by operation type (added, modified, deleted, renamed, binary) should account for all files without duplication.
**Validates: Requirements 1.2**

### Property 3: Reserved name detection accuracy

*For any* file path, the Windows reserved name detection should correctly identify all reserved device names (CON, PRN, AUX, NUL, COM1-9, LPT1-9) regardless of case or extension.
**Validates: Requirements 2.1, 2.2**

### Property 4: Unicode preservation

*For any* commit message containing valid Unicode characters, sanitization should preserve them without corruption or replacement.
**Validates: Requirements 3.1**

### Property 5: Shell metacharacter safety

*For any* commit message containing shell metacharacters ($, `, \, etc.), sanitization should escape or neutralize them to prevent command injection.
**Validates: Requirements 3.2**

### Property 6: Markdown code block removal

*For any* commit message containing markdown code blocks (```), sanitization should remove the code block markers while preserving the content.
**Validates: Requirements 3.3**

### Property 7: Typography normalization

*For any* commit message containing smart quotes or typographic characters (", ', —, –, …), sanitization should normalize them to ASCII equivalents.
**Validates: Requirements 3.4**

### Property 8: Control character removal

*For any* commit message containing control characters, sanitization should remove them except for newlines and tabs.
**Validates: Requirements 3.5**

### Property 9: Error message clarity

*For any* error during commit generation, the error message should include the operation name and relevant context (file count, token count, error type).
**Validates: Requirements 4.1, 4.2, 4.3, 4.4, 4.5**

### Property 10: Edge case handling

*For any* edge case scenario (whitespace-only changes, binary files, deletions only, renames, mixed operations), the system should generate an appropriate commit message describing the changes.
**Validates: Requirements 5.1, 5.2, 5.3, 5.4, 5.5**

## Error Handling

### Error Categories

1. **Diff Retrieval Errors**
   - No Git repository found
   - No staged changes
   - Git command failures
   - File access errors

2. **API Errors**
   - Invalid API key
   - Rate limiting
   - Network failures
   - Model unavailability

3. **Validation Errors**
   - Empty diff
   - Diff too large (even after truncation)
   - Invalid characters in filenames

### Error Response Strategy

```typescript
// Error handling with context
try {
    const diff = await git.getDiff();
    if (!diff) {
        throw new ValidationError('No changes to commit');
    }
    
    if (diff.metadata.isTruncated) {
        vscode.window.showWarningMessage(
            `Diff truncated from ${diff.metadata.originalTokens}K to ${diff.metadata.truncatedTokens}K tokens`
        );
    }
    
    if (diff.metadata.hasReservedNames) {
        vscode.window.showInformationMessage(
            `Files with reserved names: ${diff.metadata.reservedFiles?.join(', ')}`
        );
    }
    
} catch (error) {
    handleCommitError(error, {
        operation: 'getDiff',
        details: {
            fileCount: diff?.metadata.fileCount
        }
    });
}
```

## Testing Strategy

### Unit Tests

Unit tests will verify specific examples and edge cases:

1. **Diff Truncation Tests**
   - Test with diff exactly at 200K tokens
   - Test with diff at 201K tokens (should truncate)
   - Test with diff at 500K tokens (large truncation)

2. **Reserved Name Tests**
   - Test with each reserved name (CON, PRN, AUX, etc.)
   - Test with reserved names in different cases (con, Con, CON)
   - Test with reserved names with extensions (CON.txt)

3. **Sanitization Tests**
   - Test with Unicode characters (emoji, Japanese, etc.)
   - Test with shell metacharacters ($, `, \, etc.)
   - Test with markdown code blocks
   - Test with smart quotes and typography
   - Test with control characters

4. **Edge Case Tests**
   - Test with whitespace-only changes
   - Test with binary file changes
   - Test with deletions only
   - Test with renames only
   - Test with mixed operations

### Property-Based Tests

Property-based tests will verify universal properties across many inputs:

1. **Property Test: Truncation preserves file context**
   - Generate random diffs of varying sizes
   - Verify truncated diffs don't cut off mid-file

2. **Property Test: File categorization completeness**
   - Generate random file lists with various operations
   - Verify all files are categorized exactly once

3. **Property Test: Reserved name detection**
   - Generate random file paths with and without reserved names
   - Verify detection accuracy

4. **Property Test: Unicode preservation**
   - Generate random commit messages with Unicode
   - Verify sanitization preserves valid Unicode

5. **Property Test: Shell metacharacter safety**
   - Generate random commit messages with shell metacharacters
   - Verify sanitization neutralizes dangerous patterns

6. **Property Test: Sanitization idempotence**
   - Generate random commit messages
   - Verify sanitizing twice produces same result as sanitizing once

### Testing Framework

- **Unit Tests**: Jest (existing framework)
- **Property-Based Tests**: fast-check (TypeScript property testing library)
- **Test Configuration**: Minimum 100 iterations per property test

### Test Organization

```
src/__tests__/
  services/
    git.test.ts              # Unit tests for GitService
    git.properties.test.ts   # Property tests for GitService
  utils/
    sanitization.test.ts     # Unit tests for sanitization
    sanitization.properties.test.ts  # Property tests for sanitization
  commands/
    commit.test.ts           # Unit tests for CommitCommand
```

## Implementation Notes

### Backward Compatibility

- All changes maintain backward compatibility with existing code
- New features are additive, not breaking
- Existing tests continue to pass

### Performance Considerations

- File categorization is O(n) where n is number of files
- Truncation is O(1) string slicing
- Sanitization is O(m) where m is message length
- Overall performance impact is minimal

### Configuration

No new configuration options are required. The implementation uses existing configuration and sensible defaults:

- Token truncation threshold: 200K tokens (hardcoded)
- File count threshold for summarization: 50 files (hardcoded)
- Sanitization options: All enabled by default

### Logging

Enhanced logging for debugging:

```typescript
logger.info('Diff retrieved', {
    fileCount: metadata.fileCount,
    isTruncated: metadata.isTruncated,
    hasReservedNames: metadata.hasReservedNames
});

logger.warning('Diff truncated', {
    originalTokens: metadata.originalTokens,
    truncatedTokens: metadata.truncatedTokens
});
```