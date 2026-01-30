# Fettle MVP Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Build a CLI tool that syncs Claude Code plugins to a declared state in `.claude/fettle.toml`.

**Architecture:** Node.js CLI using Commander for arg parsing, smol-toml for config, shelling out to `claude` CLI for plugin operations. TDD with Vitest.

**Tech Stack:** TypeScript, Node.js, Commander, smol-toml, Vitest

---

## Task 1: Project Setup

**Files:**
- Create: `package.json`
- Create: `tsconfig.json`
- Create: `.gitignore`

**Step 1: Initialize package.json**

```bash
cd /Users/josh.nichols/workspace/fettle
npm init -y
```

**Step 2: Install dependencies**

```bash
npm install commander smol-toml
npm install -D typescript vitest @types/node tsx
```

**Step 3: Create tsconfig.json**

Create `tsconfig.json`:
```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "NodeNext",
    "moduleResolution": "NodeNext",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "outDir": "dist",
    "rootDir": "src",
    "declaration": true
  },
  "include": ["src/**/*"],
  "exclude": ["node_modules", "dist"]
}
```

**Step 4: Update package.json scripts and config**

Edit `package.json` to add:
```json
{
  "type": "module",
  "bin": {
    "fettle": "./dist/cli.js"
  },
  "scripts": {
    "build": "tsc",
    "test": "vitest run",
    "test:watch": "vitest",
    "dev": "tsx src/cli.ts"
  }
}
```

**Step 5: Create .gitignore**

Create `.gitignore`:
```
node_modules/
dist/
*.log
```

**Step 6: Commit**

```bash
git add package.json package-lock.json tsconfig.json .gitignore
git commit -m "chore: initialize Node.js/TypeScript project"
```

---

## Task 2: Context Resolution

**Files:**
- Create: `src/context.ts`
- Create: `src/context.test.ts`

**Step 1: Write the failing test**

Create `src/context.test.ts`:
```typescript
import { describe, it, expect } from 'vitest';
import { findConfigPath, resolveProjectRoot } from './context.js';

describe('resolveProjectRoot', () => {
  it('returns cwd when no git root exists', () => {
    const result = resolveProjectRoot('/tmp/not-a-repo');
    expect(result).toBe('/tmp/not-a-repo');
  });
});

describe('findConfigPath', () => {
  it('returns null when no config exists', () => {
    const result = findConfigPath('/tmp/not-a-repo');
    expect(result).toBeNull();
  });
});
```

**Step 2: Run test to verify it fails**

```bash
npm test
```

Expected: FAIL - module not found

**Step 3: Write minimal implementation**

Create `src/context.ts`:
```typescript
import { existsSync } from 'node:fs';
import { execSync } from 'node:child_process';
import { join } from 'node:path';

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

**Step 4: Run test to verify it passes**

```bash
npm test
```

Expected: PASS

**Step 5: Commit**

```bash
git add src/context.ts src/context.test.ts
git commit -m "feat: add context resolution for finding fettle.toml"
```

---

## Task 3: Config Parsing

**Files:**
- Create: `src/config.ts`
- Create: `src/config.test.ts`

**Step 1: Write the failing test**

Create `src/config.test.ts`:
```typescript
import { describe, it, expect } from 'vitest';
import { parseConfig, FettleConfig } from './config.js';

describe('parseConfig', () => {
  it('parses valid TOML with plugins array', () => {
    const toml = `
plugins = [
  "superpowers@superpowers-marketplace",
  "ci-cd-tools@pickled-claude-plugins",
]
`;
    const result = parseConfig(toml);
    expect(result.plugins).toEqual([
      'superpowers@superpowers-marketplace',
      'ci-cd-tools@pickled-claude-plugins',
    ]);
  });

  it('returns empty array for missing plugins', () => {
    const toml = `# empty config`;
    const result = parseConfig(toml);
    expect(result.plugins).toEqual([]);
  });

  it('throws on invalid TOML', () => {
    const toml = `plugins = [invalid`;
    expect(() => parseConfig(toml)).toThrow();
  });
});
```

**Step 2: Run test to verify it fails**

```bash
npm test
```

Expected: FAIL - module not found

**Step 3: Write minimal implementation**

Create `src/config.ts`:
```typescript
import { parse } from 'smol-toml';

export interface FettleConfig {
  plugins: string[];
}

export function parseConfig(tomlContent: string): FettleConfig {
  const parsed = parse(tomlContent);

  const plugins = Array.isArray(parsed.plugins)
    ? parsed.plugins.filter((p): p is string => typeof p === 'string')
    : [];

  return { plugins };
}
```

**Step 4: Run test to verify it passes**

```bash
npm test
```

Expected: PASS

**Step 5: Commit**

```bash
git add src/config.ts src/config.test.ts
git commit -m "feat: add TOML config parsing"
```

---

## Task 4: Claude CLI Integration

**Files:**
- Create: `src/claude.ts`
- Create: `src/claude.test.ts`

**Step 1: Write the failing test**

Create `src/claude.test.ts`:
```typescript
import { describe, it, expect, vi } from 'vitest';
import { parsePluginList, InstalledPlugin } from './claude.js';

describe('parsePluginList', () => {
  it('parses JSON plugin list output', () => {
    const json = JSON.stringify([
      {
        id: 'superpowers@superpowers-marketplace',
        version: '4.0.3',
        scope: 'local',
        enabled: true,
        projectPath: '/Users/josh/project',
      },
    ]);

    const result = parsePluginList(json);
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe('superpowers@superpowers-marketplace');
    expect(result[0].scope).toBe('local');
  });

  it('returns empty array for empty JSON array', () => {
    const result = parsePluginList('[]');
    expect(result).toEqual([]);
  });
});
```

**Step 2: Run test to verify it fails**

```bash
npm test
```

Expected: FAIL - module not found

**Step 3: Write minimal implementation**

Create `src/claude.ts`:
```typescript
import { execSync } from 'node:child_process';

export interface InstalledPlugin {
  id: string;
  version: string;
  scope: 'local' | 'user' | 'global';
  enabled: boolean;
  projectPath?: string;
}

export function parsePluginList(jsonOutput: string): InstalledPlugin[] {
  const parsed = JSON.parse(jsonOutput);
  if (!Array.isArray(parsed)) {
    return [];
  }
  return parsed as InstalledPlugin[];
}

export function listPlugins(): InstalledPlugin[] {
  const output = execSync('claude plugin list --json', {
    encoding: 'utf-8',
    stdio: ['pipe', 'pipe', 'pipe'],
  });
  return parsePluginList(output);
}

export function installPlugin(pluginId: string): void {
  execSync(`claude plugin install ${pluginId} --scope local`, {
    encoding: 'utf-8',
    stdio: 'inherit',
  });
}
```

**Step 4: Run test to verify it passes**

```bash
npm test
```

Expected: PASS

**Step 5: Commit**

```bash
git add src/claude.ts src/claude.test.ts
git commit -m "feat: add Claude CLI integration for plugin list/install"
```

---

## Task 5: Diff Logic

**Files:**
- Create: `src/diff.ts`
- Create: `src/diff.test.ts`

**Step 1: Write the failing test**

Create `src/diff.test.ts`:
```typescript
import { describe, it, expect } from 'vitest';
import { diffPlugins, PluginDiff } from './diff.js';
import { InstalledPlugin } from './claude.js';

describe('diffPlugins', () => {
  const projectPath = '/Users/josh/project';

  it('identifies missing plugins', () => {
    const desired = ['plugin-a@registry', 'plugin-b@registry'];
    const installed: InstalledPlugin[] = [
      { id: 'plugin-a@registry', version: '1.0', scope: 'local', enabled: true, projectPath },
    ];

    const diff = diffPlugins(desired, installed, projectPath);
    expect(diff.missing).toEqual(['plugin-b@registry']);
    expect(diff.present).toHaveLength(1);
  });

  it('identifies extra plugins', () => {
    const desired = ['plugin-a@registry'];
    const installed: InstalledPlugin[] = [
      { id: 'plugin-a@registry', version: '1.0', scope: 'local', enabled: true, projectPath },
      { id: 'plugin-b@registry', version: '1.0', scope: 'local', enabled: true, projectPath },
    ];

    const diff = diffPlugins(desired, installed, projectPath);
    expect(diff.extra).toHaveLength(1);
    expect(diff.extra[0].id).toBe('plugin-b@registry');
  });

  it('ignores plugins from other projects', () => {
    const desired = ['plugin-a@registry'];
    const installed: InstalledPlugin[] = [
      { id: 'plugin-a@registry', version: '1.0', scope: 'local', enabled: true, projectPath: '/other/project' },
    ];

    const diff = diffPlugins(desired, installed, projectPath);
    expect(diff.missing).toEqual(['plugin-a@registry']);
  });

  it('ignores non-local scope plugins', () => {
    const desired = ['plugin-a@registry'];
    const installed: InstalledPlugin[] = [
      { id: 'plugin-a@registry', version: '1.0', scope: 'user', enabled: true },
    ];

    const diff = diffPlugins(desired, installed, projectPath);
    expect(diff.missing).toEqual(['plugin-a@registry']);
  });
});
```

**Step 2: Run test to verify it fails**

```bash
npm test
```

Expected: FAIL - module not found

**Step 3: Write minimal implementation**

Create `src/diff.ts`:
```typescript
import { InstalledPlugin } from './claude.js';

export interface PluginDiff {
  missing: string[];
  extra: InstalledPlugin[];
  present: InstalledPlugin[];
}

export function diffPlugins(
  desired: string[],
  installed: InstalledPlugin[],
  projectPath: string
): PluginDiff {
  // Filter to only local plugins for this project
  const localPlugins = installed.filter(
    (p) => p.scope === 'local' && p.projectPath === projectPath
  );

  const installedIds = new Set(localPlugins.map((p) => p.id));
  const desiredIds = new Set(desired);

  const missing = desired.filter((id) => !installedIds.has(id));
  const extra = localPlugins.filter((p) => !desiredIds.has(p.id));
  const present = localPlugins.filter((p) => desiredIds.has(p.id));

  return { missing, extra, present };
}
```

**Step 4: Run test to verify it passes**

```bash
npm test
```

Expected: PASS

**Step 5: Commit**

```bash
git add src/diff.ts src/diff.test.ts
git commit -m "feat: add diff logic to compare desired vs installed plugins"
```

---

## Task 6: Status Command

**Files:**
- Create: `src/status.ts`
- Create: `src/status.test.ts`

**Step 1: Write the failing test**

Create `src/status.test.ts`:
```typescript
import { describe, it, expect, vi } from 'vitest';
import { formatStatus } from './status.js';
import { PluginDiff } from './diff.js';

describe('formatStatus', () => {
  it('formats all present as success', () => {
    const diff: PluginDiff = {
      missing: [],
      extra: [],
      present: [{ id: 'plugin-a@registry', version: '1.0', scope: 'local', enabled: true }],
    };

    const output = formatStatus(diff);
    expect(output).toContain('✓');
    expect(output).toContain('plugin-a@registry');
  });

  it('formats missing plugins', () => {
    const diff: PluginDiff = {
      missing: ['plugin-b@registry'],
      extra: [],
      present: [],
    };

    const output = formatStatus(diff);
    expect(output).toContain('✗');
    expect(output).toContain('missing');
  });
});
```

**Step 2: Run test to verify it fails**

```bash
npm test
```

Expected: FAIL - module not found

**Step 3: Write minimal implementation**

Create `src/status.ts`:
```typescript
import { readFileSync } from 'node:fs';
import { findConfigPath, resolveProjectRoot } from './context.js';
import { parseConfig } from './config.js';
import { listPlugins } from './claude.js';
import { diffPlugins, PluginDiff } from './diff.js';

export function formatStatus(diff: PluginDiff): string {
  const lines: string[] = [];

  for (const plugin of diff.present) {
    lines.push(`✓ ${plugin.id}`);
  }

  for (const id of diff.missing) {
    lines.push(`✗ ${id} (missing)`);
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

export function runStatus(cwd: string): { output: string; exitCode: number } {
  const configPath = findConfigPath(cwd);

  if (!configPath) {
    return {
      output: 'No fettle.toml found. Run `fettle init` to create one.',
      exitCode: 1,
    };
  }

  const projectRoot = resolveProjectRoot(cwd);
  const configContent = readFileSync(configPath, 'utf-8');
  const config = parseConfig(configContent);
  const installed = listPlugins();
  const diff = diffPlugins(config.plugins, installed, projectRoot);

  return {
    output: `Context: ${projectRoot}\n\n${formatStatus(diff)}`,
    exitCode: diff.missing.length > 0 ? 1 : 0,
  };
}
```

**Step 4: Run test to verify it passes**

```bash
npm test
```

Expected: PASS

**Step 5: Commit**

```bash
git add src/status.ts src/status.test.ts
git commit -m "feat: add status command to show plugin diff"
```

---

## Task 7: Apply Command

**Files:**
- Create: `src/apply.ts`
- Create: `src/apply.test.ts`

**Step 1: Write the failing test**

Create `src/apply.test.ts`:
```typescript
import { describe, it, expect } from 'vitest';
import { formatApplyResult, ApplyResult } from './apply.js';

describe('formatApplyResult', () => {
  it('formats successful installs', () => {
    const result: ApplyResult = {
      installed: ['plugin-a@registry'],
      failed: [],
      alreadyPresent: [],
    };

    const output = formatApplyResult(result);
    expect(output).toContain('+ plugin-a@registry');
    expect(output).toContain('1 plugin installed');
  });

  it('formats nothing to do', () => {
    const result: ApplyResult = {
      installed: [],
      failed: [],
      alreadyPresent: ['plugin-a@registry'],
    };

    const output = formatApplyResult(result);
    expect(output).toContain('Nothing to do');
  });

  it('formats failures', () => {
    const result: ApplyResult = {
      installed: [],
      failed: [{ id: 'bad@registry', error: 'not found' }],
      alreadyPresent: [],
    };

    const output = formatApplyResult(result);
    expect(output).toContain('✗ bad@registry');
    expect(output).toContain('1 failed');
  });
});
```

**Step 2: Run test to verify it fails**

```bash
npm test
```

Expected: FAIL - module not found

**Step 3: Write minimal implementation**

Create `src/apply.ts`:
```typescript
import { readFileSync } from 'node:fs';
import { findConfigPath, resolveProjectRoot } from './context.js';
import { parseConfig } from './config.js';
import { listPlugins, installPlugin } from './claude.js';
import { diffPlugins } from './diff.js';

export interface ApplyResult {
  installed: string[];
  failed: { id: string; error: string }[];
  alreadyPresent: string[];
}

export function formatApplyResult(result: ApplyResult): string {
  const lines: string[] = [];

  if (result.installed.length === 0 && result.failed.length === 0) {
    lines.push(`Nothing to do. ${result.alreadyPresent.length} plugins already installed.`);
    return lines.join('\n');
  }

  if (result.installed.length > 0) {
    lines.push('Installed:');
    for (const id of result.installed) {
      lines.push(`  + ${id}`);
    }
  }

  if (result.failed.length > 0) {
    lines.push('Failed:');
    for (const { id, error } of result.failed) {
      lines.push(`  ✗ ${id} - ${error}`);
    }
  }

  const summary = [
    result.installed.length > 0 ? `${result.installed.length} plugin${result.installed.length > 1 ? 's' : ''} installed` : null,
    result.failed.length > 0 ? `${result.failed.length} failed` : null,
  ].filter(Boolean).join(', ');

  lines.push('');
  lines.push(summary);

  return lines.join('\n');
}

export function runApply(cwd: string, options: { dryRun?: boolean } = {}): { output: string; exitCode: number } {
  const configPath = findConfigPath(cwd);

  if (!configPath) {
    return {
      output: 'No fettle.toml found. Run `fettle init` to create one.',
      exitCode: 1,
    };
  }

  const projectRoot = resolveProjectRoot(cwd);
  const configContent = readFileSync(configPath, 'utf-8');
  const config = parseConfig(configContent);
  const installed = listPlugins();
  const diff = diffPlugins(config.plugins, installed, projectRoot);

  if (options.dryRun) {
    if (diff.missing.length === 0) {
      return {
        output: `Context: ${projectRoot}\n\nNothing to do. ${diff.present.length} plugins already installed.`,
        exitCode: 0,
      };
    }
    const lines = [`Context: ${projectRoot}\n`, 'Would install:'];
    for (const id of diff.missing) {
      lines.push(`  + ${id}`);
    }
    return { output: lines.join('\n'), exitCode: 0 };
  }

  const result: ApplyResult = {
    installed: [],
    failed: [],
    alreadyPresent: diff.present.map((p) => p.id),
  };

  for (const id of diff.missing) {
    try {
      installPlugin(id);
      result.installed.push(id);
    } catch (err) {
      result.failed.push({ id, error: err instanceof Error ? err.message : 'Unknown error' });
    }
  }

  return {
    output: `Context: ${projectRoot}\n\n${formatApplyResult(result)}`,
    exitCode: result.failed.length > 0 ? 1 : 0,
  };
}
```

**Step 4: Run test to verify it passes**

```bash
npm test
```

Expected: PASS

**Step 5: Commit**

```bash
git add src/apply.ts src/apply.test.ts
git commit -m "feat: add apply command to install missing plugins"
```

---

## Task 8: CLI Entry Point

**Files:**
- Create: `src/cli.ts`

**Step 1: Create CLI entry point**

Create `src/cli.ts`:
```typescript
#!/usr/bin/env node
import { program } from 'commander';
import { runStatus } from './status.js';
import { runApply } from './apply.js';

program
  .name('fettle')
  .description('Context-aware plugin manager for Claude Code')
  .version('0.1.0');

program
  .command('status')
  .description('Show desired vs actual plugin state')
  .action(() => {
    const { output, exitCode } = runStatus(process.cwd());
    console.log(output);
    process.exit(exitCode);
  });

program
  .command('apply')
  .description('Install missing plugins to sync desired state')
  .option('--dry-run', 'Show what would change without applying')
  .action((options) => {
    const { output, exitCode } = runApply(process.cwd(), { dryRun: options.dryRun });
    console.log(output);
    process.exit(exitCode);
  });

program.parse();
```

**Step 2: Build and test manually**

```bash
npm run build
```

**Step 3: Test CLI help**

```bash
node dist/cli.js --help
```

Expected: Shows fettle help with status and apply commands

**Step 4: Commit**

```bash
git add src/cli.ts
git commit -m "feat: add CLI entry point with status and apply commands"
```

---

## Task 9: End-to-End Test

**Files:**
- Create: `.claude/fettle.toml` (test config)

**Step 1: Create test config**

Create `.claude/fettle.toml`:
```toml
plugins = [
  "superpowers@superpowers-marketplace",
]
```

**Step 2: Test status command**

```bash
npm run dev -- status
```

Expected: Shows status with superpowers plugin (present or missing depending on current state)

**Step 3: Test apply dry-run**

```bash
npm run dev -- apply --dry-run
```

Expected: Shows what would be installed (or nothing to do)

**Step 4: Commit config**

```bash
git add .claude/fettle.toml
git commit -m "chore: add example fettle.toml config"
```

---

## Task 10: Package for npx

**Files:**
- Modify: `package.json`

**Step 1: Update package.json for publishing**

Edit `package.json` to ensure these fields:
```json
{
  "name": "fettle",
  "version": "0.1.0",
  "description": "Context-aware plugin manager for Claude Code",
  "type": "module",
  "bin": {
    "fettle": "./dist/cli.js"
  },
  "files": [
    "dist"
  ],
  "keywords": ["claude", "claude-code", "plugins", "cli"],
  "license": "MIT"
}
```

**Step 2: Build final package**

```bash
npm run build
```

**Step 3: Test local npx execution**

```bash
npx . status
```

Expected: Runs fettle status command

**Step 4: Commit**

```bash
git add package.json
git commit -m "chore: prepare package.json for npm publishing"
```

---

## Summary

After completing all tasks:
- `fettle status` - shows desired vs actual plugin state
- `fettle apply` - installs missing plugins
- `fettle apply --dry-run` - preview changes
- Config at `.claude/fettle.toml`
- Ready for `npx fettle` once published
