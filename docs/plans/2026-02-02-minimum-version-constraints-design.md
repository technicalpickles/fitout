# Minimum Version Constraints for Fettle Plugins

**Date:** 2026-02-02
**Status:** Design approved, ready for implementation

## Overview

Add support for minimum version constraints in plugin specifications. This allows users to declare "I need at least version X" and have fettle handle updates automatically.

## Motivation

From feedback in `docs/feedback/`:
- `fettle update` uses cached marketplace data, so new versions aren't detected without `--refresh`
- Users who publish to a marketplace know there's a new version but fettle doesn't automatically pick it up

With version constraints, the config becomes declarative: "I need >= 1.2.0" and `fettle install` handles the rest.

## Design Decisions

### Syntax

Space-separated constraint after plugin ID:

```toml
plugins = [
  "git@marketplace >= 2.0.0",    # minimum version
  "other@marketplace",            # no constraint (any version)
]
```

Only `>=` operator supported. Marketplaces only expose latest version, so complex ranges aren't meaningful.

### Version Validation

Permissive - any dot-separated numbers:
- Valid: `1.0.0`, `1.0`, `1`, `2.1.3`
- Invalid: `abc`, empty string

Matches existing `compareVersions` behavior in `update.ts`.

### Error Handling

Collect all parse errors before failing:

```
Invalid plugin constraints:
  "git@marketplace >= abc": Invalid version "abc" - expected number segments (e.g., 1.0.0)
  "other@marketplace < 1.0": Unsupported operator "<". Only ">=" is supported.
```

### Default Behavior

No constraint = any version. Plugin presence is all that matters.

### Constraint Merging (Profiles + Project)

Higher minimum wins across all sources:

```toml
# default.toml (profile)
plugins = ["git@marketplace >= 1.0.0"]

# .claude/fettle.toml (project)
profiles = ["default"]
plugins = ["git@marketplace >= 2.0.0"]

# Result: >= 2.0.0 (higher wins)
```

When project constraint is overridden by profile, show warning:

```
Warning: git@marketplace constraint >= 1.0.0 (project) overridden by >= 2.0.0 (default profile)
  To fix: update .claude/fettle.toml to ">= 2.0.0" or remove the constraint
```

### Install Flow

1. Parse config and resolve profiles (with constraints)
2. Get installed plugins and cached marketplace data
3. For each resolved plugin:
   - Not installed → needs install
   - Installed, no constraint → satisfied
   - Installed, constraint satisfied → satisfied
   - Installed, constraint NOT satisfied → needs update
4. If any need update:
   - Refresh all marketplaces
   - Re-check against new data
   - If satisfiable → update
   - If still unsatisfiable → fail with clear error

### Unsatisfiable Constraint Error

```
Error: Cannot satisfy constraint for git@marketplace
  Installed: 1.5.0
  Required:  >= 2.0.0
  Marketplace latest: 1.8.0

  The marketplace does not have a version that satisfies >= 2.0.0
```

### Status Output

```
✓ git@marketplace 2.1.0 (from: default)                           # no constraint
✓ git@marketplace 2.1.0 >= 2.0.0 (from: default)                   # satisfied
⚠ git@marketplace 1.5.0 >= 2.0.0 (from: default) (needs update)    # needs update

10 present, 1 needs update
```

### Update Command Changes

- `fettle update` refreshes by default (no more stale cache lies)
- Add `--offline` flag to use cached data

## Data Model

```typescript
// src/constraint.ts
export interface ParsedPlugin {
  id: string;
  constraint: string | null;  // version without operator, e.g., "1.2.0"
}

export interface ParseError {
  input: string;
  message: string;
}

// src/profiles.ts (updated)
export interface ResolvedPlugin {
  id: string;
  source: string;
  constraint: string | null;
}
```

## Files to Change

| File | Change |
|------|--------|
| `src/constraint.ts` | **New** - parsing, validation, constraint comparison |
| `src/config.ts` | Use constraint parsing, collect errors |
| `src/profiles.ts` | Add constraint to ResolvedPlugin, merge logic |
| `src/diff.ts` | Constraint-aware diffing |
| `src/install.ts` | Smart refresh when constraints unsatisfied |
| `src/status.ts` | Show versions and constraint status |
| `src/cli.ts` | Update refreshes by default, add --offline |

## Backwards Compatibility

Fully backwards compatible:
- `"plugin@registry"` works as before (no constraint)
- No TOML schema changes
- Existing configs work without modification

## Future Work

- `fettle fix-constraints` command to auto-update project config when overridden
- Interactive prompt during status/install to fix constraints
