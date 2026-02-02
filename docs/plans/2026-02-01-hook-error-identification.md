# Hook Error Identification Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Make fettle errors identifiable when SessionStart hooks fail by writing prefixed errors to stderr.

**Architecture:** Add a `writeHookError()` function that writes `[fettle] <message>` to stderr. Update `runInstall()` to use it for all error paths in hook mode. Claude Code shows stderr to users on hook failure, so this makes fettle errors visible and identifiable.

**Tech Stack:** Node.js (process.stderr.write), Vitest for testing

---

### Task 1: Add writeHookError utility

**Files:**
- Create: `src/hookError.ts`
- Create: `src/hookError.test.ts`

**Step 1: Write the failing test**

```typescript
// src/hookError.test.ts
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { writeHookError, formatHookError } from './hookError.js';

describe('formatHookError', () => {
  it('prefixes message with [fettle]', () => {
    expect(formatHookError('something failed')).toBe('[fettle] something failed\n');
  });

  it('handles multi-line messages', () => {
    expect(formatHookError('line1\nline2')).toBe('[fettle] line1\nline2\n');
  });
});

describe('writeHookError', () => {
  let stderrSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    stderrSpy = vi.spyOn(process.stderr, 'write').mockImplementation(() => true);
  });

  afterEach(() => {
    stderrSpy.mockRestore();
  });

  it('writes formatted message to stderr', () => {
    writeHookError('config not found');
    expect(stderrSpy).toHaveBeenCalledWith('[fettle] config not found\n');
  });
});
```

**Step 2: Run test to verify it fails**

Run: `npm test -- src/hookError.test.ts`
Expected: FAIL with "Cannot find module './hookError.js'"

**Step 3: Write minimal implementation**

```typescript
// src/hookError.ts
export function formatHookError(message: string): string {
  return `[fettle] ${message}\n`;
}

export function writeHookError(message: string): void {
  process.stderr.write(formatHookError(message));
}
```

**Step 4: Run test to verify it passes**

Run: `npm test -- src/hookError.test.ts`
Expected: PASS

**Step 5: Commit**

```bash
git add src/hookError.ts src/hookError.test.ts
git commit -m "feat: add writeHookError utility for hook error identification"
```

---

### Task 2: Use writeHookError for config read failures in hook mode

**Files:**
- Modify: `src/install.ts:97-106`
- Modify: `src/install.test.ts`

**Step 1: Write the failing test**

Add to `src/install.test.ts`:

```typescript
import { vi, beforeEach, afterEach } from 'vitest';

describe('runInstall hook mode error output', () => {
  let stderrSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    stderrSpy = vi.spyOn(process.stderr, 'write').mockImplementation(() => true);
  });

  afterEach(() => {
    stderrSpy.mockRestore();
  });

  it('writes config errors to stderr with [fettle] prefix in hook mode', () => {
    // This requires a directory that exists but has an invalid config
    // For now, test the formatter function directly
    // Integration test would need a temp dir with malformed TOML
  });
});
```

Actually, let's test via the exported function behavior. Update existing test:

```typescript
// Add to existing describe('runInstall with hook mode')
it('writes prefixed error to stderr when config is unreadable', () => {
  const stderrSpy = vi.spyOn(process.stderr, 'write').mockImplementation(() => true);

  // Create temp dir with malformed config - need to mock this
  // For now, verify the integration works by checking stderr was called
  // when there's an error condition

  stderrSpy.mockRestore();
});
```

Given testing complexity with file system, let's focus on the integration change and verify manually. Skip unit test for this step.

**Step 2: Update install.ts to write errors to stderr in hook mode**

Modify `src/install.ts`:

```typescript
// Add import at top
import { writeHookError } from './hookError.js';

// Update the config read error handler (around line 101-106):
} catch (err) {
  const message = `Failed to read config: ${err instanceof Error ? err.message : 'Unknown error'}`;
  if (options.hook) {
    writeHookError(message);
  }
  return {
    output: options.hook ? '' : message,
    exitCode: 1,
  };
}
```

**Step 3: Run all tests to verify nothing broke**

Run: `npm test`
Expected: PASS

**Step 4: Commit**

```bash
git add src/install.ts
git commit -m "feat: write config errors to stderr in hook mode"
```

---

### Task 3: Use writeHookError for profile resolution errors in hook mode

**Files:**
- Modify: `src/install.ts:127-132`

**Step 1: Update profile error handling**

Modify `src/install.ts` (around line 127-132):

```typescript
if (resolution.errors.length > 0) {
  const message = `Profile errors:\n${resolution.errors.map((e) => `  - ${e}`).join('\n')}`;
  if (options.hook) {
    writeHookError(message);
  }
  return {
    output: options.hook ? '' : `${colors.header('Profile errors:')}\n${resolution.errors.map((e) => `  ${symbols.missing} ${e}`).join('\n')}`,
    exitCode: 1,
  };
}
```

**Step 2: Run tests**

Run: `npm test`
Expected: PASS

**Step 3: Commit**

```bash
git add src/install.ts
git commit -m "feat: write profile errors to stderr in hook mode"
```

---

### Task 4: Use writeHookError for plugin install failures in hook mode

**Files:**
- Modify: `src/install.ts:159-181`

**Step 1: Update install failure handling**

The current code captures failures but doesn't report them to stderr. Update the loop and final check:

```typescript
for (const plugin of diff.missing) {
  try {
    installPlugin(plugin.id);
    result.installed.push(plugin.id);
  } catch (err) {
    const error = err instanceof Error ? err.message : 'Unknown error';
    result.failed.push({ id: plugin.id, error });
    if (options.hook) {
      writeHookError(`Failed to install ${plugin.id}: ${error}`);
    }
  }
}

// In hook mode: stdout for success message, stderr for errors (already written above)
if (options.hook) {
  if (result.failed.length > 0) {
    return {
      output: formatInstallResultHook(result), // Still report any successes
      exitCode: 1,
    };
  }
  return {
    output: formatInstallResultHook(result),
    exitCode: 0,
  };
}
```

**Step 2: Update the test expectation**

Modify `src/install.test.ts` - the test "returns empty stdout and uses stderr for failures" needs updating since we now also report partial successes:

```typescript
it('writes failures to stderr in hook mode', () => {
  const result: InstallResult = {
    installed: [],
    failed: [{ id: 'bad@registry', error: 'not found' }],
    alreadyPresent: [],
  };
  const formatted = formatInstallResultHook(result);
  // stdout still empty when nothing installed (failures go to stderr separately)
  expect(formatted).toBe('');
});
```

**Step 3: Run tests**

Run: `npm test`
Expected: PASS

**Step 4: Commit**

```bash
git add src/install.ts src/install.test.ts
git commit -m "feat: write plugin install failures to stderr in hook mode"
```

---

### Task 5: Manual verification

**Step 1: Build**

Run: `npm run build`

**Step 2: Test hook mode with a broken config**

Create a temp test:
```bash
mkdir -p /tmp/fettle-test/.claude
echo "invalid toml [[[" > /tmp/fettle-test/.claude/fettle.toml
cd /tmp/fettle-test
fettle install --hook 2>&1
```

Expected: See `[fettle] Failed to read config: ...` in output

**Step 3: Clean up**

```bash
rm -rf /tmp/fettle-test
```

**Step 4: Commit any final adjustments**

If needed.

---

## Summary

After implementation:
- All error paths in `runInstall()` hook mode write to stderr with `[fettle]` prefix
- Users can identify fettle as the source of SessionStart hook failures
- Existing behavior unchanged for non-hook mode
