# Testing Quick Reference

## Commands

```bash
# Fast unit/property tests (no VS Code launch)
npm run test:unit

# Full test suite (with VS Code integration)
npm test

# Compile tests
npm run compile:test

# Watch mode
npm run watch

# Lint
npm run lint
```

## Writing a Unit Test

```typescript
// src/commands/__tests__/MyCommand.test.ts
import * as assert from 'assert';

suite('MyCommand', () => {
    test('should do something', () => {
        const result = myFunction('input');
        assert.strictEqual(result, 'expected');
    });
});
```

## Writing a Property-Based Test

```typescript
// src/__tests__/properties/my-feature.property.test.ts
import * as fc from 'fast-check';
import { runPropertyTest } from '../../test/helpers/property-test.helper';

suite('My Feature Properties', () => {
    // **Feature: extension-architecture-refactoring, Property 1: Description**
    test('should maintain invariant', () => {
        runPropertyTest(
            fc.property(fc.string(), (input) => {
                const result = myFunction(input);
                return result.length >= 0; // invariant
            })
        );
    });
});
```

## Common Arbitraries

```typescript
import { arbitraries } from '../../test/helpers/property-test.helper';

// Use pre-built generators
fc.property(arbitraries.configKey(), (key) => { /* ... */ });
fc.property(arbitraries.language(), (lang) => { /* ... */ });
fc.property(arbitraries.messageStyle(), (style) => { /* ... */ });
fc.property(arbitraries.apiKey(), (key) => { /* ... */ });
```

## Test File Locations

- **Property tests**: `src/__tests__/properties/*.property.test.ts`
- **Integration tests**: `src/__tests__/integration/*.integration.test.ts`
- **Unit tests**: `src/{module}/__tests__/*.test.ts`

## Configuration

Edit `src/test/test.config.ts` to change:
- Number of property test iterations (default: 100)
- Timeouts
- Verbose output

## Debugging

1. Set breakpoints in test files
2. Use VS Code "Run and Debug" panel
3. Select "Extension Tests"
4. Press F5

## Requirements

- ✅ Property tests must run 100+ iterations
- ✅ Tag property tests with design doc reference
- ✅ Both unit and property tests required
- ✅ 80% coverage goal for critical paths

## Help

See `TESTING.md` for full documentation.
