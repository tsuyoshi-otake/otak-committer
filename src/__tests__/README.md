# Test Directory Structure

This directory contains the test suite for the otak-committer extension refactoring.

## Directory Organization

```
src/
├── __tests__/
│   ├── properties/          # Property-based tests (universal properties)
│   ├── integration/         # Integration tests (component interactions)
│   └── README.md           # This file
├── commands/__tests__/      # Unit tests for command layer
├── services/__tests__/      # Unit tests for service layer
├── utils/__tests__/         # Unit tests for utility functions
└── test/
    ├── helpers/            # Test helper utilities
    ├── suite/              # Mocha test suite configuration
    └── test.config.ts      # Test configuration
```

## Testing Strategy

This project uses a **dual testing approach**:

### 1. Unit Tests

- Located in `__tests__` directories next to source files
- Test specific examples, edge cases, and error conditions
- Use Mocha test framework
- Focus on concrete behavior verification

**Example locations:**

- `src/commands/__tests__/CommitCommand.test.ts`
- `src/services/__tests__/GitService.test.ts`

### 2. Property-Based Tests (PBT)

- Located in `src/__tests__/properties/`
- Test universal properties that should hold across all inputs
- Use fast-check library
- Run minimum 100 iterations per test
- Tagged with property references from design document

**Example:**

```typescript
// **Feature: extension-architecture-refactoring, Property 1: No Circular Dependencies**
test('module dependency graph should be acyclic', () => {
  // test implementation
});
```

### 3. Integration Tests

- Located in `src/__tests__/integration/`
- Test component interactions and end-to-end flows
- Verify that components work together correctly

## Running Tests

```bash
# Run all tests
npm test

# Compile TypeScript and run tests
npm run pretest && npm test

# Watch mode (compile on change)
npm run watch
```

## Test Configuration

Test configuration is centralized in `src/test/test.config.ts`:

- **Property-based tests**: 100 iterations minimum, 10s timeout
- **Unit tests**: 5s timeout
- **Integration tests**: 15s timeout

## Writing Tests

### Unit Test Example

```typescript
import * as assert from 'assert';

suite('MyComponent', () => {
  test('should do something', () => {
    const result = myFunction('input');
    assert.strictEqual(result, 'expected');
  });
});
```

### Property-Based Test Example

```typescript
import * as fc from 'fast-check';
import { runPropertyTest } from '../../test/helpers/property-test.helper';

suite('MyComponent Properties', () => {
  // **Feature: my-feature, Property 1: Some Property**
  test('should maintain invariant', () => {
    runPropertyTest(
      fc.property(fc.string(), (input) => {
        const result = myFunction(input);
        return result.length >= 0; // invariant
      }),
    );
  });
});
```

## Test Helpers

The `src/test/helpers/` directory contains utilities for testing:

- `property-test.helper.ts`: Helpers for property-based testing
  - `runPropertyTest()`: Run PBT with default config
  - `createTaggedPropertyTest()`: Create tagged property tests
  - `arbitraries`: Common data generators for VS Code extensions

## Requirements

Tests must satisfy the following requirements from the design document:

1. ✅ Both unit tests and property-based tests are used (Requirement 7.1)
2. ✅ Tests complete within reasonable time limits (Requirement 7.2)
3. ✅ Property-based tests run minimum 100 iterations
4. ✅ Each property test is tagged with its design document reference
5. ✅ Test coverage should reach 80% for critical paths (Requirement 7.4)

## Coverage Goals

- **Critical paths**: 80% minimum coverage
- **Infrastructure layer**: High coverage (logging, error handling, storage)
- **Command layer**: Medium coverage (focus on error handling)
- **Service layer**: Medium coverage (focus on business logic)
