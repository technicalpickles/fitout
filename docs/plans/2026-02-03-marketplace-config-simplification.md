# Marketplace Config Simplification Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Simplify marketplace config from named key-value pairs to a simple list of source URLs, using `claude plugin marketplace list --json` to check installation status.

**Architecture:** Change config from `[marketplaces]` table with `name = "url"` entries to `marketplaces = ["url1", "url2"]` array. Use Claude CLI's JSON output to determine installed marketplaces by matching source URLs/repos instead of directory names.

**Tech Stack:** TypeScript, smol-toml, Vitest

---

## Background

The current config uses named marketplaces:
```toml
[marketplaces]
pickled-claude-plugins = "https://github.com/technicalpickles/pickled-claude-plugins"
```

But the name is never used - Claude CLI determines the directory name from `marketplace.json`'s `name` field, not from anything fitout provides. This creates confusion when the config key doesn't match the actual installed directory.

The fix: just store a list of source URLs and use `claude plugin marketplace list --json` to check what's already installed by matching sources.

---

### Task 1: Add InstalledMarketplace interface and listInstalledMarketplaces function

**Files:**
- Modify: `src/marketplace.ts`
- Test: `src/marketplace.test.ts`

**Step 1: Write the failing test for listInstalledMarketplaces**

Add to `src/marketplace.test.ts`:

```typescript
import { execFileSync } from 'node:child_process';

vi.mock('node:child_process');

const mockExecFileSync = vi.mocked(execFileSync);

describe('listInstalledMarketplaces', () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it('returns parsed JSON from claude plugin marketplace list', () => {
    const { listInstalledMarketplaces } = await import('./marketplace.js');

    mockExecFileSync.mockReturnValue(JSON.stringify([
      {
        name: 'my-marketplace',
        source: 'github',
        repo: 'owner/my-marketplace',
        installLocation: '/home/user/.claude/plugins/marketplaces/my-marketplace',
      },
    ]));

    const result = listInstalledMarketplaces();

    expect(mockExecFileSync).toHaveBeenCalledWith(
      'claude',
      ['plugin', 'marketplace', 'list', '--json'],
      expect.objectContaining({ encoding: 'utf-8' })
    );
    expect(result).toEqual([
      {
        name: 'my-marketplace',
        source: 'github',
        repo: 'owner/my-marketplace',
        installLocation: '/home/user/.claude/plugins/marketplaces/my-marketplace',
      },
    ]);
  });

  it('handles git URL sources', () => {
    const { listInstalledMarketplaces } = await import('./marketplace.js');

    mockExecFileSync.mockReturnValue(JSON.stringify([
      {
        name: 'git-marketplace',
        source: 'git',
        url: 'https://github.com/owner/repo.git',
        installLocation: '/home/user/.claude/plugins/marketplaces/git-marketplace',
      },
    ]));

    const result = listInstalledMarketplaces();

    expect(result[0].source).toBe('git');
    expect(result[0].url).toBe('https://github.com/owner/repo.git');
  });

  it('returns empty array on error', () => {
    const { listInstalledMarketplaces } = await import('./marketplace.js');

    mockExecFileSync.mockImplementation(() => {
      throw new Error('claude not found');
    });

    const result = listInstalledMarketplaces();

    expect(result).toEqual([]);
  });
});
```

**Step 2: Run test to verify it fails**

Run: `npm test -- src/marketplace.test.ts -t "listInstalledMarketplaces"`
Expected: FAIL - `listInstalledMarketplaces` is not exported

**Step 3: Write the implementation**

Add to `src/marketplace.ts`:

```typescript
export interface InstalledMarketplace {
  name: string;
  source: 'github' | 'git' | string;
  repo?: string;  // For github source
  url?: string;   // For git source
  installLocation: string;
}

export function listInstalledMarketplaces(): InstalledMarketplace[] {
  try {
    const output = execFileSync('claude', ['plugin', 'marketplace', 'list', '--json'], {
      encoding: 'utf-8',
    });
    return JSON.parse(output);
  } catch {
    return [];
  }
}
```

**Step 4: Run test to verify it passes**

Run: `npm test -- src/marketplace.test.ts -t "listInstalledMarketplaces"`
Expected: PASS

**Step 5: Commit**

```bash
git add src/marketplace.ts src/marketplace.test.ts
git commit -m "feat(marketplace): add listInstalledMarketplaces using claude CLI JSON output"
```

---

### Task 2: Add isMarketplaceSourceInstalled function

**Files:**
- Modify: `src/marketplace.ts`
- Test: `src/marketplace.test.ts`

**Step 1: Write the failing test**

Add to `src/marketplace.test.ts`:

```typescript
describe('isMarketplaceSourceInstalled', () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it('returns true when github source matches by repo', () => {
    const { isMarketplaceSourceInstalled } = await import('./marketplace.js');

    mockExecFileSync.mockReturnValue(JSON.stringify([
      {
        name: 'my-marketplace',
        source: 'github',
        repo: 'owner/my-marketplace',
        installLocation: '/path',
      },
    ]));

    expect(isMarketplaceSourceInstalled('https://github.com/owner/my-marketplace')).toBe(true);
    expect(isMarketplaceSourceInstalled('https://github.com/owner/my-marketplace.git')).toBe(true);
  });

  it('returns true when git URL source matches exactly', () => {
    const { isMarketplaceSourceInstalled } = await import('./marketplace.js');

    mockExecFileSync.mockReturnValue(JSON.stringify([
      {
        name: 'git-marketplace',
        source: 'git',
        url: 'https://gitlab.com/owner/repo.git',
        installLocation: '/path',
      },
    ]));

    expect(isMarketplaceSourceInstalled('https://gitlab.com/owner/repo.git')).toBe(true);
  });

  it('returns false when source not found', () => {
    const { isMarketplaceSourceInstalled } = await import('./marketplace.js');

    mockExecFileSync.mockReturnValue(JSON.stringify([
      {
        name: 'other-marketplace',
        source: 'github',
        repo: 'owner/other',
        installLocation: '/path',
      },
    ]));

    expect(isMarketplaceSourceInstalled('https://github.com/owner/my-marketplace')).toBe(false);
  });

  it('handles empty installed list', () => {
    const { isMarketplaceSourceInstalled } = await import('./marketplace.js');

    mockExecFileSync.mockReturnValue('[]');

    expect(isMarketplaceSourceInstalled('https://github.com/owner/repo')).toBe(false);
  });
});
```

**Step 2: Run test to verify it fails**

Run: `npm test -- src/marketplace.test.ts -t "isMarketplaceSourceInstalled"`
Expected: FAIL - function not exported

**Step 3: Write the implementation**

Add to `src/marketplace.ts`:

```typescript
/**
 * Normalize a marketplace source URL to extract owner/repo for comparison
 */
function normalizeGitHubSource(source: string): string | null {
  // Match github.com URLs with or without .git suffix
  const match = source.match(/github\.com\/([^/]+\/[^/.]+)/);
  return match ? match[1] : null;
}

/**
 * Check if a marketplace source URL is already installed
 */
export function isMarketplaceSourceInstalled(source: string): boolean {
  const installed = listInstalledMarketplaces();
  const normalizedSource = normalizeGitHubSource(source);

  return installed.some((m) => {
    // Check github source by repo
    if (m.source === 'github' && m.repo && normalizedSource) {
      return m.repo === normalizedSource;
    }
    // Check git source by URL
    if (m.source === 'git' && m.url) {
      return m.url === source;
    }
    return false;
  });
}
```

**Step 4: Run test to verify it passes**

Run: `npm test -- src/marketplace.test.ts -t "isMarketplaceSourceInstalled"`
Expected: PASS

**Step 5: Commit**

```bash
git add src/marketplace.ts src/marketplace.test.ts
git commit -m "feat(marketplace): add isMarketplaceSourceInstalled for source-based lookup"
```

---

### Task 3: Change GlobalConfig to use marketplaces array

**Files:**
- Modify: `src/globalConfig.ts`
- Test: `src/globalConfig.test.ts`

**Step 1: Write the failing test for new config format**

Update `src/globalConfig.test.ts`:

```typescript
describe('getGlobalConfigContent', () => {
  it('generates empty config when no marketplaces specified', () => {
    const content = getGlobalConfigContent();
    expect(content).toContain('marketplaces = []');
  });

  it('generates config with marketplaces array when specified', () => {
    const content = getGlobalConfigContent([
      'https://github.com/owner/marketplace',
    ]);
    expect(content).toContain('marketplaces = [');
    expect(content).toContain('"https://github.com/owner/marketplace"');
  });

  it('handles multiple marketplaces', () => {
    const content = getGlobalConfigContent([
      'https://github.com/a/repo',
      'https://github.com/b/repo',
    ]);
    expect(content).toContain('"https://github.com/a/repo"');
    expect(content).toContain('"https://github.com/b/repo"');
  });
});

describe('getConfiguredMarketplaces', () => {
  it('returns empty array when no marketplaces configured', () => {
    // This will need the actual function to be updated
    const result = getConfiguredMarketplaces();
    expect(Array.isArray(result)).toBe(true);
  });
});
```

**Step 2: Run test to verify it fails**

Run: `npm test -- src/globalConfig.test.ts`
Expected: FAIL - config format doesn't match

**Step 3: Update GlobalConfig interface and functions**

Update `src/globalConfig.ts`:

```typescript
export interface GlobalConfig {
  marketplaces?: string[];  // Changed from Record<string, string>
}

export function getConfiguredMarketplaces(): string[] {
  const config = readGlobalConfig();
  return config.marketplaces || [];
}

export function getGlobalConfigContent(marketplaces?: string[]): string {
  if (!marketplaces || marketplaces.length === 0) {
    return `# Fitout global config
# Marketplace sources to ensure are installed

marketplaces = []
`;
  }

  const quotedSources = marketplaces.map((s) => `  "${s}"`).join(',\n');
  return `# Fitout global config
# Marketplace sources to ensure are installed

marketplaces = [
${quotedSources},
]
`;
}

export function createGlobalConfig(marketplaces?: string[]): boolean {
  const configPath = getGlobalConfigPath();

  if (existsSync(configPath)) {
    return false; // Already exists
  }

  mkdirSync(dirname(configPath), { recursive: true });
  writeFileSync(configPath, getGlobalConfigContent(marketplaces));
  return true;
}
```

**Step 4: Run test to verify it passes**

Run: `npm test -- src/globalConfig.test.ts`
Expected: PASS

**Step 5: Commit**

```bash
git add src/globalConfig.ts src/globalConfig.test.ts
git commit -m "refactor(config): change marketplaces from key-value to array of sources"
```

---

### Task 4: Update ensureMarketplaces to use source-based checking

**Files:**
- Modify: `src/marketplace.ts`
- Test: `src/marketplace.test.ts`

**Step 1: Write the failing test**

Add to `src/marketplace.test.ts`:

```typescript
describe('ensureMarketplaces', () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it('skips already installed marketplaces by source', async () => {
    const { ensureMarketplaces } = await import('./marketplace.js');

    // Mock listInstalledMarketplaces to show one installed
    mockExecFileSync.mockReturnValue(JSON.stringify([
      {
        name: 'my-marketplace',
        source: 'github',
        repo: 'owner/my-marketplace',
        installLocation: '/path',
      },
    ]));

    const result = ensureMarketplaces(['https://github.com/owner/my-marketplace']);

    expect(result.alreadyInstalled).toEqual(['https://github.com/owner/my-marketplace']);
    expect(result.added).toEqual([]);
  });

  it('adds marketplaces not yet installed', async () => {
    const { ensureMarketplaces } = await import('./marketplace.js');

    // First call: list (empty), Second call: add
    mockExecFileSync
      .mockReturnValueOnce('[]')  // listInstalledMarketplaces
      .mockReturnValueOnce('');   // addMarketplace

    const result = ensureMarketplaces(['https://github.com/owner/new-marketplace']);

    expect(result.added).toEqual(['https://github.com/owner/new-marketplace']);
    expect(mockExecFileSync).toHaveBeenCalledWith(
      'claude',
      ['plugin', 'marketplace', 'add', 'https://github.com/owner/new-marketplace'],
      expect.anything()
    );
  });
});
```

**Step 2: Run test to verify it fails**

Run: `npm test -- src/marketplace.test.ts -t "ensureMarketplaces"`
Expected: FAIL - function signature changed

**Step 3: Update ensureMarketplaces**

Update `src/marketplace.ts`:

```typescript
export interface EnsureMarketplacesResult {
  added: string[];
  alreadyInstalled: string[];
  failed: { source: string; error: string }[];
}

/**
 * Ensure all configured marketplace sources are installed
 */
export function ensureMarketplaces(sources: string[]): EnsureMarketplacesResult {
  const result: EnsureMarketplacesResult = {
    added: [],
    alreadyInstalled: [],
    failed: [],
  };

  for (const source of sources) {
    if (isMarketplaceSourceInstalled(source)) {
      result.alreadyInstalled.push(source);
    } else {
      try {
        addMarketplace(source);
        result.added.push(source);
      } catch (err) {
        result.failed.push({
          source,
          error: err instanceof Error ? err.message : 'Unknown error',
        });
      }
    }
  }

  return result;
}
```

**Step 4: Run test to verify it passes**

Run: `npm test -- src/marketplace.test.ts -t "ensureMarketplaces"`
Expected: PASS

**Step 5: Commit**

```bash
git add src/marketplace.ts src/marketplace.test.ts
git commit -m "refactor(marketplace): update ensureMarketplaces to use source-based checking"
```

---

### Task 5: Update install.ts to use new marketplace functions

**Files:**
- Modify: `src/install.ts`

**Step 1: Update the import and usage**

Change in `src/install.ts`:

```typescript
// Old:
import { hasGlobalConfig, getConfiguredMarketplaces } from './globalConfig.js';
// ...
if (!options.hook && hasGlobalConfig()) {
  const marketplaces = getConfiguredMarketplaces();
  if (Object.keys(marketplaces).length > 0) {
    const marketplaceResult = ensureMarketplaces();
    if (marketplaceResult.added.length > 0) {
      console.log(colors.header('Marketplaces:'));
      for (const name of marketplaceResult.added) {
        console.log(`  ${symbols.install} ${name}`);
      }
      console.log('');
    }
  }
}

// New:
import { hasGlobalConfig, getConfiguredMarketplaces } from './globalConfig.js';
// ...
if (!options.hook && hasGlobalConfig()) {
  const marketplaceSources = getConfiguredMarketplaces();
  if (marketplaceSources.length > 0) {
    const marketplaceResult = ensureMarketplaces(marketplaceSources);
    if (marketplaceResult.added.length > 0) {
      console.log(colors.header('Marketplaces:'));
      for (const source of marketplaceResult.added) {
        console.log(`  ${symbols.install} ${source}`);
      }
      console.log('');
    }
  }
}
```

**Step 2: Run tests to verify nothing breaks**

Run: `npm test`
Expected: PASS

**Step 3: Commit**

```bash
git add src/install.ts
git commit -m "refactor(install): update to use new marketplace source array"
```

---

### Task 6: Remove deprecated marketplace functions

**Files:**
- Modify: `src/marketplace.ts`
- Test: `src/marketplace.test.ts`

**Step 1: Remove old functions**

Remove from `src/marketplace.ts`:
- `getInstalledMarketplaces()` (replaced by `listInstalledMarketplaces`)
- `isMarketplaceInstalled(name: string)` (replaced by `isMarketplaceSourceInstalled`)

**Step 2: Remove or update any tests for removed functions**

Check and update `src/marketplace.test.ts` to remove tests for deprecated functions.

**Step 3: Run tests**

Run: `npm test`
Expected: PASS

**Step 4: Commit**

```bash
git add src/marketplace.ts src/marketplace.test.ts
git commit -m "refactor(marketplace): remove deprecated name-based install checking"
```

---

### Task 7: Update CLAUDE.md documentation

**Files:**
- Modify: `CLAUDE.md`

**Step 1: Update config example**

Change the config section to show new format:

```markdown
## Config

Project config lives at `.claude/fitout.toml`:

\`\`\`toml
plugins = [
  "plugin-name@marketplace",
]
\`\`\`

Global config lives at `~/.config/fitout/config.toml`:

\`\`\`toml
marketplaces = [
  "https://github.com/owner/marketplace-repo",
]
\`\`\`
```

**Step 2: Commit**

```bash
git add CLAUDE.md
git commit -m "docs: update CLAUDE.md with new marketplace config format"
```

---

## Summary

Changes:
- `GlobalConfig.marketplaces` changes from `Record<string, string>` to `string[]`
- New `listInstalledMarketplaces()` uses `claude plugin marketplace list --json`
- New `isMarketplaceSourceInstalled(source)` checks by URL/repo, not directory name
- `ensureMarketplaces(sources)` now takes array of source URLs
- Removed name-based checking that caused the mismatch bug

The key insight: Claude CLI determines the marketplace directory name from `marketplace.json`'s `name` field, so fitout should never try to predict or use names - just work with source URLs.
