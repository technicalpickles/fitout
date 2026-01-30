# Claude Integration Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add `--hook` flag to `apply` command and `init` command to wire Fettle into Claude's SessionStart hook.

**Architecture:** Extend existing `runApply()` with hook mode that changes output behavior. New `init` command reads/writes `~/.claude/settings.json` to add hook config.

**Tech Stack:** TypeScript, Commander.js, Node.js fs, readline for interactive prompts

---

## Task 1: Add `--hook` flag to apply command

### Files:
- Modify: `src/apply.ts`
- Modify: `src/cli.ts`
- Test: `src/apply.test.ts`

### Step 1: Write failing test for hook mode - no config

```typescript
// Add to src/apply.test.ts
describe('runApply with hook mode', () => {
  it('returns empty output when no config found', () => {
    // runApply looks for .claude/fettle.toml in git root
    // When run in a temp dir with no config, hook mode should be silent
    const result = runApply('/tmp/nonexistent-project-dir', { hook: true });
    expect(result.output).toBe('');
    expect(result.exitCode).toBe(0);
  });
});
```

### Step 2: Run test to verify it fails

Run: `npm test -- --run`
Expected: FAIL - `hook` option not recognized or wrong output

### Step 3: Add hook option type and no-config handling

In `src/apply.ts`, update the function signature and add early return:

```typescript
export function runApply(cwd: string, options: { dryRun?: boolean; hook?: boolean } = {}): { output: string; exitCode: number } {
  const configPath = findConfigPath(cwd);

  if (!configPath) {
    // In hook mode, no config is not an error - project doesn't use Fettle
    if (options.hook) {
      return { output: '', exitCode: 0 };
    }
    return {
      output: 'No fettle.toml found. Run `fettle init` to create one.',
      exitCode: 1,
    };
  }
  // ... rest unchanged
```

### Step 4: Run test to verify it passes

Run: `npm test -- --run`
Expected: PASS

### Step 5: Commit

```bash
git add src/apply.ts src/apply.test.ts
git commit -m "feat(apply): add --hook flag with silent no-config handling"
```

---

## Task 2: Hook mode - nothing to do

### Files:
- Modify: `src/apply.ts`
- Test: `src/apply.test.ts`

### Step 1: Write failing test for hook mode - nothing to do

```typescript
// Add to the 'runApply with hook mode' describe block
it('returns empty output when nothing to install', () => {
  // This needs a real config but all plugins installed
  // We'll mock at the formatApplyResult level instead
});
```

Actually, we need to test `formatApplyResultHook`. Add new formatter:

```typescript
describe('formatApplyResultHook', () => {
  it('returns empty string when nothing to do', () => {
    const result: ApplyResult = {
      installed: [],
      failed: [],
      alreadyPresent: ['plugin-a@registry'],
    };
    expect(formatApplyResultHook(result)).toBe('');
  });
});
```

### Step 2: Run test to verify it fails

Run: `npm test -- --run`
Expected: FAIL - `formatApplyResultHook` not defined

### Step 3: Implement formatApplyResultHook

In `src/apply.ts`:

```typescript
export function formatApplyResultHook(result: ApplyResult): string {
  if (result.installed.length === 0 && result.failed.length === 0) {
    return '';
  }
  // TODO: handle installed case in next task
  return '';
}
```

### Step 4: Run test to verify it passes

Run: `npm test -- --run`
Expected: PASS

### Step 5: Commit

```bash
git add src/apply.ts src/apply.test.ts
git commit -m "feat(apply): add formatApplyResultHook for silent no-op"
```

---

## Task 3: Hook mode - plugins installed message

### Files:
- Modify: `src/apply.ts`
- Test: `src/apply.test.ts`

### Step 1: Write failing test

```typescript
it('returns restart message when plugins installed', () => {
  const result: ApplyResult = {
    installed: ['plugin-a@registry', 'plugin-b@registry'],
    failed: [],
    alreadyPresent: [],
  };
  expect(formatApplyResultHook(result)).toBe('Installed 2 plugins. Restart Claude to activate.');
});

it('uses singular for one plugin', () => {
  const result: ApplyResult = {
    installed: ['plugin-a@registry'],
    failed: [],
    alreadyPresent: [],
  };
  expect(formatApplyResultHook(result)).toBe('Installed 1 plugin. Restart Claude to activate.');
});
```

### Step 2: Run test to verify it fails

Run: `npm test -- --run`
Expected: FAIL - returns empty string

### Step 3: Implement installed message

```typescript
export function formatApplyResultHook(result: ApplyResult): string {
  if (result.installed.length === 0 && result.failed.length === 0) {
    return '';
  }

  if (result.installed.length > 0 && result.failed.length === 0) {
    const s = result.installed.length === 1 ? '' : 's';
    return `Installed ${result.installed.length} plugin${s}. Restart Claude to activate.`;
  }

  return '';
}
```

### Step 4: Run test to verify it passes

Run: `npm test -- --run`
Expected: PASS

### Step 5: Commit

```bash
git add src/apply.ts src/apply.test.ts
git commit -m "feat(apply): hook mode restart message on install"
```

---

## Task 4: Hook mode - failure handling

### Files:
- Modify: `src/apply.ts`
- Test: `src/apply.test.ts`

### Step 1: Write failing test

```typescript
it('returns empty stdout and uses stderr for failures', () => {
  const result: ApplyResult = {
    installed: [],
    failed: [{ id: 'bad@registry', error: 'not found' }],
    alreadyPresent: [],
  };
  const formatted = formatApplyResultHook(result);
  // In hook mode, failures go to stderr, stdout stays empty
  expect(formatted).toBe('');
});

it('reports installs even when some fail', () => {
  const result: ApplyResult = {
    installed: ['good@registry'],
    failed: [{ id: 'bad@registry', error: 'not found' }],
    alreadyPresent: [],
  };
  const formatted = formatApplyResultHook(result);
  expect(formatted).toBe('Installed 1 plugin. Restart Claude to activate.');
});
```

### Step 2: Run test to verify it fails

Run: `npm test -- --run`
Expected: FAIL

### Step 3: Update formatApplyResultHook

```typescript
export function formatApplyResultHook(result: ApplyResult): string {
  if (result.installed.length === 0) {
    // Nothing installed - either nothing to do or all failed
    // Failures go to stderr, so stdout is empty
    return '';
  }

  const s = result.installed.length === 1 ? '' : 's';
  return `Installed ${result.installed.length} plugin${s}. Restart Claude to activate.`;
}
```

### Step 4: Run test to verify it passes

Run: `npm test -- --run`
Expected: PASS

### Step 5: Commit

```bash
git add src/apply.ts src/apply.test.ts
git commit -m "feat(apply): hook mode failure handling"
```

---

## Task 5: Wire hook mode into runApply

### Files:
- Modify: `src/apply.ts`

### Step 1: Update runApply to use hook formatter

Find the return statement at the end of `runApply` and add hook mode branch:

```typescript
  // At the end of runApply, replace the final return with:
  if (options.hook) {
    // In hook mode: stdout for success message, stderr for errors
    if (result.failed.length > 0) {
      return {
        output: '',
        exitCode: 1,
      };
    }
    return {
      output: formatApplyResultHook(result),
      exitCode: 0,
    };
  }

  return {
    output: `Context: ${projectRoot}\n\n${formatApplyResult(result)}`,
    exitCode: result.failed.length > 0 ? 1 : 0,
  };
```

### Step 2: Run tests

Run: `npm test -- --run`
Expected: PASS

### Step 3: Commit

```bash
git add src/apply.ts
git commit -m "feat(apply): wire hook mode into runApply"
```

---

## Task 6: Add --hook flag to CLI

### Files:
- Modify: `src/cli.ts`

### Step 1: Add option to apply command

```typescript
program
  .command('apply')
  .description('Install missing plugins to sync desired state')
  .option('--dry-run', 'Show what would change without applying')
  .option('--hook', 'Hook mode: silent on no-op, minimal output for Claude context')
  .action((options) => {
    const { output, exitCode } = runApply(process.cwd(), {
      dryRun: options.dryRun,
      hook: options.hook,
    });
    if (output) {
      console.log(output);
    }
    process.exit(exitCode);
  });
```

### Step 2: Test manually

Run: `npm run dev -- apply --hook`
Expected: Empty output (assuming no config in cwd)

### Step 3: Commit

```bash
git add src/cli.ts
git commit -m "feat(cli): add --hook flag to apply command"
```

---

## Task 7: Create init module structure

### Files:
- Create: `src/init.ts`
- Test: `src/init.test.ts`

### Step 1: Create test file with first test

```typescript
// src/init.test.ts
import { describe, it, expect } from 'vitest';
import { getClaudeSettingsPath } from './init.js';
import { homedir } from 'node:os';
import { join } from 'node:path';

describe('getClaudeSettingsPath', () => {
  it('returns path to Claude settings.json', () => {
    expect(getClaudeSettingsPath()).toBe(join(homedir(), '.claude', 'settings.json'));
  });
});
```

### Step 2: Run test to verify it fails

Run: `npm test -- --run`
Expected: FAIL - module not found

### Step 3: Create init.ts with helper

```typescript
// src/init.ts
import { join } from 'node:path';
import { homedir } from 'node:os';

export function getClaudeSettingsPath(): string {
  return join(homedir(), '.claude', 'settings.json');
}
```

### Step 4: Run test to verify it passes

Run: `npm test -- --run`
Expected: PASS

### Step 5: Commit

```bash
git add src/init.ts src/init.test.ts
git commit -m "feat(init): add getClaudeSettingsPath helper"
```

---

## Task 8: Read and parse Claude settings

### Files:
- Modify: `src/init.ts`
- Test: `src/init.test.ts`

### Step 1: Write failing test

```typescript
import { readClaudeSettings } from './init.js';

describe('readClaudeSettings', () => {
  it('returns empty object for nonexistent file', () => {
    const settings = readClaudeSettings('/nonexistent/path/settings.json');
    expect(settings).toEqual({});
  });

  it('parses existing JSON file', () => {
    // We'll use a temp file for this
    const fs = await import('node:fs');
    const os = await import('node:os');
    const path = await import('node:path');

    const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'fettle-test-'));
    const settingsPath = path.join(tmpDir, 'settings.json');
    fs.writeFileSync(settingsPath, JSON.stringify({ foo: 'bar' }));

    const settings = readClaudeSettings(settingsPath);
    expect(settings).toEqual({ foo: 'bar' });

    fs.rmSync(tmpDir, { recursive: true });
  });
});
```

### Step 2: Run test to verify it fails

Run: `npm test -- --run`
Expected: FAIL - function not found

### Step 3: Implement readClaudeSettings

```typescript
import { readFileSync, existsSync } from 'node:fs';

export function readClaudeSettings(path: string): Record<string, unknown> {
  if (!existsSync(path)) {
    return {};
  }
  try {
    const content = readFileSync(path, 'utf-8');
    return JSON.parse(content);
  } catch {
    return {};
  }
}
```

### Step 4: Run test to verify it passes

Run: `npm test -- --run`
Expected: PASS

### Step 5: Commit

```bash
git add src/init.ts src/init.test.ts
git commit -m "feat(init): add readClaudeSettings"
```

---

## Task 9: Check if hook already exists

### Files:
- Modify: `src/init.ts`
- Test: `src/init.test.ts`

### Step 1: Write failing test

```typescript
import { hasFettleHook } from './init.js';

describe('hasFettleHook', () => {
  it('returns false for empty settings', () => {
    expect(hasFettleHook({})).toBe(false);
  });

  it('returns false for settings without hooks', () => {
    expect(hasFettleHook({ env: {} })).toBe(false);
  });

  it('returns true when fettle hook exists', () => {
    const settings = {
      hooks: {
        SessionStart: [
          {
            hooks: [
              { type: 'command', command: 'fettle apply --hook' }
            ]
          }
        ]
      }
    };
    expect(hasFettleHook(settings)).toBe(true);
  });

  it('returns false for other SessionStart hooks', () => {
    const settings = {
      hooks: {
        SessionStart: [
          {
            hooks: [
              { type: 'command', command: 'echo hello' }
            ]
          }
        ]
      }
    };
    expect(hasFettleHook(settings)).toBe(false);
  });
});
```

### Step 2: Run test to verify it fails

Run: `npm test -- --run`
Expected: FAIL

### Step 3: Implement hasFettleHook

```typescript
export function hasFettleHook(settings: Record<string, unknown>): boolean {
  const hooks = settings.hooks as Record<string, unknown[]> | undefined;
  if (!hooks?.SessionStart) return false;

  const sessionStartHooks = hooks.SessionStart as Array<{ hooks?: Array<{ command?: string }> }>;

  return sessionStartHooks.some((matcher) =>
    matcher.hooks?.some((hook) => hook.command?.includes('fettle apply --hook'))
  );
}
```

### Step 4: Run test to verify it passes

Run: `npm test -- --run`
Expected: PASS

### Step 5: Commit

```bash
git add src/init.ts src/init.test.ts
git commit -m "feat(init): add hasFettleHook checker"
```

---

## Task 10: Add hook to settings

### Files:
- Modify: `src/init.ts`
- Test: `src/init.test.ts`

### Step 1: Write failing test

```typescript
import { addFettleHook } from './init.js';

describe('addFettleHook', () => {
  it('creates hooks object if missing', () => {
    const settings = {};
    const result = addFettleHook(settings);
    expect(result.hooks.SessionStart).toBeDefined();
  });

  it('creates SessionStart array if missing', () => {
    const settings = { hooks: {} };
    const result = addFettleHook(settings);
    expect(result.hooks.SessionStart).toBeInstanceOf(Array);
  });

  it('appends to existing SessionStart hooks', () => {
    const settings = {
      hooks: {
        SessionStart: [
          { hooks: [{ type: 'command', command: 'echo existing' }] }
        ]
      }
    };
    const result = addFettleHook(settings);
    expect(result.hooks.SessionStart).toHaveLength(2);
  });

  it('adds the correct hook structure', () => {
    const settings = {};
    const result = addFettleHook(settings);
    expect(result.hooks.SessionStart[0]).toEqual({
      hooks: [
        { type: 'command', command: 'fettle apply --hook' }
      ]
    });
  });
});
```

### Step 2: Run test to verify it fails

Run: `npm test -- --run`
Expected: FAIL

### Step 3: Implement addFettleHook

```typescript
interface ClaudeSettings {
  hooks?: {
    SessionStart?: Array<{
      hooks: Array<{ type: string; command: string }>;
    }>;
    [key: string]: unknown;
  };
  [key: string]: unknown;
}

export function addFettleHook(settings: Record<string, unknown>): ClaudeSettings {
  const result = { ...settings } as ClaudeSettings;

  if (!result.hooks) {
    result.hooks = {};
  }

  if (!result.hooks.SessionStart) {
    result.hooks.SessionStart = [];
  }

  result.hooks.SessionStart.push({
    hooks: [
      { type: 'command', command: 'fettle apply --hook' }
    ]
  });

  return result;
}
```

### Step 4: Run test to verify it passes

Run: `npm test -- --run`
Expected: PASS

### Step 5: Commit

```bash
git add src/init.ts src/init.test.ts
git commit -m "feat(init): add addFettleHook function"
```

---

## Task 11: Write settings to file

### Files:
- Modify: `src/init.ts`
- Test: `src/init.test.ts`

### Step 1: Write failing test

```typescript
import { writeClaudeSettings } from './init.js';
import { mkdtempSync, rmSync, readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

describe('writeClaudeSettings', () => {
  it('writes JSON with 2-space indentation', () => {
    const tmpDir = mkdtempSync(join(tmpdir(), 'fettle-test-'));
    const settingsPath = join(tmpDir, 'settings.json');

    writeClaudeSettings(settingsPath, { foo: 'bar' });

    const content = readFileSync(settingsPath, 'utf-8');
    expect(content).toBe('{\n  "foo": "bar"\n}\n');

    rmSync(tmpDir, { recursive: true });
  });

  it('creates parent directories if needed', () => {
    const tmpDir = mkdtempSync(join(tmpdir(), 'fettle-test-'));
    const settingsPath = join(tmpDir, 'nested', 'dir', 'settings.json');

    writeClaudeSettings(settingsPath, { foo: 'bar' });

    const content = readFileSync(settingsPath, 'utf-8');
    expect(content).toContain('foo');

    rmSync(tmpDir, { recursive: true });
  });
});
```

### Step 2: Run test to verify it fails

Run: `npm test -- --run`
Expected: FAIL

### Step 3: Implement writeClaudeSettings

```typescript
import { writeFileSync, mkdirSync } from 'node:fs';
import { dirname } from 'node:path';

export function writeClaudeSettings(path: string, settings: Record<string, unknown>): void {
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, JSON.stringify(settings, null, 2) + '\n');
}
```

### Step 4: Run test to verify it passes

Run: `npm test -- --run`
Expected: PASS

### Step 5: Commit

```bash
git add src/init.ts src/init.test.ts
git commit -m "feat(init): add writeClaudeSettings function"
```

---

## Task 12: Create default profile

### Files:
- Modify: `src/init.ts`
- Test: `src/init.test.ts`

### Step 1: Write failing test

```typescript
import { createDefaultProfile, getDefaultProfilePath } from './init.js';
import { mkdtempSync, rmSync, readFileSync, existsSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

describe('getDefaultProfilePath', () => {
  it('returns path to default profile', () => {
    const profilesDir = '/some/profiles/dir';
    expect(getDefaultProfilePath(profilesDir, 'default')).toBe('/some/profiles/dir/default.toml');
  });
});

describe('createDefaultProfile', () => {
  it('creates profile file with comment header', () => {
    const tmpDir = mkdtempSync(join(tmpdir(), 'fettle-test-'));
    const profilePath = join(tmpDir, 'default.toml');

    createDefaultProfile(profilePath);

    expect(existsSync(profilePath)).toBe(true);
    const content = readFileSync(profilePath, 'utf-8');
    expect(content).toContain('plugins');

    rmSync(tmpDir, { recursive: true });
  });

  it('does not overwrite existing profile', () => {
    const tmpDir = mkdtempSync(join(tmpdir(), 'fettle-test-'));
    const profilePath = join(tmpDir, 'default.toml');

    // Create existing profile
    writeFileSync(profilePath, 'existing content');

    createDefaultProfile(profilePath);

    const content = readFileSync(profilePath, 'utf-8');
    expect(content).toBe('existing content');

    rmSync(tmpDir, { recursive: true });
  });
});
```

### Step 2: Run test to verify it fails

Run: `npm test -- --run`
Expected: FAIL

### Step 3: Implement profile creation

```typescript
export function getDefaultProfilePath(profilesDir: string, name: string): string {
  return join(profilesDir, `${name}.toml`);
}

export function createDefaultProfile(profilePath: string): boolean {
  if (existsSync(profilePath)) {
    return false; // Already exists
  }

  mkdirSync(dirname(profilePath), { recursive: true });

  const content = `# Fettle profile - plugins listed here apply to all projects
# Add plugins in the format: "plugin-name@registry"

plugins = [
  # "example-plugin@marketplace",
]
`;

  writeFileSync(profilePath, content);
  return true;
}
```

### Step 4: Run test to verify it passes

Run: `npm test -- --run`
Expected: PASS

### Step 5: Commit

```bash
git add src/init.ts src/init.test.ts
git commit -m "feat(init): add profile creation helpers"
```

---

## Task 13: Implement runInit function

### Files:
- Modify: `src/init.ts`
- Test: `src/init.test.ts`

### Step 1: Write failing test

```typescript
import { runInit, InitResult } from './init.js';

describe('runInit', () => {
  it('returns already initialized when hook exists', () => {
    const tmpDir = mkdtempSync(join(tmpdir(), 'fettle-test-'));
    const settingsPath = join(tmpDir, 'settings.json');
    const profilesDir = join(tmpDir, 'profiles');

    // Create settings with existing hook
    writeFileSync(settingsPath, JSON.stringify({
      hooks: {
        SessionStart: [{
          hooks: [{ type: 'command', command: 'fettle apply --hook' }]
        }]
      }
    }));

    const result = runInit({ settingsPath, profilesDir, createProfile: false });

    expect(result.hookAdded).toBe(false);
    expect(result.alreadyInitialized).toBe(true);

    rmSync(tmpDir, { recursive: true });
  });

  it('adds hook when not present', () => {
    const tmpDir = mkdtempSync(join(tmpdir(), 'fettle-test-'));
    const settingsPath = join(tmpDir, 'settings.json');
    const profilesDir = join(tmpDir, 'profiles');

    const result = runInit({ settingsPath, profilesDir, createProfile: false });

    expect(result.hookAdded).toBe(true);
    expect(result.alreadyInitialized).toBe(false);

    // Verify settings file
    const settings = JSON.parse(readFileSync(settingsPath, 'utf-8'));
    expect(settings.hooks.SessionStart).toBeDefined();

    rmSync(tmpDir, { recursive: true });
  });

  it('creates profile when requested', () => {
    const tmpDir = mkdtempSync(join(tmpdir(), 'fettle-test-'));
    const settingsPath = join(tmpDir, 'settings.json');
    const profilesDir = join(tmpDir, 'profiles');

    const result = runInit({
      settingsPath,
      profilesDir,
      createProfile: true,
      profileName: 'default'
    });

    expect(result.profileCreated).toBe(true);
    expect(result.profilePath).toBe(join(profilesDir, 'default.toml'));
    expect(existsSync(result.profilePath!)).toBe(true);

    rmSync(tmpDir, { recursive: true });
  });
});
```

### Step 2: Run test to verify it fails

Run: `npm test -- --run`
Expected: FAIL

### Step 3: Implement runInit

```typescript
export interface InitOptions {
  settingsPath: string;
  profilesDir: string;
  createProfile: boolean;
  profileName?: string;
}

export interface InitResult {
  hookAdded: boolean;
  alreadyInitialized: boolean;
  profileCreated: boolean;
  profilePath?: string;
}

export function runInit(options: InitOptions): InitResult {
  const { settingsPath, profilesDir, createProfile, profileName = 'default' } = options;

  const result: InitResult = {
    hookAdded: false,
    alreadyInitialized: false,
    profileCreated: false,
  };

  // Read existing settings
  const settings = readClaudeSettings(settingsPath);

  // Check if already initialized
  if (hasFettleHook(settings)) {
    result.alreadyInitialized = true;
  } else {
    // Add hook
    const updated = addFettleHook(settings);
    writeClaudeSettings(settingsPath, updated);
    result.hookAdded = true;
  }

  // Create profile if requested
  if (createProfile) {
    const profilePath = getDefaultProfilePath(profilesDir, profileName);
    result.profilePath = profilePath;
    result.profileCreated = createDefaultProfile(profilePath);
  }

  return result;
}
```

### Step 4: Run test to verify it passes

Run: `npm test -- --run`
Expected: PASS

### Step 5: Commit

```bash
git add src/init.ts src/init.test.ts
git commit -m "feat(init): add runInit function"
```

---

## Task 14: Add init command to CLI (non-interactive)

### Files:
- Modify: `src/cli.ts`

### Step 1: Add init command with flags

```typescript
import { runInit, getClaudeSettingsPath } from './init.js';
import { getProfilesDir } from './context.js';

program
  .command('init')
  .description('Set up Fettle integration with Claude Code')
  .option('-y, --yes', 'Skip prompts, use defaults')
  .option('--hook-only', 'Only add the hook, do not create profile')
  .action((options) => {
    const settingsPath = getClaudeSettingsPath();
    const profilesDir = getProfilesDir();

    // For now, implement non-interactive mode only
    const createProfile = options.yes && !options.hookOnly;

    const result = runInit({
      settingsPath,
      profilesDir,
      createProfile,
      profileName: 'default',
    });

    if (result.alreadyInitialized) {
      console.log('Fettle is already initialized.');
      if (result.profileCreated) {
        console.log(`Created profile: ${result.profilePath}`);
      }
      process.exit(0);
    }

    console.log('Fettle initialized successfully!');
    if (result.hookAdded) {
      console.log(`  ✓ SessionStart hook added to ${settingsPath}`);
    }
    if (result.profileCreated) {
      console.log(`  ✓ Created profile: ${result.profilePath}`);
    }
    console.log('\nRestart Claude to activate the hook.');
    process.exit(0);
  });
```

### Step 2: Test manually

Run: `npm run dev -- init --yes`
Expected: Shows success message, creates hook and profile

### Step 3: Commit

```bash
git add src/cli.ts
git commit -m "feat(cli): add init command with --yes and --hook-only flags"
```

---

## Task 15: Add interactive mode to init

### Files:
- Modify: `src/cli.ts`
- Create: `src/prompt.ts`

### Step 1: Create simple prompt utility

```typescript
// src/prompt.ts
import * as readline from 'node:readline';

export async function confirm(question: string, defaultValue = true): Promise<boolean> {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  const hint = defaultValue ? '(Y/n)' : '(y/N)';

  return new Promise((resolve) => {
    rl.question(`${question} ${hint} `, (answer) => {
      rl.close();
      const trimmed = answer.trim().toLowerCase();
      if (trimmed === '') {
        resolve(defaultValue);
      } else {
        resolve(trimmed === 'y' || trimmed === 'yes');
      }
    });
  });
}

export async function input(question: string, defaultValue = ''): Promise<string> {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  const hint = defaultValue ? ` [${defaultValue}]` : '';

  return new Promise((resolve) => {
    rl.question(`${question}${hint}: `, (answer) => {
      rl.close();
      resolve(answer.trim() || defaultValue);
    });
  });
}
```

### Step 2: Update CLI init command

```typescript
import { confirm, input } from './prompt.js';

program
  .command('init')
  .description('Set up Fettle integration with Claude Code')
  .option('-y, --yes', 'Skip prompts, use defaults')
  .option('--hook-only', 'Only add the hook, do not create profile')
  .action(async (options) => {
    const settingsPath = getClaudeSettingsPath();
    const profilesDir = getProfilesDir();

    let createProfile = false;
    let profileName = 'default';

    if (options.hookOnly) {
      createProfile = false;
    } else if (options.yes) {
      createProfile = true;
    } else {
      // Interactive mode
      console.log('Fettle - Context-aware plugin manager for Claude Code\n');
      console.log('This will:');
      console.log(`  • Add a SessionStart hook to ${settingsPath}`);
      console.log(`  • Create ${profilesDir}/ for shared plugin profiles\n`);

      createProfile = await confirm('Create a default profile?');
      if (createProfile) {
        profileName = await input('Profile name', 'default');
      }
    }

    const result = runInit({
      settingsPath,
      profilesDir,
      createProfile,
      profileName,
    });

    if (result.alreadyInitialized && !result.profileCreated) {
      console.log('\nFettle is already initialized.');
      process.exit(0);
    }

    console.log('\nCreated:');
    if (result.hookAdded) {
      console.log(`  ✓ SessionStart hook added to ${settingsPath}`);
    }
    if (result.profileCreated) {
      console.log(`  ✓ ${result.profilePath}`);
    }
    if (result.alreadyInitialized) {
      console.log('  (hook already existed)');
    }

    console.log('\nNext steps:');
    if (result.profileCreated) {
      console.log(`  • Add plugins to your profile: ${result.profilePath}`);
    }
    console.log('  • Or create a project config: .claude/fettle.toml');
    console.log('  • Restart Claude to activate the hook');

    process.exit(0);
  });
```

### Step 3: Test interactively

Run: `npm run dev -- init`
Expected: Shows prompts, accepts input, creates files

### Step 4: Commit

```bash
git add src/prompt.ts src/cli.ts
git commit -m "feat(cli): add interactive mode to init command"
```

---

## Task 16: Update README

### Files:
- Modify: `README.md`

### Step 1: Add installation section

Add to README.md after the introduction:

```markdown
## Installation

```bash
# Install globally
npm install -g fettle

# Set up Claude integration
fettle init
```

This adds a SessionStart hook to Claude Code that automatically installs missing plugins when you start a session.

### Non-interactive setup

```bash
fettle init --yes        # Use defaults (creates default profile)
fettle init --hook-only  # Only add hook, no profile
```
```

### Step 2: Commit

```bash
git add README.md
git commit -m "docs: add installation instructions for init command"
```

---

## Task 17: Run full test suite and verify

### Step 1: Run all tests

Run: `npm test -- --run`
Expected: All tests pass

### Step 2: Run build

Run: `npm run build`
Expected: Builds successfully

### Step 3: Manual end-to-end test

```bash
# Test apply --hook with no config
npm run dev -- apply --hook
# Expected: no output, exit 0

# Test init
npm run dev -- init --yes
# Expected: success message, files created

# Verify settings.json has hook
cat ~/.claude/settings.json | grep -A5 SessionStart
```

### Step 4: Final commit if any fixes needed

```bash
git add -A
git commit -m "chore: final cleanup for claude integration"
```
