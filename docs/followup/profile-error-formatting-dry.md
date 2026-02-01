# Profile Error Formatting DRY

**Source:** Code review during hook error identification implementation (2026-02-01)

## Issue

Profile error handling builds the error list twice with different formatting:

```typescript
// Plain text for stderr (hook mode)
const message = `Profile errors:\n${resolution.errors.map((e) => `  - ${e}`).join('\n')}`;

// Styled for stdout (normal mode)
output: `${colors.header('Profile errors:')}\n${resolution.errors.map((e) => `  ${symbols.missing} ${e}`).join('\n')}`
```

The duplication is intentional (different formats serve different purposes) but could be consolidated.

## Suggested Fix

Extract error list formatting:

```typescript
const formatErrorList = (errors: string[], styled: boolean): string =>
  errors.map((e) => `  ${styled ? symbols.missing + ' ' : '- '}${e}`).join('\n');

// Usage
const errorList = formatErrorList(resolution.errors, false);
const message = `Profile errors:\n${errorList}`;
if (options.hook) writeHookError(message);
return {
  output: options.hook ? '' : `${colors.header('Profile errors:')}\n${formatErrorList(resolution.errors, true)}`,
  exitCode: 1,
};
```

## Impact

- Very low priority - cosmetic improvement
- Risk of over-abstraction for a single use case

## Decision

Defer - the duplication is minor and the intent is clear. YAGNI.
