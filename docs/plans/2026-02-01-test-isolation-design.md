# Test Isolation Design

**Goal:** Prevent tests from modifying real `~/.claude/` and `~/.config/fettle/` directories by centralizing path resolution and respecting environment variable overrides.

## Environment Variables

| Directory | Default | Override |
|-----------|---------|----------|
| `~/.claude/` | Claude Code's config | `CLAUDE_CONFIG_DIR` (Claude's own var) |
| `~/.config/fettle/` | Fettle's config | `FETTLE_CONFIG_HOME` (new) |

## New Module: `src/paths.ts`

Centralized path resolution for all config directories.

```typescript
// src/paths.ts
import { join } from 'node:path';
import { homedir } from 'node:os';

// === Base directories ===

export function getClaudeHome(): string {
  return process.env.CLAUDE_CONFIG_DIR || join(homedir(), '.claude');
}

export function getFettleConfigHome(): string {
  return process.env.FETTLE_CONFIG_HOME || join(homedir(), '.config', 'fettle');
}

// === Claude Code paths ===

export function getClaudeSettingsPath(): string {
  return join(getClaudeHome(), 'settings.json');
}

export function getClaudeSkillsDir(): string {
  return join(getClaudeHome(), 'skills');
}

export function getFettleSkillPath(): string {
  return join(getClaudeSkillsDir(), 'fettle', 'SKILL.md');
}

export function getClaudePluginsDir(): string {
  return join(getClaudeHome(), 'plugins');
}

export function getMarketplacesDir(): string {
  return join(getClaudePluginsDir(), 'marketplaces');
}

// === Fettle config paths ===

export function getGlobalConfigDir(): string {
  return getFettleConfigHome();
}

export function getGlobalConfigPath(): string {
  return join(getFettleConfigHome(), 'config.toml');
}

export function getProfilesDir(): string {
  return join(getFettleConfigHome(), 'profiles');
}
```

## New Module: `src/test-utils.ts`

Test helper for isolated environments.

```typescript
// src/test-utils.ts
import { mkdirSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { vi } from 'vitest';

// Project-local temp directory (gitignored)
const TEST_TMP_ROOT = join(import.meta.dirname, '..', '.test-tmp');

export interface TestContext {
  claudeHome: string;
  fettleHome: string;
  baseDir: string;
  cleanup: () => void;
}

let testCounter = 0;

export function setupTestEnv(): TestContext {
  const testId = `${Date.now()}-${++testCounter}`;
  const baseDir = join(TEST_TMP_ROOT, testId);
  const claudeHome = join(baseDir, '.claude');
  const fettleHome = join(baseDir, '.config', 'fettle');

  mkdirSync(claudeHome, { recursive: true });
  mkdirSync(fettleHome, { recursive: true });

  vi.stubEnv('CLAUDE_CONFIG_DIR', claudeHome);
  vi.stubEnv('FETTLE_CONFIG_HOME', fettleHome);

  return {
    claudeHome,
    fettleHome,
    baseDir,
    cleanup: () => {
      vi.unstubAllEnvs();
    },
  };
}

// Clean all test artifacts
export function cleanTestTmp(): void {
  rmSync(TEST_TMP_ROOT, { recursive: true, force: true });
}
```

## Migration

Files to update (remove local path functions, import from `paths.ts`):

| File | Functions to remove/replace |
|------|----------------------------|
| `src/init.ts` | `getClaudeSettingsPath`, `getSkillsDir`, `getFettleSkillPath` |
| `src/context.ts` | `getProfilesDir` |
| `src/globalConfig.ts` | `getGlobalConfigDir`, `getGlobalConfigPath` |
| `src/marketplace.ts` | Inline `join(homedir(), '.claude', 'plugins', 'marketplaces')` |

## Gitignore Addition

```
.test-tmp/
```

## Verification

After migration, verify no stray config-related `homedir()` calls:

```bash
grep -r "homedir()" src/*.ts | grep -v paths.ts | grep -v test
```

**Allowed remaining usages:**
- `src/paths.ts` - Single source of truth
- `src/colors.ts` - Display formatting (not config paths)

## Test Migration

Update tests that touch real directories to use `setupTestEnv()`:

```typescript
import { setupTestEnv, TestContext } from './test-utils.js';

describe('createFettleSkill', () => {
  let ctx: TestContext;

  beforeEach(() => {
    ctx = setupTestEnv();
  });

  afterEach(() => {
    ctx.cleanup();
  });

  it('creates skill file', () => {
    const created = createFettleSkill();
    expect(created).toBe(true);
    // Writes to ctx.claudeHome, not real ~/.claude/
  });
});
```
