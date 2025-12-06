# Testing Guide

This document describes the testing infrastructure for the otak-committer extension refactoring project.

## Overview

The project uses a **dual testing approach** combining:
- **Unit Tests**: Verify specific examples and edge cases
- **Property-Based Tests (PBT)**: Verify universal properties across all inputs

Both approaches are complementary and provide comprehensive test coverage.

## Quick Start

```bash
# Install dependencies
npm install

# Run all tests (includes VS Code integration tests)
npm test

# Run unit and property-based tests only (faster, no VS Code launch)
npm run test:unit

# Compile tests
npm run compile:test

# Watch mode for development
npm run watch
```

## Test Infrastructure

### Installed Tools

- **Mocha**: Test framework for organizing and running tests
- **fast-check**: Property-based testing library
- **@vscode/test-electron**: VS Code extension testing utilities

### Configuration Files

- `tsconfig.test.json`: TypeScript configuration for test compilation
- `src/test/test.config.ts`: Centralized test configuration
- `src/test/helpers/property-test.helper.ts`: PBT utilities and arbitraries

### Directory Structure

```
src/
├── __tests__/
│   ├── properties/          # Property-based tests
│   │   └── setup.property.test.ts
│   ├── integration/         # Integration tests
│   └── README.md
├── commands/__tests__/      # Command layer unit tests
├── services/__tests__/      # Service layer unit tests
├── utils/__tests__/         # Utility unit tests
└── test/
    ├── helpers/            # Test utilities
    │   └── property-test.helper.ts
    ├── suite/              # Mocha configuration
    ├── test.config.ts      # Test settings
    ├── runTest.ts          # VS Code test runner
    └── run-unit-tests.ts   # Standalone test runner
```

## Writing Tests

### Unit Tests

Unit tests verify specific behavior with concrete examples:

```typescript
import * as assert from 'assert';

suite('MyComponent', () => {
    test('should handle empty input', () => {
        const result = myFunction('');
        assert.strictEqual(result, 'default');
    });
    
    test('should transform input correctly', () => {
        const result = myFunction('hello');
        assert.strictEqual(result, 'HELLO');
    });
});
```

### Property-Based Tests

Property tests verify invariants that should hold for all inputs:

```typescript
import * as fc from 'fast-check';
import { runPropertyTest } from '../../test/helpers/property-test.helper';

suite('MyComponent Properties', () => {
    // **Feature: extension-architecture-refactoring, Property 1: Some Property**
    test('output length should never exceed input length', () => {
        runPropertyTest(
            fc.property(fc.string(), (input) => {
                const result = myFunction(input);
                return result.length <= input.length;
            })
        );
    });
});
```

### Property Test Tagging

Each property-based test MUST be tagged with a comment referencing the design document:

```typescript
// **Feature: {feature-name}, Property {number}: {property-description}**
```

Example:
```typescript
// **Feature: extension-architecture-refactoring, Property 1: No Circular Dependencies**
test('module dependency graph should be acyclic', () => {
    // test implementation
});
```

## Test Configuration

### Property-Based Test Settings

From `src/test/test.config.ts`:

```typescript
propertyBased: {
    numRuns: 100,      // Minimum 100 iterations (requirement)
    timeout: 10000,    // 10 second timeout
    verbose: false,    // Set to true for debugging
}
```

### Timeouts

- **Unit tests**: 5 seconds
- **Property-based tests**: 10 seconds
- **Integration tests**: 15 seconds

## Helper Utilities

### runPropertyTest()

Runs a property test with default configuration (100 iterations):

```typescript
import { runPropertyTest } from '../../test/helpers/property-test.helper';

runPropertyTest(
    fc.property(fc.string(), (str) => {
        return str.length >= 0;
    })
);
```

### Custom Arbitraries

Pre-built generators for common VS Code extension data:

```typescript
import { arbitraries } from '../../test/helpers/property-test.helper';

// Generate valid configuration keys
fc.property(arbitraries.configKey(), (key) => { /* ... */ });

// Generate valid languages
fc.property(arbitraries.language(), (lang) => { /* ... */ });

// Generate valid message styles
fc.property(arbitraries.messageStyle(), (style) => { /* ... */ });

// Generate API keys
fc.property(arbitraries.apiKey(), (key) => { /* ... */ });

// Generate file paths
fc.property(arbitraries.filePath(), (path) => { /* ... */ });
```

## Test Execution

### Full Test Suite

Runs all tests including VS Code integration tests:

```bash
npm test
```

This will:
1. Compile TypeScript (`npm run compile:test`)
2. Run linter (`npm run lint`)
3. Download VS Code if needed
4. Launch VS Code with the extension
5. Run all tests in the VS Code environment

### Unit Tests Only

Runs unit and property-based tests without launching VS Code (faster):

```bash
npm run test:unit
```

This is useful during development for quick feedback.

### Watch Mode

Automatically recompile on file changes:

```bash
npm run watch
```

Then run tests in another terminal.

## Requirements Validation

The testing infrastructure satisfies these requirements from the design document:

| Requirement | Status | Evidence |
|-------------|--------|----------|
| 7.1: Use both unit and PBT | ✅ | Mocha + fast-check installed |
| 7.2: Reasonable time limits | ✅ | Configured timeouts (5-15s) |
| PBT: Minimum 100 iterations | ✅ | `numRuns: 100` in config |
| PBT: Tagged with property refs | ✅ | Helper and examples provided |
| Test directory structure | ✅ | `__tests__` directories created |

## Common Patterns

### Testing Error Handling

```typescript
test('should throw on invalid input', () => {
    assert.throws(() => {
        myFunction(null);
    }, /Invalid input/);
});
```

### Testing Async Functions

```typescript
test('should resolve with correct value', async () => {
    const result = await myAsyncFunction();
    assert.strictEqual(result, 'expected');
});
```

### Testing with fast-check Async

```typescript
test('async property should hold', async () => {
    await fc.assert(
        fc.asyncProperty(fc.string(), async (input) => {
            const result = await myAsyncFunction(input);
            return result.length >= 0;
        }),
        { numRuns: 100 }
    );
});
```

## Debugging Tests

### Enable Verbose Output

In `src/test/test.config.ts`:

```typescript
propertyBased: {
    verbose: true,  // Enable verbose output
}
```

### Run Single Test File

```bash
# Compile first
npm run compile:test

# Run specific test
node ./out/test/run-unit-tests.js
```

### VS Code Debugging

1. Set breakpoints in test files
2. Use "Run and Debug" panel
3. Select "Extension Tests" configuration
4. Press F5

## Coverage Goals

- **Critical paths**: 80% minimum
- **Infrastructure layer**: High coverage
- **Command layer**: Medium coverage
- **Service layer**: Medium coverage

## Next Steps

As you implement the refactoring:

1. Write unit tests for new infrastructure components
2. Write property-based tests for correctness properties
3. Write integration tests for component interactions
4. Ensure all tests pass before completing each task
5. Maintain test coverage above 80% for critical paths

## Troubleshooting

### Tests not found

Ensure you've compiled the tests:
```bash
npm run compile:test
```

### VS Code download fails

Check your internet connection and proxy settings.

### Property tests timeout

Increase timeout in `src/test/test.config.ts` or reduce `numRuns` temporarily for debugging.

### Import errors

Ensure all dependencies are installed:
```bash
npm install
```

## Resources

- [Mocha Documentation](https://mochajs.org/)
- [fast-check Documentation](https://fast-check.dev/)
- [VS Code Extension Testing](https://code.visualstudio.com/api/working-with-extensions/testing-extension)
- [Property-Based Testing Guide](https://fast-check.dev/docs/introduction/)
