# Profiles Feature Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add composable user-global profiles so plugin sets can be shared across projects.

**Architecture:** Profiles are TOML files at `~/.config/fettle/profiles/<name>.toml`. Projects reference them via `profiles = ["name"]`. The `default` profile auto-includes if present. Plugins merge additively with provenance tracking for status output.

**Tech Stack:** TypeScript, smol-toml, vitest, Node.js fs/path/os modules

---

## Design Decisions (from discussion)

| Decision | Choice |
|----------|--------|
| Location | `~/.config/fettle/profiles/<name>.toml` |
| Composition | Additive merge, silent dedupe |
| Default | Auto-include `default.toml` if exists (silent miss) |
| Explicit profiles | Fatal error if missing |
| Reference syntax | `profiles = ["backend"]` infers `.toml` |
| Status output | Show provenance `plugin (from: default)` |
| Scope | All plugins install as local |

---

## Task 1: Add getProfilesDir() to context.ts

**Files:**
- Modify: `src/context.ts`
- Create: `src/context.test.ts` (add test)

**Step 1: Write the failing test**

Add to `src/context.test.ts`:

```typescript
import { getProfilesDir } from './context.js';
import { homedir } from 'node:os';
import { join } from 'node:path';

describe('getProfilesDir', () => {
  it('returns profiles directory under user config', () => {
    const result = getProfilesDir();
    expect(result).toBe(join(homedir(), '.config', 'fettle', 'profiles'));
  });
});
```

**Step 2: Run test to verify it fails**

Run: `npm test -- src/context.test.ts`
Expected: FAIL with "getProfilesDir is not exported"

**Step 3: Write minimal implementation**

Add to `src/context.ts`:

```typescript
import { homedir } from 'node:os';

export function getProfilesDir(): string {
  return join(homedir(), '.config', 'fettle', 'profiles');
}
```

**Step 4: Run test to verify it passes**

Run: `npm test -- src/context.test.ts`
Expected: PASS

**Step 5: Commit**

```bash
git add src/context.ts src/context.test.ts
git commit -m "feat: add getProfilesDir() for profile discovery"
```

---

## Task 2: Extend FettleConfig to parse profiles field

**Files:**
- Modify: `src/config.ts`
- Modify: `src/config.test.ts`

**Step 1: Write the failing test**

Add to `src/config.test.ts`:

```typescript
describe('parseConfig profiles field', () => {
  it('parses profiles array', () => {
    const toml = `
profiles = ["default", "backend"]
plugins = ["some-plugin@registry"]
`;
    const result = parseConfig(toml);
    expect(result.profiles).toEqual(['default', 'backend']);
  });

  it('returns empty array for missing profiles', () => {
    const toml = `plugins = ["some-plugin@registry"]`;
    const result = parseConfig(toml);
    expect(result.profiles).toEqual([]);
  });
});
```

**Step 2: Run test to verify it fails**

Run: `npm test -- src/config.test.ts`
Expected: FAIL with "result.profiles is undefined"

**Step 3: Write minimal implementation**

Update `src/config.ts`:

```typescript
export interface FettleConfig {
  plugins: string[];
  profiles: string[];
}

export function parseConfig(tomlContent: string): FettleConfig {
  const parsed = parse(tomlContent);

  const plugins = Array.isArray(parsed.plugins)
    ? parsed.plugins.filter((p): p is string => typeof p === 'string')
    : [];

  const profiles = Array.isArray(parsed.profiles)
    ? parsed.profiles.filter((p): p is string => typeof p === 'string')
    : [];

  return { plugins, profiles };
}
```

**Step 4: Run test to verify it passes**

Run: `npm test -- src/config.test.ts`
Expected: PASS

**Step 5: Commit**

```bash
git add src/config.ts src/config.test.ts
git commit -m "feat: parse profiles field from config"
```

---

## Task 3: Create profiles.ts module - types and loadProfile()

**Files:**
- Create: `src/profiles.ts`
- Create: `src/profiles.test.ts`

**Step 1: Write the failing test**

Create `src/profiles.test.ts`:

```typescript
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { loadProfile, ResolvedPlugin } from './profiles.js';
import { existsSync, readFileSync } from 'node:fs';

vi.mock('node:fs');

describe('loadProfile', () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it('loads existing profile and returns plugins', () => {
    vi.mocked(existsSync).mockReturnValue(true);
    vi.mocked(readFileSync).mockReturnValue(`
plugins = ["plugin-a@registry", "plugin-b@registry"]
`);

    const result = loadProfile('/profiles', 'backend');

    expect(result).toEqual(['plugin-a@registry', 'plugin-b@registry']);
    expect(readFileSync).toHaveBeenCalledWith('/profiles/backend.toml', 'utf-8');
  });

  it('returns null for missing profile', () => {
    vi.mocked(existsSync).mockReturnValue(false);

    const result = loadProfile('/profiles', 'nonexistent');

    expect(result).toBeNull();
  });

  it('returns empty array for profile with no plugins', () => {
    vi.mocked(existsSync).mockReturnValue(true);
    vi.mocked(readFileSync).mockReturnValue(`# empty profile`);

    const result = loadProfile('/profiles', 'empty');

    expect(result).toEqual([]);
  });
});
```

**Step 2: Run test to verify it fails**

Run: `npm test -- src/profiles.test.ts`
Expected: FAIL with "Cannot find module './profiles.js'"

**Step 3: Write minimal implementation**

Create `src/profiles.ts`:

```typescript
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { parse } from 'smol-toml';

export interface ResolvedPlugin {
  id: string;
  source: string; // "project" | profile name
}

export function loadProfile(profilesDir: string, name: string): string[] | null {
  const profilePath = join(profilesDir, `${name}.toml`);

  if (!existsSync(profilePath)) {
    return null;
  }

  const content = readFileSync(profilePath, 'utf-8');
  const parsed = parse(content);

  const plugins = Array.isArray(parsed.plugins)
    ? parsed.plugins.filter((p): p is string => typeof p === 'string')
    : [];

  return plugins;
}
```

**Step 4: Run test to verify it passes**

Run: `npm test -- src/profiles.test.ts`
Expected: PASS

**Step 5: Commit**

```bash
git add src/profiles.ts src/profiles.test.ts
git commit -m "feat: add loadProfile() to load individual profiles"
```

---

## Task 4: Add resolveProfiles() for full resolution logic

**Files:**
- Modify: `src/profiles.ts`
- Modify: `src/profiles.test.ts`

**Step 1: Write the failing tests**

Add to `src/profiles.test.ts`:

```typescript
import { loadProfile, resolveProfiles, ResolvedPlugin } from './profiles.js';

describe('resolveProfiles', () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it('returns project plugins when no profiles', () => {
    vi.mocked(existsSync).mockReturnValue(false); // no default

    const result = resolveProfiles('/profiles', {
      plugins: ['project-plugin@registry'],
      profiles: [],
    });

    expect(result.plugins).toEqual([
      { id: 'project-plugin@registry', source: 'project' },
    ]);
    expect(result.errors).toEqual([]);
  });

  it('auto-includes default profile when exists', () => {
    vi.mocked(existsSync).mockReturnValue(true);
    vi.mocked(readFileSync).mockReturnValue(`plugins = ["default-plugin@registry"]`);

    const result = resolveProfiles('/profiles', {
      plugins: ['project-plugin@registry'],
      profiles: [],
    });

    expect(result.plugins).toEqual([
      { id: 'default-plugin@registry', source: 'default' },
      { id: 'project-plugin@registry', source: 'project' },
    ]);
  });

  it('skips missing default silently', () => {
    vi.mocked(existsSync).mockReturnValue(false);

    const result = resolveProfiles('/profiles', {
      plugins: ['project-plugin@registry'],
      profiles: [],
    });

    expect(result.errors).toEqual([]);
  });

  it('errors on missing explicit profile', () => {
    vi.mocked(existsSync).mockImplementation((path) => {
      return !String(path).includes('nonexistent');
    });

    const result = resolveProfiles('/profiles', {
      plugins: [],
      profiles: ['nonexistent'],
    });

    expect(result.errors).toEqual(['Profile not found: nonexistent']);
  });

  it('loads explicit profiles', () => {
    vi.mocked(existsSync).mockReturnValue(true);
    vi.mocked(readFileSync).mockImplementation((path) => {
      if (String(path).includes('backend')) {
        return `plugins = ["backend-plugin@registry"]`;
      }
      return `plugins = []`;
    });

    const result = resolveProfiles('/profiles', {
      plugins: [],
      profiles: ['backend'],
    });

    expect(result.plugins).toContainEqual({
      id: 'backend-plugin@registry',
      source: 'backend',
    });
  });

  it('dedupes plugins, first source wins', () => {
    vi.mocked(existsSync).mockReturnValue(true);
    vi.mocked(readFileSync).mockReturnValue(`plugins = ["shared-plugin@registry"]`);

    const result = resolveProfiles('/profiles', {
      plugins: ['shared-plugin@registry'],
      profiles: [],
    });

    // default loads first, so it wins
    const shared = result.plugins.filter((p) => p.id === 'shared-plugin@registry');
    expect(shared).toHaveLength(1);
    expect(shared[0].source).toBe('default');
  });
});
```

**Step 2: Run test to verify it fails**

Run: `npm test -- src/profiles.test.ts`
Expected: FAIL with "resolveProfiles is not exported"

**Step 3: Write minimal implementation**

Add to `src/profiles.ts`:

```typescript
import { FettleConfig } from './config.js';

export interface ProfileResolutionResult {
  plugins: ResolvedPlugin[];
  errors: string[];
}

export function resolveProfiles(
  profilesDir: string,
  config: FettleConfig
): ProfileResolutionResult {
  const errors: string[] = [];
  const pluginMap = new Map<string, ResolvedPlugin>();

  // Helper to add plugins, first source wins
  const addPlugins = (plugins: string[], source: string) => {
    for (const id of plugins) {
      if (!pluginMap.has(id)) {
        pluginMap.set(id, { id, source });
      }
    }
  };

  // 1. Auto-include default if exists
  const defaultPlugins = loadProfile(profilesDir, 'default');
  if (defaultPlugins !== null) {
    addPlugins(defaultPlugins, 'default');
  }

  // 2. Load explicit profiles
  for (const profileName of config.profiles) {
    const profilePlugins = loadProfile(profilesDir, profileName);
    if (profilePlugins === null) {
      errors.push(`Profile not found: ${profileName}`);
    } else {
      addPlugins(profilePlugins, profileName);
    }
  }

  // 3. Add project plugins
  addPlugins(config.plugins, 'project');

  return {
    plugins: Array.from(pluginMap.values()),
    errors,
  };
}
```

**Step 4: Run test to verify it passes**

Run: `npm test -- src/profiles.test.ts`
Expected: PASS

**Step 5: Commit**

```bash
git add src/profiles.ts src/profiles.test.ts
git commit -m "feat: add resolveProfiles() for profile merging"
```

---

## Task 5: Update diff.ts to accept ResolvedPlugin[]

**Files:**
- Modify: `src/diff.ts`
- Modify: `src/diff.test.ts`

**Step 1: Write the failing test**

Update `src/diff.test.ts` - add new tests for ResolvedPlugin input:

```typescript
import { diffPlugins, diffPluginsResolved, PluginDiff, PluginDiffResolved } from './diff.js';
import { ResolvedPlugin } from './profiles.js';

describe('diffPluginsResolved', () => {
  const projectPath = '/test/project';

  it('tracks provenance for missing plugins', () => {
    const desired: ResolvedPlugin[] = [
      { id: 'plugin-a@registry', source: 'default' },
      { id: 'plugin-b@registry', source: 'project' },
    ];
    const installed: InstalledPlugin[] = [];

    const result = diffPluginsResolved(desired, installed, projectPath);

    expect(result.missing).toEqual([
      { id: 'plugin-a@registry', source: 'default' },
      { id: 'plugin-b@registry', source: 'project' },
    ]);
  });

  it('tracks provenance for present plugins', () => {
    const desired: ResolvedPlugin[] = [
      { id: 'plugin-a@registry', source: 'backend' },
    ];
    const installed: InstalledPlugin[] = [
      { id: 'plugin-a@registry', version: '1.0', scope: 'local', enabled: true, projectPath },
    ];

    const result = diffPluginsResolved(desired, installed, projectPath);

    expect(result.present).toEqual([
      expect.objectContaining({ id: 'plugin-a@registry', source: 'backend' }),
    ]);
  });
});
```

**Step 2: Run test to verify it fails**

Run: `npm test -- src/diff.test.ts`
Expected: FAIL with "diffPluginsResolved is not exported"

**Step 3: Write minimal implementation**

Add to `src/diff.ts`:

```typescript
import { ResolvedPlugin } from './profiles.js';

export interface PresentPluginResolved {
  id: string;
  version: string;
  scope: 'local' | 'user' | 'global';
  enabled: boolean;
  projectPath?: string;
  source: string;
}

export interface PluginDiffResolved {
  missing: ResolvedPlugin[];
  extra: InstalledPlugin[];
  present: PresentPluginResolved[];
}

export function diffPluginsResolved(
  desired: ResolvedPlugin[],
  installed: InstalledPlugin[],
  projectPath: string
): PluginDiffResolved {
  const localPlugins = installed.filter(
    (p) => p.scope === 'local' && p.projectPath === projectPath
  );

  const installedIds = new Set(localPlugins.map((p) => p.id));
  const desiredMap = new Map(desired.map((p) => [p.id, p]));

  const missing = desired.filter((p) => !installedIds.has(p.id));
  const extra = localPlugins.filter((p) => !desiredMap.has(p.id));
  const present = localPlugins
    .filter((p) => desiredMap.has(p.id))
    .map((p) => ({
      ...p,
      source: desiredMap.get(p.id)!.source,
    }));

  return { missing, extra, present };
}
```

**Step 4: Run test to verify it passes**

Run: `npm test -- src/diff.test.ts`
Expected: PASS

**Step 5: Commit**

```bash
git add src/diff.ts src/diff.test.ts
git commit -m "feat: add diffPluginsResolved() with provenance tracking"
```

---

## Task 6: Update status.ts to show provenance

**Files:**
- Modify: `src/status.ts`
- Modify: `src/status.test.ts`

**Step 1: Write the failing test**

Add to `src/status.test.ts`:

```typescript
import { formatStatusResolved } from './status.js';
import { PluginDiffResolved } from './diff.js';

describe('formatStatusResolved', () => {
  it('shows provenance for non-project plugins', () => {
    const diff: PluginDiffResolved = {
      present: [
        { id: 'plugin-a@registry', version: '1.0', scope: 'local', enabled: true, source: 'default' },
        { id: 'plugin-b@registry', version: '1.0', scope: 'local', enabled: true, source: 'project' },
      ],
      missing: [
        { id: 'plugin-c@registry', source: 'backend' },
      ],
      extra: [],
    };

    const result = formatStatusResolved(diff);

    expect(result).toContain('✓ plugin-a@registry (from: default)');
    expect(result).toContain('✓ plugin-b@registry');
    expect(result).not.toContain('plugin-b@registry (from:'); // no provenance for project
    expect(result).toContain('✗ plugin-c@registry (from: backend) (missing)');
  });
});
```

**Step 2: Run test to verify it fails**

Run: `npm test -- src/status.test.ts`
Expected: FAIL with "formatStatusResolved is not exported"

**Step 3: Write minimal implementation**

Add to `src/status.ts`:

```typescript
import { PluginDiffResolved } from './diff.js';

function formatProvenance(source: string): string {
  return source === 'project' ? '' : ` (from: ${source})`;
}

export function formatStatusResolved(diff: PluginDiffResolved): string {
  const lines: string[] = [];

  for (const plugin of diff.present) {
    lines.push(`✓ ${plugin.id}${formatProvenance(plugin.source)}`);
  }

  for (const plugin of diff.missing) {
    lines.push(`✗ ${plugin.id}${formatProvenance(plugin.source)} (missing)`);
  }

  for (const plugin of diff.extra) {
    lines.push(`? ${plugin.id} (not in config)`);
  }

  const summary = [
    diff.present.length > 0 ? `${diff.present.length} present` : null,
    diff.missing.length > 0 ? `${diff.missing.length} missing` : null,
    diff.extra.length > 0 ? `${diff.extra.length} extra` : null,
  ].filter(Boolean).join(', ');

  lines.push('');
  lines.push(summary || 'No plugins configured');

  return lines.join('\n');
}
```

**Step 4: Run test to verify it passes**

Run: `npm test -- src/status.test.ts`
Expected: PASS

**Step 5: Commit**

```bash
git add src/status.ts src/status.test.ts
git commit -m "feat: add formatStatusResolved() with provenance display"
```

---

## Task 7: Integrate profiles into runStatus()

**Files:**
- Modify: `src/status.ts`

**Step 1: Update runStatus() to use profile resolution**

Update `src/status.ts`:

```typescript
import { getProfilesDir } from './context.js';
import { resolveProfiles } from './profiles.js';
import { diffPluginsResolved } from './diff.js';

export function runStatus(cwd: string): { output: string; exitCode: number } {
  const configPath = findConfigPath(cwd);

  if (!configPath) {
    return {
      output: 'No fettle.toml found. Run `fettle init` to create one.',
      exitCode: 1,
    };
  }

  const projectRoot = resolveProjectRoot(cwd);

  let configContent: string;
  let config: FettleConfig;
  try {
    configContent = readFileSync(configPath, 'utf-8');
    config = parseConfig(configContent);
  } catch (err) {
    return {
      output: `Failed to read config: ${err instanceof Error ? err.message : 'Unknown error'}`,
      exitCode: 1,
    };
  }

  // Resolve profiles
  const profilesDir = getProfilesDir();
  const resolution = resolveProfiles(profilesDir, config);

  if (resolution.errors.length > 0) {
    return {
      output: `Profile errors:\n${resolution.errors.map((e) => `  ✗ ${e}`).join('\n')}`,
      exitCode: 1,
    };
  }

  const installed = listPlugins();
  const diff = diffPluginsResolved(resolution.plugins, installed, projectRoot);

  return {
    output: `Context: ${projectRoot}\n\n${formatStatusResolved(diff)}`,
    exitCode: diff.missing.length > 0 ? 1 : 0,
  };
}
```

**Step 2: Run all tests**

Run: `npm test`
Expected: PASS

**Step 3: Manual verification**

```bash
# Test without profiles
npm run dev -- status

# Create test profile
mkdir -p ~/.config/fettle/profiles
echo 'plugins = ["test-from-default@registry"]' > ~/.config/fettle/profiles/default.toml

# Run status - should show plugin from default
npm run dev -- status
```

**Step 4: Commit**

```bash
git add src/status.ts
git commit -m "feat: integrate profile resolution into status command"
```

---

## Task 8: Integrate profiles into runApply()

**Files:**
- Modify: `src/apply.ts`

**Step 1: Update runApply() to use profile resolution**

Update the imports and resolution logic in `src/apply.ts`:

```typescript
import { getProfilesDir } from './context.js';
import { resolveProfiles } from './profiles.js';
import { diffPluginsResolved } from './diff.js';

export function runApply(cwd: string, options: { dryRun?: boolean } = {}): { output: string; exitCode: number } {
  const configPath = findConfigPath(cwd);

  if (!configPath) {
    return {
      output: 'No fettle.toml found. Run `fettle init` to create one.',
      exitCode: 1,
    };
  }

  const projectRoot = resolveProjectRoot(cwd);
  let configContent: string;
  let config: FettleConfig;
  try {
    configContent = readFileSync(configPath, 'utf-8');
    config = parseConfig(configContent);
  } catch (err) {
    return {
      output: `Failed to read config: ${err instanceof Error ? err.message : 'Unknown error'}`,
      exitCode: 1,
    };
  }

  // Resolve profiles
  const profilesDir = getProfilesDir();
  const resolution = resolveProfiles(profilesDir, config);

  if (resolution.errors.length > 0) {
    return {
      output: `Profile errors:\n${resolution.errors.map((e) => `  ✗ ${e}`).join('\n')}`,
      exitCode: 1,
    };
  }

  const installed = listPlugins();
  const diff = diffPluginsResolved(resolution.plugins, installed, projectRoot);

  if (options.dryRun) {
    if (diff.missing.length === 0) {
      return {
        output: `Context: ${projectRoot}\n\nNothing to do. ${diff.present.length} plugins already installed.`,
        exitCode: 0,
      };
    }
    const lines = [`Context: ${projectRoot}\n`, 'Would install:'];
    for (const plugin of diff.missing) {
      lines.push(`  + ${plugin.id}`);
    }
    return { output: lines.join('\n'), exitCode: 0 };
  }

  const result: ApplyResult = {
    installed: [],
    failed: [],
    alreadyPresent: diff.present.map((p) => p.id),
  };

  for (const plugin of diff.missing) {
    try {
      installPlugin(plugin.id);
      result.installed.push(plugin.id);
    } catch (err) {
      result.failed.push({ id: plugin.id, error: err instanceof Error ? err.message : 'Unknown error' });
    }
  }

  return {
    output: `Context: ${projectRoot}\n\n${formatApplyResult(result)}`,
    exitCode: result.failed.length > 0 ? 1 : 0,
  };
}
```

**Step 2: Run all tests**

Run: `npm test`
Expected: PASS

**Step 3: Commit**

```bash
git add src/apply.ts
git commit -m "feat: integrate profile resolution into apply command"
```

---

## Task 9: Document followups

**Files:**
- Create: `docs/followups/profile-enhancements.md`

**Step 1: Create followup document**

Create `docs/followups/profile-enhancements.md`:

```markdown
# Profile Enhancements (Followups)

Future improvements to the profiles feature.

## Negation Syntax

Allow excluding plugins from profiles:

```toml
plugins = [
  "!unwanted-plugin@registry",  # Exclude from merged set
]
```

Use case: Default profile includes something you don't want in a specific project.

## Skip Default Profile

Allow projects to opt out of auto-including default:

```toml
include_default = false
plugins = [...]
```

## Profile Nesting

Allow profiles to include other profiles:

```toml
# ~/.config/fettle/profiles/full-stack.toml
profiles = ["backend", "frontend"]
plugins = [...]
```

Requires cycle detection.

## Project-Level Profiles

Allow profiles in `.claude/profiles/`:

```toml
profiles = ["local:testing"]  # Looks in .claude/profiles/testing.toml
```

Or auto-discover from `.claude/profiles/` directory.
```

**Step 2: Commit**

```bash
git add docs/followups/profile-enhancements.md
git commit -m "docs: add profile enhancement followups"
```

---

## Task 10: End-to-end verification

**Step 1: Clean up test profile if exists**

```bash
rm -f ~/.config/fettle/profiles/default.toml
```

**Step 2: Run tests**

```bash
npm test
```

Expected: All tests pass

**Step 3: Manual E2E test - no profiles**

```bash
npm run dev -- status
```

Expected: Works as before, shows plugins from `.claude/fettle.toml`

**Step 4: Manual E2E test - default profile**

```bash
mkdir -p ~/.config/fettle/profiles
echo 'plugins = ["test-default@test-registry"]' > ~/.config/fettle/profiles/default.toml
npm run dev -- status
```

Expected: Shows `✗ test-default@test-registry (from: default) (missing)`

**Step 5: Manual E2E test - explicit profile**

Add to `.claude/fettle.toml`:
```toml
profiles = ["nonexistent"]
```

```bash
npm run dev -- status
```

Expected: Error "Profile not found: nonexistent"

**Step 6: Clean up**

```bash
rm -f ~/.config/fettle/profiles/default.toml
# Remove profiles line from .claude/fettle.toml
```

**Step 7: Final commit (if any cleanup needed)**

```bash
git status
# Commit any remaining changes
```

---

## Summary

| Task | Description |
|------|-------------|
| 1 | Add `getProfilesDir()` to context.ts |
| 2 | Extend `FettleConfig` to parse profiles field |
| 3 | Create profiles.ts with `loadProfile()` |
| 4 | Add `resolveProfiles()` for full resolution |
| 5 | Update diff.ts with `diffPluginsResolved()` |
| 6 | Update status.ts with `formatStatusResolved()` |
| 7 | Integrate profiles into `runStatus()` |
| 8 | Integrate profiles into `runApply()` |
| 9 | Document followups |
| 10 | End-to-end verification |
