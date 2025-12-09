# Design Document: Conventional Commits Format

## Overview

This design document outlines the implementation approach for adding Conventional Commits format support (`<type>(<scope>): <subject>`) to the OtakCommitter extension. The current system generates commit messages in the format `<prefix>: <subject>`, and we will extend it to include an optional scope component that is intelligently determined from the Git diff.

The implementation will be backward compatible, allowing users to enable or disable the scope feature through configuration. When enabled, the AI will analyze the diff to determine an appropriate scope based on file paths and change patterns.

## Architecture

### Component Overview

The implementation will modify the following components:

1. **PromptService** (`src/services/prompt.ts`)
   - Update `createCommitPrompt()` to include scope format instructions
   - Add logic to extract file path information for scope determination
   - Maintain backward compatibility with existing format

2. **Configuration** (`package.json`)
   - Add new configuration option: `otakCommitter.useConventionalCommits`
   - Default value: `true` (enabled by default)

3. **Language Files** (`src/languages/*.ts`)
   - Update system prompts to include scope format instructions
   - Ensure all supported languages have appropriate scope guidance

### Data Flow

```
Git Diff → PromptService → AI Prompt with Scope Instructions → OpenAI API → Formatted Commit Message
                ↓
         Configuration Check
         (useConventionalCommits)
```

## Components and Interfaces

### Modified PromptService

```typescript
export class PromptService {
    async createCommitPrompt(
        diff: string,
        language: string,
        messageStyle: MessageStyle | string,
        template?: TemplateInfo
    ): Promise<string> {
        // Check if Conventional Commits format is enabled
        const useConventionalCommits = vscode.workspace
            .getConfiguration('otakCommitter')
            .get<boolean>('useConventionalCommits') ?? true;

        // Extract file paths from diff for scope hints
        const filePaths = this.extractFilePathsFromDiff(diff);
        const scopeHint = this.generateScopeHint(filePaths);

        // Generate format instruction based on configuration
        const formatInstruction = useConventionalCommits
            ? this.getConventionalCommitsFormat(scopeHint)
            : this.getTraditionalFormat();

        // ... rest of the prompt generation
    }

    private extractFilePathsFromDiff(diff: string): string[] {
        // Extract file paths from diff headers (e.g., "diff --git a/path/to/file")
        const filePathRegex = /diff --git a\/(.+?) b\//g;
        const paths: string[] = [];
        let match;
        
        while ((match = filePathRegex.exec(diff)) !== null) {
            paths.push(match[1]);
        }
        
        return paths;
    }

    private generateScopeHint(filePaths: string[]): string {
        // Analyze file paths to suggest scope
        // Examples:
        // - src/services/auth.ts → "auth"
        // - src/components/ui/Button.tsx → "ui" or "button"
        // - docs/README.md → "docs"
        
        if (filePaths.length === 0) {
            return '';
        }

        // Group files by directory
        const directories = new Map<string, number>();
        
        for (const filePath of filePaths) {
            const parts = filePath.split('/');
            
            // Try to find meaningful scope from path
            // Skip generic directories like 'src', 'lib', 'app'
            const meaningfulParts = parts.filter(
                part => !['src', 'lib', 'app', 'dist', 'build'].includes(part)
            );
            
            if (meaningfulParts.length > 0) {
                const scope = meaningfulParts[0];
                directories.set(scope, (directories.get(scope) || 0) + 1);
            }
        }

        // Return the most common directory as scope hint
        if (directories.size > 0) {
            const sortedDirs = Array.from(directories.entries())
                .sort((a, b) => b[1] - a[1]);
            return sortedDirs[0][0];
        }

        return '';
    }

    private getConventionalCommitsFormat(scopeHint: string): string {
        const scopeGuidance = scopeHint
            ? `\n\nBased on the changed files, consider using "${scopeHint}" as the scope, or choose a more appropriate scope if the changes suggest otherwise.`
            : '';

        return `<type>(<scope>): <subject>

Where:
- <type> is one of the prefixes listed above
- <scope> is optional but recommended - it should indicate the area of the codebase affected (e.g., auth, ui, api, docs)
- If the scope cannot be determined or changes are too broad, you may omit it and use: <type>: <subject>
- <subject> is a brief description of the change${scopeGuidance}`;
    }

    private getTraditionalFormat(): string {
        return `<prefix>: <subject>`;
    }
}
```

### Configuration Schema

Add to `package.json`:

```json
{
  "configuration": {
    "properties": {
      "otakCommitter.useConventionalCommits": {
        "type": "boolean",
        "default": true,
        "description": "Use Conventional Commits format with scope (<type>(<scope>): <subject>)"
      }
    }
  }
}
```

## Data Models

No new data models are required. The implementation works with existing types:

- `string` for diff content
- `string[]` for file paths
- `boolean` for configuration flag

## Correctness Properties

*A property is a characteristic or behavior that should hold true across all valid executions of a system-essentially, a formal statement about what the system should do. Properties serve as the bridge between human-readable specifications and machine-verifiable correctness guarantees.*

### Property 1: Format consistency with configuration

*For any* commit message generation request, when `useConventionalCommits` is enabled, the generated prompt should instruct the AI to use the `<type>(<scope>): <subject>` format, and when disabled, it should use the `<prefix>: <subject>` format.

**Validates: Requirements 3.1, 3.2, 3.3**

### Property 2: Scope hint extraction

*For any* diff containing file paths, the scope hint extraction should return a non-empty string when meaningful directories are present, and an empty string when only generic directories (src, lib, app) are present.

**Validates: Requirements 2.1, 2.2**

### Property 3: File path extraction completeness

*For any* valid Git diff, all file paths mentioned in diff headers should be extracted by the `extractFilePathsFromDiff` function.

**Validates: Requirements 2.1**

### Property 4: Backward compatibility preservation

*For any* commit message generation with existing features (emoji, custom messages, templates, language selection), enabling Conventional Commits format should not break these features.

**Validates: Requirements 4.1, 4.2, 4.3, 4.4**

### Property 5: Scope omission handling

*For any* diff where scope cannot be determined (empty file paths or only generic directories), the prompt should explicitly allow the AI to omit the scope and use `<type>: <subject>` format.

**Validates: Requirements 1.3**

## Error Handling

### Configuration Errors

- If `useConventionalCommits` configuration is missing, default to `true`
- No user-facing errors for configuration issues

### Diff Parsing Errors

- If file paths cannot be extracted from diff, proceed with empty scope hint
- Log warning but continue with commit message generation
- AI will generate message without scope guidance

### Invalid Scope Detection

- If generated scope is too generic (e.g., "src"), the prompt instructs AI to find more specific scope or omit it
- No validation on AI output - trust the AI to follow format instructions

### Template Override

- When user has custom template, respect template format completely
- Conventional Commits format is not applied when template is present
- This maintains existing behavior (Requirements 1.5, 4.4)

## Testing Strategy

### Unit Testing

We will use the existing test framework (likely Jest or Mocha based on the project structure) to write unit tests for:

1. **File path extraction**
   - Test with various diff formats
   - Test with empty diffs
   - Test with diffs containing special characters

2. **Scope hint generation**
   - Test with single directory changes
   - Test with multiple directory changes
   - Test with generic directory names
   - Test with nested directory structures

3. **Format instruction generation**
   - Test with configuration enabled
   - Test with configuration disabled
   - Test with scope hints present
   - Test with empty scope hints

4. **Configuration reading**
   - Test default value
   - Test explicit true/false values

### Property-Based Testing

We will use **fast-check** (JavaScript/TypeScript property-based testing library) to verify universal properties:

1. **Property 1: Format consistency with configuration**
   - Generate random configuration values (true/false)
   - Verify prompt contains correct format instruction
   - Run 100+ iterations

2. **Property 2: Scope hint extraction**
   - Generate random file path arrays
   - Verify scope hint is non-empty only when meaningful directories exist
   - Run 100+ iterations

3. **Property 3: File path extraction completeness**
   - Generate random valid Git diffs
   - Verify all file paths in diff headers are extracted
   - Run 100+ iterations

4. **Property 4: Backward compatibility preservation**
   - Generate random combinations of existing features (emoji, custom messages, languages)
   - Enable Conventional Commits format
   - Verify all features still work correctly
   - Run 100+ iterations

5. **Property 5: Scope omission handling**
   - Generate diffs with only generic directories or empty paths
   - Verify prompt allows scope omission
   - Run 100+ iterations

### Integration Testing

- Test end-to-end flow: Git diff → Prompt generation → AI call → Message formatting
- Test with real repository diffs
- Test with various configuration combinations
- Verify generated messages follow Conventional Commits format

### Manual Testing

- Test with real-world scenarios in different project types
- Verify AI correctly determines scope from various file structures
- Test with different languages and message styles
- Verify configuration toggle works correctly

## Implementation Notes

### Minimal Changes

The implementation requires minimal changes to existing code:
- Only `PromptService.createCommitPrompt()` needs modification
- No changes to `OpenAIService`, `CommitCommand`, or `GitService`
- Configuration addition is straightforward

### AI Responsibility

The AI is responsible for:
- Determining the final scope from the hint and diff content
- Deciding when to omit scope
- Ensuring the format is correct

The code only provides guidance through the prompt; it does not parse or validate the AI output.

### Language Support

All existing language files should be reviewed to ensure system prompts are compatible with scope format instructions. The format itself (`<type>(<scope>): <subject>`) is language-agnostic, but the guidance text should be clear in each language.

### Performance Considerations

- File path extraction uses regex, which is efficient for typical diff sizes
- Scope hint generation uses simple string operations and a Map for counting
- No significant performance impact expected
