# Config Error Granularity

**Source:** Code review during hook error identification implementation (2026-02-01)

## Issue

The config loading in `src/install.ts` catches both file I/O errors and TOML parse errors in a single catch block:

```typescript
try {
  configContent = readFileSync(configPath, 'utf-8');
  config = parseConfig(configContent);
} catch (err) {
  const message = `Failed to read config: ${err instanceof Error ? err.message : 'Unknown error'}`;
  // ...
}
```

This produces misleading error messages when the file exists but has invalid syntax:
- Current: `[fettle] Failed to read config: Invalid TOML document...`
- Better: `[fettle] Failed to parse config: Invalid TOML document...`

## Suggested Fix

Separate the catch blocks:

```typescript
let configContent: string;
try {
  configContent = readFileSync(configPath, 'utf-8');
} catch (err) {
  const message = `Failed to read config: ${err instanceof Error ? err.message : 'Unknown error'}`;
  if (options.hook) writeHookError(message);
  return { output: options.hook ? '' : message, exitCode: 1 };
}

let config: FettleConfig;
try {
  config = parseConfig(configContent);
} catch (err) {
  const message = `Failed to parse config: ${err instanceof Error ? err.message : 'Unknown error'}`;
  if (options.hook) writeHookError(message);
  return { output: options.hook ? '' : message, exitCode: 1 };
}
```

## Impact

- Low priority - current behavior works, just slightly misleading
- Affects: `src/install.ts`, `src/status.ts` (same pattern)
- Tests: May need adjustment for error message changes

## Decision

Defer - current behavior is functional. Consider when doing error handling improvements.
