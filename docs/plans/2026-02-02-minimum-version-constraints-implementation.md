# Minimum Version Constraints Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add minimum version constraints (`>= X.Y.Z`) to plugin specifications so users can declare version requirements and have fettle handle updates automatically.

**Architecture:** New `constraint.ts` module handles parsing and validation. `profiles.ts` gains constraint merging (higher wins). `diff.ts` becomes constraint-aware. `install.ts` adds smart refresh when constraints unsatisfied.

**Tech Stack:** TypeScript, Vitest, smol-toml

---

## Task 1: Create constraint parsing module

**Files:**
- Create: `src/constraint.ts`
- Create: `src/constraint.test.ts`

**Step 1: Write failing tests for parsePluginString**

```typescript
// src/constraint.test.ts
import { describe, it, expect } from 'vitest';
import { parsePluginString, ParsedPlugin, ParseError } from './constraint.js';

describe('parsePluginString', () => {
  it('parses plugin without constraint', () => {
    const result = parsePluginString('git@marketplace');
    expect(result).toEqual({ id: 'git@marketplace', constraint: null });
  });

  it('parses plugin with >= constraint', () => {
    const result = parsePluginString('git@marketplace >= 1.2.0');
    expect(result).toEqual({ id: 'git@marketplace', constraint: '1.2.0' });
  });

  it('parses constraint with two-part version', () => {
    const result = parsePluginString('git@marketplace >= 1.2');
    expect(result).toEqual({ id: 'git@marketplace', constraint: '1.2' });
  });

  it('parses constraint with single-part version', () => {
    const result = parsePluginString('git@marketplace >= 2');
    expect(result).toEqual({ id: 'git@marketplace', constraint: '2' });
  });

  it('returns error for unsupported operator <', () => {
    const result = parsePluginString('git@marketplace < 1.0.0');
    expect(result).toEqual({
      input: 'git@marketplace < 1.0.0',
      message: 'Unsupported operator "<". Only ">=" is supported.',
    });
  });

  it('returns error for unsupported operator =', () => {
    const result = parsePluginString('git@marketplace = 1.0.0');
    expect(result).toEqual({
      input: 'git@marketplace = 1.0.0',
      message: 'Unsupported operator "=". Only ">=" is supported.',
    });
  });

  it('returns error for unsupported operator ^', () => {
    const result = parsePluginString('git@marketplace ^1.0.0');
    expect(result).toEqual({
      input: 'git@marketplace ^1.0.0',
      message: 'Unsupported operator "^". Only ">=" is supported.',
    });
  });

  it('returns error for missing version after >=', () => {
    const result = parsePluginString('git@marketplace >=');
    expect(result).toEqual({
      input: 'git@marketplace >=',
      message: 'Missing version after ">="',
    });
  });

  it('returns error for invalid version', () => {
    const result = parsePluginString('git@marketplace >= abc');
    expect(result).toEqual({
      input: 'git@marketplace >= abc',
      message: 'Invalid version "abc" - expected number segments (e.g., 1.0.0)',
    });
  });

  it('returns error for empty version segment', () => {
    const result = parsePluginString('git@marketplace >= 1..0');
    expect(result).toEqual({
      input: 'git@marketplace >= 1..0',
      message: 'Invalid version "1..0" - expected number segments (e.g., 1.0.0)',
    });
  });
});
```

**Step 2: Run tests to verify they fail**

Run: `npm test -- src/constraint.test.ts`
Expected: FAIL - module not found

**Step 3: Implement parsePluginString**

```typescript
// src/constraint.ts
export interface ParsedPlugin {
  id: string;
  constraint: string | null;
}

export interface ParseError {
  input: string;
  message: string;
}

const SUPPORTED_OPERATORS = ['>='];
const UNSUPPORTED_OPERATORS = ['<', '<=', '>', '=', '^', '~'];

/**
 * Validate version string is parseable as dot-separated numbers.
 * Permissive: accepts 1, 1.0, 1.0.0, etc.
 */
export function isValidVersion(version: string): boolean {
  if (!version || version.trim() === '') return false;
  const parts = version.split('.');
  return parts.every((part) => {
    if (part === '') return false;
    const num = parseInt(part, 10);
    return !isNaN(num) && num >= 0;
  });
}

/**
 * Parse a plugin string that may contain a version constraint.
 * Format: "plugin@registry" or "plugin@registry >= 1.0.0"
 */
export function parsePluginString(input: string): ParsedPlugin | ParseError {
  const trimmed = input.trim();

  // Check for >= operator (the only supported one)
  const geqMatch = trimmed.match(/^(.+?)\s*>=\s*(.*)$/);
  if (geqMatch) {
    const [, id, version] = geqMatch;
    const trimmedVersion = version.trim();

    if (!trimmedVersion) {
      return { input, message: 'Missing version after ">="' };
    }

    if (!isValidVersion(trimmedVersion)) {
      return {
        input,
        message: `Invalid version "${trimmedVersion}" - expected number segments (e.g., 1.0.0)`,
      };
    }

    return { id: id.trim(), constraint: trimmedVersion };
  }

  // Check for unsupported operators
  for (const op of UNSUPPORTED_OPERATORS) {
    // Handle operators that might be attached to version (^1.0.0, ~1.0.0)
    const attachedMatch = trimmed.match(new RegExp(`^(.+?)\\s*\\${op}(\\S+)$`));
    if (attachedMatch) {
      return { input, message: `Unsupported operator "${op}". Only ">=" is supported.` };
    }

    // Handle operators with space
    const spacedMatch = trimmed.match(new RegExp(`^(.+?)\\s+\\${op}\\s+(.*)$`));
    if (spacedMatch) {
      return { input, message: `Unsupported operator "${op}". Only ">=" is supported.` };
    }
  }

  // No constraint - just a plugin ID
  return { id: trimmed, constraint: null };
}
```

**Step 4: Run tests to verify they pass**

Run: `npm test -- src/constraint.test.ts`
Expected: PASS

**Step 5: Commit**

```bash
git add src/constraint.ts src/constraint.test.ts
git commit -m "feat(constraint): add parsePluginString with validation

Parses plugin strings with optional >= version constraints.
Validates version format and rejects unsupported operators."
```

---

## Task 2: Add parsePluginList and type guards

**Files:**
- Modify: `src/constraint.ts`
- Modify: `src/constraint.test.ts`

**Step 1: Write failing tests for parsePluginList**

Add to `src/constraint.test.ts`:

```typescript
import { parsePluginString, parsePluginList, isParsedPlugin, isParseError } from './constraint.js';

describe('parsePluginList', () => {
  it('parses list of valid plugins', () => {
    const result = parsePluginList([
      'git@marketplace >= 1.0.0',
      'other@marketplace',
    ]);

    expect(result.plugins).toEqual([
      { id: 'git@marketplace', constraint: '1.0.0' },
      { id: 'other@marketplace', constraint: null },
    ]);
    expect(result.errors).toEqual([]);
  });

  it('collects all errors', () => {
    const result = parsePluginList([
      'git@marketplace >= abc',
      'other@marketplace < 1.0.0',
      'valid@marketplace',
    ]);

    expect(result.plugins).toEqual([
      { id: 'valid@marketplace', constraint: null },
    ]);
    expect(result.errors).toHaveLength(2);
    expect(result.errors[0].input).toBe('git@marketplace >= abc');
    expect(result.errors[1].input).toBe('other@marketplace < 1.0.0');
  });

  it('returns empty arrays for empty input', () => {
    const result = parsePluginList([]);
    expect(result.plugins).toEqual([]);
    expect(result.errors).toEqual([]);
  });
});

describe('type guards', () => {
  it('isParsedPlugin returns true for valid parse', () => {
    const result = parsePluginString('git@marketplace >= 1.0.0');
    expect(isParsedPlugin(result)).toBe(true);
  });

  it('isParsedPlugin returns false for error', () => {
    const result = parsePluginString('git@marketplace >= abc');
    expect(isParsedPlugin(result)).toBe(false);
  });

  it('isParseError returns true for error', () => {
    const result = parsePluginString('git@marketplace >= abc');
    expect(isParseError(result)).toBe(true);
  });

  it('isParseError returns false for valid parse', () => {
    const result = parsePluginString('git@marketplace >= 1.0.0');
    expect(isParseError(result)).toBe(false);
  });
});
```

**Step 2: Run tests to verify they fail**

Run: `npm test -- src/constraint.test.ts`
Expected: FAIL - parsePluginList not exported

**Step 3: Implement parsePluginList and type guards**

Add to `src/constraint.ts`:

```typescript
export interface ParseResult {
  plugins: ParsedPlugin[];
  errors: ParseError[];
}

export function isParsedPlugin(result: ParsedPlugin | ParseError): result is ParsedPlugin {
  return 'id' in result && !('message' in result);
}

export function isParseError(result: ParsedPlugin | ParseError): result is ParseError {
  return 'message' in result;
}

/**
 * Parse a list of plugin strings, collecting all errors.
 */
export function parsePluginList(inputs: string[]): ParseResult {
  const plugins: ParsedPlugin[] = [];
  const errors: ParseError[] = [];

  for (const input of inputs) {
    const result = parsePluginString(input);
    if (isParsedPlugin(result)) {
      plugins.push(result);
    } else {
      errors.push(result);
    }
  }

  return { plugins, errors };
}
```

**Step 4: Run tests to verify they pass**

Run: `npm test -- src/constraint.test.ts`
Expected: PASS

**Step 5: Commit**

```bash
git add src/constraint.ts src/constraint.test.ts
git commit -m "feat(constraint): add parsePluginList and type guards

Parses multiple plugin strings, collecting all errors for batch reporting."
```

---

## Task 3: Add constraint satisfaction check

**Files:**
- Modify: `src/constraint.ts`
- Modify: `src/constraint.test.ts`

**Step 1: Write failing tests for satisfiesConstraint**

Add to `src/constraint.test.ts`:

```typescript
import { satisfiesConstraint } from './constraint.js';

describe('satisfiesConstraint', () => {
  it('returns true when no constraint', () => {
    expect(satisfiesConstraint('1.0.0', null)).toBe(true);
  });

  it('returns true when version equals constraint', () => {
    expect(satisfiesConstraint('1.0.0', '1.0.0')).toBe(true);
  });

  it('returns true when version exceeds constraint', () => {
    expect(satisfiesConstraint('2.0.0', '1.0.0')).toBe(true);
  });

  it('returns false when version below constraint', () => {
    expect(satisfiesConstraint('1.0.0', '2.0.0')).toBe(false);
  });

  it('handles different version lengths', () => {
    expect(satisfiesConstraint('1.0', '1.0.0')).toBe(true);
    expect(satisfiesConstraint('1.0.0', '1.0')).toBe(true);
    expect(satisfiesConstraint('1', '1.0.0')).toBe(true);
  });

  it('compares multi-digit versions correctly', () => {
    expect(satisfiesConstraint('1.10.0', '1.9.0')).toBe(true);
    expect(satisfiesConstraint('1.9.0', '1.10.0')).toBe(false);
  });
});
```

**Step 2: Run tests to verify they fail**

Run: `npm test -- src/constraint.test.ts`
Expected: FAIL - satisfiesConstraint not exported

**Step 3: Implement satisfiesConstraint**

Add to `src/constraint.ts`:

```typescript
import { compareVersions } from './update.js';

/**
 * Check if installed version satisfies a minimum version constraint.
 * Returns true if constraint is null (no constraint) or version >= constraint.
 */
export function satisfiesConstraint(version: string, constraint: string | null): boolean {
  if (constraint === null) return true;
  return compareVersions(version, constraint) >= 0;
}
```

**Step 4: Run tests to verify they pass**

Run: `npm test -- src/constraint.test.ts`
Expected: PASS

**Step 5: Commit**

```bash
git add src/constraint.ts src/constraint.test.ts
git commit -m "feat(constraint): add satisfiesConstraint check

Uses compareVersions to check if installed version meets minimum constraint."
```

---

## Task 4: Add constraint merging logic

**Files:**
- Modify: `src/constraint.ts`
- Modify: `src/constraint.test.ts`

**Step 1: Write failing tests for mergeConstraints**

Add to `src/constraint.test.ts`:

```typescript
import { mergeConstraints } from './constraint.js';

describe('mergeConstraints', () => {
  it('returns incoming when existing is null', () => {
    expect(mergeConstraints(null, '1.0.0')).toBe('1.0.0');
  });

  it('returns existing when incoming is null', () => {
    expect(mergeConstraints('1.0.0', null)).toBe('1.0.0');
  });

  it('returns null when both are null', () => {
    expect(mergeConstraints(null, null)).toBe(null);
  });

  it('returns higher version when both exist', () => {
    expect(mergeConstraints('1.0.0', '2.0.0')).toBe('2.0.0');
    expect(mergeConstraints('2.0.0', '1.0.0')).toBe('2.0.0');
  });

  it('returns either when equal', () => {
    expect(mergeConstraints('1.0.0', '1.0.0')).toBe('1.0.0');
  });
});
```

**Step 2: Run tests to verify they fail**

Run: `npm test -- src/constraint.test.ts`
Expected: FAIL - mergeConstraints not exported

**Step 3: Implement mergeConstraints**

Add to `src/constraint.ts`:

```typescript
/**
 * Merge two constraints, returning the higher minimum version.
 * Used when same plugin appears in multiple sources (profile + project).
 */
export function mergeConstraints(existing: string | null, incoming: string | null): string | null {
  if (existing === null) return incoming;
  if (incoming === null) return existing;
  return compareVersions(existing, incoming) >= 0 ? existing : incoming;
}
```

**Step 4: Run tests to verify they pass**

Run: `npm test -- src/constraint.test.ts`
Expected: PASS

**Step 5: Commit**

```bash
git add src/constraint.ts src/constraint.test.ts
git commit -m "feat(constraint): add mergeConstraints for higher-wins logic

When same plugin appears in profile and project, higher minimum wins."
```

---

## Task 5: Add formatParseErrors for user-friendly output

**Files:**
- Modify: `src/constraint.ts`
- Modify: `src/constraint.test.ts`

**Step 1: Write failing tests for formatParseErrors**

Add to `src/constraint.test.ts`:

```typescript
import { formatParseErrors } from './constraint.js';

describe('formatParseErrors', () => {
  it('formats single error', () => {
    const errors = [{ input: 'git@marketplace >= abc', message: 'Invalid version "abc"' }];
    const result = formatParseErrors(errors);
    expect(result).toBe(
      'Invalid plugin constraints:\n  "git@marketplace >= abc": Invalid version "abc"'
    );
  });

  it('formats multiple errors', () => {
    const errors = [
      { input: 'git@marketplace >= abc', message: 'Invalid version "abc"' },
      { input: 'other@marketplace < 1.0', message: 'Unsupported operator "<"' },
    ];
    const result = formatParseErrors(errors);
    expect(result).toBe(
      'Invalid plugin constraints:\n' +
        '  "git@marketplace >= abc": Invalid version "abc"\n' +
        '  "other@marketplace < 1.0": Unsupported operator "<"'
    );
  });

  it('returns empty string for no errors', () => {
    expect(formatParseErrors([])).toBe('');
  });
});
```

**Step 2: Run tests to verify they fail**

Run: `npm test -- src/constraint.test.ts`
Expected: FAIL - formatParseErrors not exported

**Step 3: Implement formatParseErrors**

Add to `src/constraint.ts`:

```typescript
/**
 * Format parse errors for user-friendly display.
 */
export function formatParseErrors(errors: ParseError[]): string {
  if (errors.length === 0) return '';

  const lines = ['Invalid plugin constraints:'];
  for (const error of errors) {
    lines.push(`  "${error.input}": ${error.message}`);
  }
  return lines.join('\n');
}
```

**Step 4: Run tests to verify they pass**

Run: `npm test -- src/constraint.test.ts`
Expected: PASS

**Step 5: Commit**

```bash
git add src/constraint.ts src/constraint.test.ts
git commit -m "feat(constraint): add formatParseErrors for user output

Formats collected parse errors as a multi-line message."
```

---

## Task 6: Update ResolvedPlugin to include constraint

**Files:**
- Modify: `src/profiles.ts`
- Modify: `src/profiles.test.ts`

**Step 1: Update ResolvedPlugin interface**

In `src/profiles.ts`, update the interface:

```typescript
export interface ResolvedPlugin {
  id: string;
  source: string;
  constraint: string | null;
}
```

**Step 2: Run existing tests to see what breaks**

Run: `npm test -- src/profiles.test.ts`
Expected: FAIL - tests create ResolvedPlugin without constraint

**Step 3: Update resolveProfiles to use constraint parsing**

Replace `src/profiles.ts`:

```typescript
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { parse } from 'smol-toml';
import { FettleConfig } from './config.js';
import { parsePluginList, mergeConstraints, ParseError } from './constraint.js';

export interface ResolvedPlugin {
  id: string;
  source: string;
  constraint: string | null;
}

export interface ConstraintOverride {
  pluginId: string;
  projectConstraint: string;
  winningConstraint: string;
  winningSource: string;
}

export interface ProfileResolutionResult {
  plugins: ResolvedPlugin[];
  errors: string[];
  constraintOverrides: ConstraintOverride[];
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

export function resolveProfiles(
  profilesDir: string,
  config: FettleConfig
): ProfileResolutionResult {
  const errors: string[] = [];
  const constraintOverrides: ConstraintOverride[] = [];
  const pluginMap = new Map<string, ResolvedPlugin>();

  // Track project constraints for override detection
  const projectConstraints = new Map<string, string>();

  // Helper to add plugins with constraint merging
  const addPlugins = (pluginStrings: string[], source: string) => {
    const parseResult = parsePluginList(pluginStrings);

    // Collect parse errors
    for (const error of parseResult.errors) {
      errors.push(`${error.input}: ${error.message}`);
    }

    for (const parsed of parseResult.plugins) {
      const existing = pluginMap.get(parsed.id);
      if (existing) {
        // Plugin exists - merge constraints (higher wins)
        const merged = mergeConstraints(existing.constraint, parsed.constraint);

        // Track if project constraint was overridden
        if (source === 'project' && parsed.constraint !== null) {
          projectConstraints.set(parsed.id, parsed.constraint);
        }

        // Check if project's constraint is being overridden by profile
        const projectConstraint = projectConstraints.get(parsed.id);
        if (
          projectConstraint &&
          existing.constraint !== null &&
          merged === existing.constraint &&
          merged !== projectConstraint
        ) {
          constraintOverrides.push({
            pluginId: parsed.id,
            projectConstraint,
            winningConstraint: merged,
            winningSource: existing.source,
          });
        }

        existing.constraint = merged;
      } else {
        pluginMap.set(parsed.id, {
          id: parsed.id,
          source,
          constraint: parsed.constraint,
        });

        // Track project constraints
        if (source === 'project' && parsed.constraint !== null) {
          projectConstraints.set(parsed.id, parsed.constraint);
        }
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
    constraintOverrides,
  };
}
```

**Step 4: Update tests for new behavior**

Replace `src/profiles.test.ts`:

```typescript
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { loadProfile, resolveProfiles } from './profiles.js';
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

describe('resolveProfiles', () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it('returns project plugins when no profiles', () => {
    vi.mocked(existsSync).mockReturnValue(false);

    const result = resolveProfiles('/profiles', {
      plugins: ['project-plugin@registry'],
      profiles: [],
    });

    expect(result.plugins).toEqual([
      { id: 'project-plugin@registry', source: 'project', constraint: null },
    ]);
    expect(result.errors).toEqual([]);
  });

  it('parses plugin constraints', () => {
    vi.mocked(existsSync).mockReturnValue(false);

    const result = resolveProfiles('/profiles', {
      plugins: ['plugin@registry >= 1.2.0'],
      profiles: [],
    });

    expect(result.plugins).toEqual([
      { id: 'plugin@registry', source: 'project', constraint: '1.2.0' },
    ]);
  });

  it('auto-includes default profile when exists', () => {
    vi.mocked(existsSync).mockReturnValue(true);
    vi.mocked(readFileSync).mockReturnValue(`plugins = ["default-plugin@registry"]`);

    const result = resolveProfiles('/profiles', {
      plugins: ['project-plugin@registry'],
      profiles: [],
    });

    expect(result.plugins).toEqual([
      { id: 'default-plugin@registry', source: 'default', constraint: null },
      { id: 'project-plugin@registry', source: 'project', constraint: null },
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
    vi.mocked(readFileSync).mockReturnValue(`plugins = []`);

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
      constraint: null,
    });
  });

  it('dedupes plugins, first source wins', () => {
    vi.mocked(existsSync).mockReturnValue(true);
    vi.mocked(readFileSync).mockReturnValue(`plugins = ["shared-plugin@registry"]`);

    const result = resolveProfiles('/profiles', {
      plugins: ['shared-plugin@registry'],
      profiles: [],
    });

    const shared = result.plugins.filter((p) => p.id === 'shared-plugin@registry');
    expect(shared).toHaveLength(1);
    expect(shared[0].source).toBe('default');
  });

  it('merges constraints - higher wins', () => {
    vi.mocked(existsSync).mockReturnValue(true);
    vi.mocked(readFileSync).mockReturnValue(`plugins = ["plugin@registry >= 2.0.0"]`);

    const result = resolveProfiles('/profiles', {
      plugins: ['plugin@registry >= 1.0.0'],
      profiles: [],
    });

    const plugin = result.plugins.find((p) => p.id === 'plugin@registry');
    expect(plugin?.constraint).toBe('2.0.0');
  });

  it('tracks when project constraint is overridden', () => {
    vi.mocked(existsSync).mockReturnValue(true);
    vi.mocked(readFileSync).mockReturnValue(`plugins = ["plugin@registry >= 2.0.0"]`);

    const result = resolveProfiles('/profiles', {
      plugins: ['plugin@registry >= 1.0.0'],
      profiles: [],
    });

    expect(result.constraintOverrides).toEqual([
      {
        pluginId: 'plugin@registry',
        projectConstraint: '1.0.0',
        winningConstraint: '2.0.0',
        winningSource: 'default',
      },
    ]);
  });

  it('collects parse errors', () => {
    vi.mocked(existsSync).mockReturnValue(false);

    const result = resolveProfiles('/profiles', {
      plugins: ['plugin@registry >= abc'],
      profiles: [],
    });

    expect(result.errors).toContainEqual(
      expect.stringContaining('Invalid version "abc"')
    );
  });
});
```

**Step 5: Run tests to verify they pass**

Run: `npm test -- src/profiles.test.ts`
Expected: PASS

**Step 6: Commit**

```bash
git add src/profiles.ts src/profiles.test.ts
git commit -m "feat(profiles): add constraint support with higher-wins merging

ResolvedPlugin now includes constraint field.
Tracks when project constraints are overridden by profiles."
```

---

## Task 7: Update diff to include constraint in PresentPluginResolved

**Files:**
- Modify: `src/diff.ts`
- Modify: `src/diff.test.ts`

**Step 1: Update PresentPluginResolved interface**

In `src/diff.ts`, update:

```typescript
export interface PresentPluginResolved {
  id: string;
  version: string;
  scope: 'local' | 'user' | 'global';
  enabled: boolean;
  projectPath?: string;
  source: string;
  constraint: string | null;
}
```

**Step 2: Update diffPluginsResolved to pass through constraint**

Update the map in `diffPluginsResolved`:

```typescript
const present = localPlugins
  .filter((p) => desiredMap.has(p.id))
  .map((p) => ({
    ...p,
    source: desiredMap.get(p.id)!.source,
    constraint: desiredMap.get(p.id)!.constraint,
  }));
```

**Step 3: Update diff tests**

Add constraint field to test assertions in `src/diff.test.ts`. Update the test that uses `diffPluginsResolved`:

```typescript
it('tracks resolved plugins with constraint', () => {
  const desired: ResolvedPlugin[] = [
    { id: 'plugin-a@registry', source: 'default', constraint: '1.0.0' },
  ];
  const installed: InstalledPlugin[] = [
    { id: 'plugin-a@registry', version: '1.0', scope: 'local', enabled: true, projectPath },
  ];

  const result = diffPluginsResolved(desired, installed, projectPath);

  expect(result.present[0].constraint).toBe('1.0.0');
});
```

**Step 4: Run tests**

Run: `npm test -- src/diff.test.ts`
Expected: PASS

**Step 5: Commit**

```bash
git add src/diff.ts src/diff.test.ts
git commit -m "feat(diff): include constraint in PresentPluginResolved

Passes through constraint from ResolvedPlugin to diff result."
```

---

## Task 8: Update status display to show versions and constraints

**Files:**
- Modify: `src/status.ts`
- Modify: `src/status.test.ts`

**Step 1: Update formatStatusResolved**

Update `src/status.ts` to show version and constraint info:

```typescript
export function formatStatusResolved(
  diff: StatusDiff,
  showRefreshTip: boolean,
  constraintOverrides: ConstraintOverride[] = []
): string {
  const lines: string[] = [];
  const outdatedIds = new Set(diff.outdated.map((p) => p.id));

  for (const plugin of diff.present) {
    const outdated = diff.outdated.find((o) => o.id === plugin.id);
    const constraintStr = plugin.constraint ? ` >= ${plugin.constraint}` : '';

    if (outdated) {
      lines.push(
        `${symbols.outdated} ${plugin.id} ${colors.warning(`v${outdated.installedVersion} → v${outdated.availableVersion}`)}${constraintStr}${formatProvenance(plugin.source)} ${colors.warning('(outdated)')}`
      );
    } else {
      // Show version for all plugins
      const versionStr = plugin.version ? ` ${plugin.version}` : '';
      lines.push(`${symbols.present} ${plugin.id}${versionStr}${constraintStr}${formatProvenance(plugin.source)}`);
    }
  }

  // ... rest of function

  // Add constraint override warnings
  if (constraintOverrides.length > 0) {
    lines.push('');
    lines.push(colors.header('Warnings:'));
    for (const override of constraintOverrides) {
      lines.push(
        `  ${plugin.id}: constraint >= ${override.projectConstraint} (project) overridden by >= ${override.winningConstraint} (${override.winningSource})`
      );
      lines.push(
        `    To fix: update .claude/fettle.toml to ">= ${override.winningConstraint}" or remove the constraint`
      );
    }
  }

  return lines.join('\n');
}
```

**Step 2: Update runStatus to pass constraintOverrides**

Update `runStatus` in `src/status.ts`:

```typescript
const resolution = resolveProfiles(profilesDir, config);
// ... existing code ...
const showRefreshTip = !options.refresh;
const formatted = formatStatusResolved(statusDiff, showRefreshTip, resolution.constraintOverrides);
```

**Step 3: Add tests for new output format**

Add tests in `src/status.test.ts`:

```typescript
it('shows version for present plugins', () => {
  const diff: StatusDiff = {
    present: [
      { id: 'plugin@registry', version: '1.0.0', scope: 'local', enabled: true, source: 'project', constraint: null },
    ],
    missing: [],
    extra: [],
    outdated: [],
  };

  const output = formatStatusResolved(diff, false);
  expect(output).toContain('plugin@registry 1.0.0');
});

it('shows constraint when present', () => {
  const diff: StatusDiff = {
    present: [
      { id: 'plugin@registry', version: '1.0.0', scope: 'local', enabled: true, source: 'project', constraint: '1.0.0' },
    ],
    missing: [],
    extra: [],
    outdated: [],
  };

  const output = formatStatusResolved(diff, false);
  expect(output).toContain('>= 1.0.0');
});
```

**Step 4: Run tests**

Run: `npm test -- src/status.test.ts`
Expected: PASS

**Step 5: Commit**

```bash
git add src/status.ts src/status.test.ts
git commit -m "feat(status): show versions and constraint override warnings

Status now displays installed versions and constraint requirements.
Warns when project constraints are overridden by profile constraints."
```

---

## Task 9: Update install to check constraints and smart refresh

**Files:**
- Modify: `src/install.ts`
- Modify: `src/install.test.ts`

**Step 1: Add constraint checking to install flow**

This is a larger change. Update `src/install.ts` to:
1. Check if installed versions satisfy constraints
2. Mark unsatisfied as needing update
3. Refresh marketplace if any unsatisfied
4. Re-check and update or fail

```typescript
import { satisfiesConstraint } from './constraint.js';
import { refreshMarketplaces, listAvailablePlugins, AvailablePlugin } from './marketplace.js';
import { updatePlugin } from './update.js';

interface ConstraintCheck {
  plugin: ResolvedPlugin;
  installedVersion: string;
  satisfied: boolean;
}

interface UnsatisfiableConstraint {
  pluginId: string;
  installedVersion: string;
  requiredConstraint: string;
  marketplaceVersion: string;
}

// In runInstall, after getting diff:
function checkConstraints(
  present: PresentPluginResolved[],
  available: AvailablePlugin[]
): { satisfied: ConstraintCheck[]; unsatisfied: ConstraintCheck[] } {
  const availableMap = new Map(available.map((p) => [p.id, p]));
  const satisfied: ConstraintCheck[] = [];
  const unsatisfied: ConstraintCheck[] = [];

  for (const plugin of present) {
    if (plugin.constraint === null) {
      satisfied.push({ plugin, installedVersion: plugin.version, satisfied: true });
      continue;
    }

    const isSatisfied = satisfiesConstraint(plugin.version, plugin.constraint);
    const check = { plugin, installedVersion: plugin.version, satisfied: isSatisfied };

    if (isSatisfied) {
      satisfied.push(check);
    } else {
      unsatisfied.push(check);
    }
  }

  return { satisfied, unsatisfied };
}
```

Full implementation is detailed but follows this pattern. See design doc for complete flow.

**Step 2: Add tests for constraint-aware install**

```typescript
describe('constraint checking in install', () => {
  it('satisfies when no constraint', () => {
    // Setup mock with plugin installed, no constraint
    // Expect: satisfied
  });

  it('satisfies when version meets constraint', () => {
    // Setup: installed 2.0.0, constraint >= 1.0.0
    // Expect: satisfied
  });

  it('unsatisfied triggers refresh and update', () => {
    // Setup: installed 1.0.0, constraint >= 2.0.0, marketplace has 2.0.0
    // Expect: refresh called, update called
  });

  it('fails when marketplace cannot satisfy', () => {
    // Setup: installed 1.0.0, constraint >= 3.0.0, marketplace has 2.0.0
    // Expect: error message about unsatisfiable
  });
});
```

**Step 3: Run tests**

Run: `npm test -- src/install.test.ts`
Expected: PASS

**Step 4: Commit**

```bash
git add src/install.ts src/install.test.ts
git commit -m "feat(install): add constraint checking with smart refresh

Install now checks version constraints and triggers marketplace refresh
when constraints cannot be satisfied from cache."
```

---

## Task 10: Update CLI - make update refresh by default

**Files:**
- Modify: `src/cli.ts`

**Step 1: Change update command flags**

In `src/cli.ts`, update the update command:

```typescript
program
  .command('update [plugins...]')
  .description('Update outdated plugins (all if no plugins specified)')
  .option('--offline', 'Skip marketplace refresh, use cached data')
  .option('--dry-run', 'Show what would be updated without applying')
  .action((plugins, options) => {
    const projectRoot = resolveProjectRoot(process.cwd());

    // Refresh by default, unless --offline
    if (!options.offline) {
      console.log('Refreshing marketplaces...');
      refreshMarketplaces();
    }

    // ... rest of command
  });
```

**Step 2: Run manual test**

Run: `npm run dev -- update --help`
Expected: Shows --offline flag instead of --refresh

**Step 3: Commit**

```bash
git add src/cli.ts
git commit -m "feat(cli): update command refreshes by default

Add --offline flag to skip refresh. Removes --refresh flag since
refresh is now the default behavior."
```

---

## Task 11: Run full test suite and fix any issues

**Step 1: Run all tests**

Run: `npm test`
Expected: All tests pass

**Step 2: Fix any failing tests**

If tests fail, fix them and commit:

```bash
git add -A
git commit -m "fix: resolve test failures from constraint changes"
```

**Step 3: Run manual integration test**

```bash
# Create test config with constraint
echo 'plugins = ["some-plugin@marketplace >= 1.0.0"]' > /tmp/test-fettle.toml
npm run dev -- status
```

**Step 4: Final commit**

```bash
git add -A
git commit -m "chore: complete minimum version constraints implementation"
```

---

Plan complete and saved to `docs/plans/2026-02-02-minimum-version-constraints-implementation.md`.

**Two execution options:**

1. **Subagent-Driven (this session)** - I dispatch fresh subagent per task, review between tasks, fast iteration

2. **Parallel Session (separate)** - Open new session with executing-plans, batch execution with checkpoints

Which approach?