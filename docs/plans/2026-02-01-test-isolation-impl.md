# Test Isolation Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Centralize all config path resolution in `src/paths.ts` with env var overrides, enabling tests to run without touching real user directories.

**Architecture:** Create `src/paths.ts` as single source of truth for all path functions. Create `src/test-utils.ts` for test isolation helper. Migrate existing path functions from `init.ts`, `context.ts`, `globalConfig.ts`, `marketplace.ts`. Update all tests to use isolation helper.

**Tech Stack:** Node.js, Vitest (vi.stubEnv)

---

### Task 1: Add `.test-tmp/` to gitignore

**Files:**
- Modify: `.gitignore`

**Step 1: Add gitignore entry**

Add to `.gitignore`:

```
.test-tmp/
```

**Step 2: Commit**

```bash
git add .gitignore
git commit -m "chore: gitignore .test-tmp/ for test isolation"
```

---

### Task 2: Create `src/paths.ts` with tests

**Files:**
- Create: `src/paths.test.ts`
- Create: `src/paths.ts`

**Step 1: Write the failing tests**

```typescript
// src/paths.test.ts
import { describe, it, expect, vi, afterEach } from 'vitest';
import { homedir } from 'node:os';
import { join } from 'node:path';

describe('paths', () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  describe('getClaudeHome', () => {
    it('returns ~/.claude by default', async () => {
      const { getClaudeHome } = await import('./paths.js');
      expect(getClaudeHome()).toBe(join(homedir(), '.claude'));
    });

    it('respects CLAUDE_CONFIG_DIR env var', async () => {
      vi.stubEnv('CLAUDE_CONFIG_DIR', '/custom/claude');
      // Re-import to pick up env change
      vi.resetModules();
      const { getClaudeHome } = await import('./paths.js');
      expect(getClaudeHome()).toBe('/custom/claude');
    });
  });

  describe('getFettleConfigHome', () => {
    it('returns ~/.config/fettle by default', async () => {
      const { getFettleConfigHome } = await import('./paths.js');
      expect(getFettleConfigHome()).toBe(join(homedir(), '.config', 'fettle'));
    });

    it('respects FETTLE_CONFIG_HOME env var', async () => {
      vi.stubEnv('FETTLE_CONFIG_HOME', '/custom/fettle');
      vi.resetModules();
      const { getFettleConfigHome } = await import('./paths.js');
      expect(getFettleConfigHome()).toBe('/custom/fettle');
    });
  });

  describe('derived paths', () => {
    it('getClaudeSettingsPath builds on getClaudeHome', async () => {
      vi.stubEnv('CLAUDE_CONFIG_DIR', '/test/claude');
      vi.resetModules();
      const { getClaudeSettingsPath } = await import('./paths.js');
      expect(getClaudeSettingsPath()).toBe('/test/claude/settings.json');
    });

    it('getClaudeSkillsDir builds on getClaudeHome', async () => {
      vi.stubEnv('CLAUDE_CONFIG_DIR', '/test/claude');
      vi.resetModules();
      const { getClaudeSkillsDir } = await import('./paths.js');
      expect(getClaudeSkillsDir()).toBe('/test/claude/skills');
    });

    it('getFettleSkillPath builds on getClaudeSkillsDir', async () => {
      vi.stubEnv('CLAUDE_CONFIG_DIR', '/test/claude');
      vi.resetModules();
      const { getFettleSkillPath } = await import('./paths.js');
      expect(getFettleSkillPath()).toBe('/test/claude/skills/fettle/SKILL.md');
    });

    it('getMarketplacesDir builds on getClaudeHome', async () => {
      vi.stubEnv('CLAUDE_CONFIG_DIR', '/test/claude');
      vi.resetModules();
      const { getMarketplacesDir } = await import('./paths.js');
      expect(getMarketplacesDir()).toBe('/test/claude/plugins/marketplaces');
    });

    it('getProfilesDir builds on getFettleConfigHome', async () => {
      vi.stubEnv('FETTLE_CONFIG_HOME', '/test/fettle');
      vi.resetModules();
      const { getProfilesDir } = await import('./paths.js');
      expect(getProfilesDir()).toBe('/test/fettle/profiles');
    });

    it('getGlobalConfigPath builds on getFettleConfigHome', async () => {
      vi.stubEnv('FETTLE_CONFIG_HOME', '/test/fettle');
      vi.resetModules();
      const { getGlobalConfigPath } = await import('./paths.js');
      expect(getGlobalConfigPath()).toBe('/test/fettle/config.toml');
    });
  });
});
```

**Step 2: Run test to verify it fails**

Run: `npm test -- src/paths.test.ts`
Expected: FAIL with "Cannot find module './paths.js'"

**Step 3: Write the implementation**

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

**Step 4: Run test to verify it passes**

Run: `npm test -- src/paths.test.ts`
Expected: PASS

**Step 5: Commit**

```bash
git add src/paths.ts src/paths.test.ts
git commit -m "feat: add centralized paths module with env var overrides"
```

---

### Task 3: Create `src/test-utils.ts`

**Files:**
- Create: `src/test-utils.ts`
- Create: `src/test-utils.test.ts`

**Step 1: Write the failing test**

```typescript
// src/test-utils.test.ts
import { describe, it, expect, afterEach } from 'vitest';
import { existsSync } from 'node:fs';
import { setupTestEnv, cleanTestTmp } from './test-utils.js';
import { getClaudeHome, getFettleConfigHome } from './paths.js';

describe('setupTestEnv', () => {
  afterEach(() => {
    cleanTestTmp();
  });

  it('creates isolated directories', () => {
    const ctx = setupTestEnv();

    expect(existsSync(ctx.claudeHome)).toBe(true);
    expect(existsSync(ctx.fettleHome)).toBe(true);

    ctx.cleanup();
  });

  it('sets env vars so paths.ts returns isolated paths', () => {
    const ctx = setupTestEnv();

    expect(getClaudeHome()).toBe(ctx.claudeHome);
    expect(getFettleConfigHome()).toBe(ctx.fettleHome);

    ctx.cleanup();
  });

  it('cleanup unstubs env vars', () => {
    const ctx = setupTestEnv();
    const isolatedClaude = ctx.claudeHome;

    ctx.cleanup();

    // After cleanup, should return default (not isolated path)
    expect(getClaudeHome()).not.toBe(isolatedClaude);
  });
});
```

**Step 2: Run test to verify it fails**

Run: `npm test -- src/test-utils.test.ts`
Expected: FAIL with "Cannot find module './test-utils.js'"

**Step 3: Write the implementation**

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

export function cleanTestTmp(): void {
  rmSync(TEST_TMP_ROOT, { recursive: true, force: true });
}
```

**Step 4: Run test to verify it passes**

Run: `npm test -- src/test-utils.test.ts`
Expected: PASS

**Step 5: Commit**

```bash
git add src/test-utils.ts src/test-utils.test.ts
git commit -m "feat: add test-utils with setupTestEnv for isolation"
```

---

### Task 4: Migrate `src/init.ts` to use `paths.ts`

**Files:**
- Modify: `src/init.ts`
- Modify: `src/init.test.ts`

**Step 1: Update init.ts imports and remove local path functions**

In `src/init.ts`, replace:

```typescript
// REMOVE these lines (around lines 1-8):
import { join, dirname } from 'node:path';
import { homedir } from 'node:os';

// REMOVE these functions:
export function getClaudeSettingsPath(): string {
  return join(homedir(), '.claude', 'settings.json');
}

export function getSkillsDir(): string {
  return join(homedir(), '.claude', 'skills');
}

export function getFettleSkillPath(): string {
  return join(getSkillsDir(), 'fettle', 'SKILL.md');
}
```

Replace with:

```typescript
// src/init.ts
import { dirname } from 'node:path';
import { readFileSync, existsSync, writeFileSync, mkdirSync } from 'node:fs';
import {
  getClaudeSettingsPath,
  getClaudeSkillsDir,
  getFettleSkillPath,
} from './paths.js';
```

Update `createFettleSkill` to use imported `getClaudeSkillsDir`:

```typescript
export function createFettleSkill(): boolean {
  const skillPath = getFettleSkillPath();

  if (existsSync(skillPath)) {
    return false;
  }

  mkdirSync(dirname(skillPath), { recursive: true });
  // ... rest of function unchanged
}
```

**Step 2: Update init.test.ts**

In `src/init.test.ts`:

1. Update imports to get path functions from `paths.js`:

```typescript
// Replace:
import { getClaudeSettingsPath, ..., getSkillsDir, getFettleSkillPath, ... } from './init.js';

// With:
import { readClaudeSettings, hasFettleHook, addFettleHook, writeClaudeSettings, getDefaultProfilePath, createDefaultProfile, runInit, InitResult, createFettleSkill, hasFettleSkill, hasDefaultProfile, hasProjectConfig, getProjectConfigContent, getProjectConfigPath } from './init.js';
import { getClaudeSettingsPath, getClaudeSkillsDir, getFettleSkillPath } from './paths.js';
```

2. Add test isolation for skill tests (around line 279):

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

  it('creates skill file with correct content', () => {
    const created = createFettleSkill();
    expect(created).toBe(true);

    const skillPath = getFettleSkillPath();
    expect(existsSync(skillPath)).toBe(true);

    const content = readFileSync(skillPath, 'utf-8');
    expect(content).toContain('name: fettle');
    expect(content).toContain('description:');
    expect(content).toContain('Fettle Diagnostic');
  });

  it('does not overwrite existing skill', () => {
    createFettleSkill();
    const result = createFettleSkill();
    expect(result).toBe(false);
  });
});

describe('hasFettleSkill', () => {
  let ctx: TestContext;

  beforeEach(() => {
    ctx = setupTestEnv();
  });

  afterEach(() => {
    ctx.cleanup();
  });

  it('returns false when skill does not exist', () => {
    expect(hasFettleSkill()).toBe(false);
  });

  it('returns true when skill exists', () => {
    createFettleSkill();
    expect(hasFettleSkill()).toBe(true);
  });
});

describe('getClaudeSkillsDir', () => {
  it('returns path to Claude skills directory', () => {
    expect(getClaudeSkillsDir()).toBe(join(homedir(), '.claude', 'skills'));
  });
});

describe('getFettleSkillPath', () => {
  it('returns path to fettle skill file', () => {
    expect(getFettleSkillPath()).toBe(join(homedir(), '.claude', 'skills', 'fettle', 'SKILL.md'));
  });
});
```

**Step 3: Run tests to verify nothing broke**

Run: `npm test`
Expected: PASS

**Step 4: Commit**

```bash
git add src/init.ts src/init.test.ts
git commit -m "refactor: migrate init.ts to use centralized paths"
```

---

### Task 5: Migrate `src/context.ts` to use `paths.ts`

**Files:**
- Modify: `src/context.ts`
- Modify: `src/context.test.ts`

**Step 1: Update context.ts**

Replace entire file:

```typescript
// src/context.ts
import { existsSync } from 'node:fs';
import { execSync } from 'node:child_process';
import { join } from 'node:path';
import { getProfilesDir } from './paths.js';

export { getProfilesDir } from './paths.js';

export function resolveProjectRoot(cwd: string): string {
  try {
    const gitRoot = execSync('git rev-parse --show-toplevel', {
      cwd,
      encoding: 'utf-8',
      stdio: ['pipe', 'pipe', 'pipe'],
    }).trim();
    return gitRoot;
  } catch {
    return cwd;
  }
}

export function findConfigPath(startDir: string): string | null {
  const root = resolveProjectRoot(startDir);
  const configPath = join(root, '.claude', 'fettle.toml');

  if (existsSync(configPath)) {
    return configPath;
  }

  return null;
}
```

**Step 2: Update context.test.ts**

Update the `getProfilesDir` test to use isolation:

```typescript
// In src/context.test.ts, update imports:
import { describe, it, expect, beforeAll, afterAll, beforeEach, afterEach, vi } from 'vitest';
import { setupTestEnv, TestContext } from './test-utils.js';

// Update getProfilesDir tests:
describe('getProfilesDir', () => {
  it('returns profiles directory under user config', () => {
    const result = getProfilesDir();
    expect(result).toBe(join(homedir(), '.config', 'fettle', 'profiles'));
  });

  it('respects FETTLE_CONFIG_HOME env var', () => {
    vi.stubEnv('FETTLE_CONFIG_HOME', '/custom/fettle');
    const result = getProfilesDir();
    expect(result).toBe('/custom/fettle/profiles');
    vi.unstubAllEnvs();
  });
});
```

**Step 3: Run tests**

Run: `npm test`
Expected: PASS

**Step 4: Commit**

```bash
git add src/context.ts src/context.test.ts
git commit -m "refactor: migrate context.ts to use centralized paths"
```

---

### Task 6: Migrate `src/globalConfig.ts` to use `paths.ts`

**Files:**
- Modify: `src/globalConfig.ts`
- Modify: `src/globalConfig.test.ts`

**Step 1: Update globalConfig.ts**

Replace path-related code:

```typescript
// src/globalConfig.ts
import { dirname } from 'node:path';
import { readFileSync, existsSync, writeFileSync, mkdirSync } from 'node:fs';
import { parse, stringify } from 'smol-toml';
import { getGlobalConfigDir, getGlobalConfigPath } from './paths.js';

// Re-export from paths for backwards compatibility
export { getGlobalConfigDir, getGlobalConfigPath } from './paths.js';

export interface GlobalConfig {
  marketplaces?: Record<string, string>;
}

// Remove local getGlobalConfigDir and getGlobalConfigPath functions
// (they're now imported from paths.ts)

export function readGlobalConfig(): GlobalConfig {
  // ... unchanged
}

// ... rest of file unchanged
```

**Step 2: Update globalConfig.test.ts**

```typescript
// src/globalConfig.test.ts
import { describe, it, expect, vi, afterEach } from 'vitest';
import {
  getGlobalConfigContent,
  getGlobalConfigDir,
  getGlobalConfigPath,
} from './globalConfig.js';

describe('getGlobalConfigDir', () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it('returns path under ~/.config/fettle by default', () => {
    expect(getGlobalConfigDir()).toContain('.config');
    expect(getGlobalConfigDir()).toContain('fettle');
  });

  it('respects FETTLE_CONFIG_HOME env var', () => {
    vi.stubEnv('FETTLE_CONFIG_HOME', '/custom/fettle');
    expect(getGlobalConfigDir()).toBe('/custom/fettle');
  });
});

describe('getGlobalConfigPath', () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it('returns path to config.toml', () => {
    expect(getGlobalConfigPath()).toContain('config.toml');
  });

  it('respects FETTLE_CONFIG_HOME env var', () => {
    vi.stubEnv('FETTLE_CONFIG_HOME', '/custom/fettle');
    expect(getGlobalConfigPath()).toBe('/custom/fettle/config.toml');
  });
});

// ... rest of tests unchanged
```

**Step 3: Run tests**

Run: `npm test`
Expected: PASS

**Step 4: Commit**

```bash
git add src/globalConfig.ts src/globalConfig.test.ts
git commit -m "refactor: migrate globalConfig.ts to use centralized paths"
```

---

### Task 7: Migrate `src/marketplace.ts` to use `paths.ts`

**Files:**
- Modify: `src/marketplace.ts`
- Modify: `src/marketplace.test.ts` (if path tests exist)

**Step 1: Update marketplace.ts**

```typescript
// src/marketplace.ts
import { execFileSync } from 'node:child_process';
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { getConfiguredMarketplaces } from './globalConfig.js';
import { getMarketplacesDir } from './paths.js';

// Re-export for backwards compatibility
export { getMarketplacesDir } from './paths.js';

// Remove the local getMarketplacesDir function (was lines 24-26)
// Remove: import { homedir } from 'node:os';

// ... rest of file unchanged, but uses imported getMarketplacesDir
```

**Step 2: Run tests**

Run: `npm test`
Expected: PASS

**Step 3: Commit**

```bash
git add src/marketplace.ts
git commit -m "refactor: migrate marketplace.ts to use centralized paths"
```

---

### Task 8: Verify migration is complete

**Step 1: Check for stray homedir() calls**

Run:
```bash
grep -r "homedir()" src/*.ts | grep -v paths.ts | grep -v test
```

Expected output should only show `src/colors.ts` (display formatting, not config paths).

**Step 2: Run full test suite**

Run: `npm test`
Expected: PASS

**Step 3: Build to verify no type errors**

Run: `npm run build`
Expected: Success

**Step 4: Final commit if any cleanup needed**

If changes were required, commit them.

---

### Task 9: Update remaining tests to use isolation

**Files:**
- Modify: Any test files that still touch real directories

**Step 1: Search for tests that may need isolation**

Run:
```bash
grep -l "rmSync.*homedir\|homedir.*rmSync\|join(homedir" src/*.test.ts
```

**Step 2: Update any found tests to use setupTestEnv**

For each test file found, add:

```typescript
import { setupTestEnv, TestContext } from './test-utils.js';

// In describe blocks that touch user directories:
let ctx: TestContext;

beforeEach(() => {
  ctx = setupTestEnv();
});

afterEach(() => {
  ctx.cleanup();
});
```

**Step 3: Run tests**

Run: `npm test`
Expected: PASS

**Step 4: Commit**

```bash
git add -A
git commit -m "test: migrate remaining tests to use isolation helper"
```

---

## Summary

After implementation:
- All config paths resolve through `src/paths.ts`
- `CLAUDE_CONFIG_DIR` overrides `~/.claude/`
- `FETTLE_CONFIG_HOME` overrides `~/.config/fettle/`
- Tests use `setupTestEnv()` for isolation
- Test artifacts go to `.test-tmp/` (gitignored)
- No tests touch real user directories
