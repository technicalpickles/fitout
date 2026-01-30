# Profiles Feature Complete

**Date:** 2025-01-30

## Summary

Implemented composable user-global profiles for fettle. Users can define reusable plugin sets at `~/.config/fettle/profiles/<name>.toml` that are automatically merged with project configs.

## What Was Built

### Core Features
- **Profile loading** - Load TOML profiles from `~/.config/fettle/profiles/`
- **Auto-include default** - `default.toml` is automatically included if present (silent miss)
- **Explicit profiles** - Projects can reference profiles via `profiles = ["backend", "testing"]`
- **Additive merge** - All plugins from profiles + project config are unioned
- **Provenance tracking** - Status output shows where each plugin came from: `(from: default)`
- **First-source-wins** - Duplicate plugins resolved by first occurrence

### Files Changed

| File | Change |
|------|--------|
| `src/profiles.ts` | **NEW** - ResolvedPlugin type, loadProfile(), resolveProfiles() |
| `src/profiles.test.ts` | **NEW** - 9 tests for profile loading and resolution |
| `src/config.ts` | Added `profiles: string[]` to FettleConfig |
| `src/context.ts` | Added getProfilesDir() |
| `src/diff.ts` | Added diffPluginsResolved() with provenance tracking |
| `src/status.ts` | Added formatStatusResolved(), integrated profile resolution |
| `src/apply.ts` | Integrated profile resolution |
| `docs/followups/profile-enhancements.md` | **NEW** - Future improvements |

### Commits (9 total)

```
0267e9a docs: add profile enhancement followups
27d6035 feat: integrate profile resolution into apply command
8f03b0f feat: integrate profile resolution into status command
e522e74 feat: add formatStatusResolved() with provenance display
01cbe51 feat: add diffPluginsResolved() with provenance tracking
09bf528 feat: add resolveProfiles() for profile merging
311935b feat: add loadProfile() to load individual profiles
49e95a0 feat: parse profiles field from config
2fe8c83 feat: add getProfilesDir() for profile discovery
```

## Usage

### Create a default profile

```bash
mkdir -p ~/.config/fettle/profiles
cat > ~/.config/fettle/profiles/default.toml << 'EOF'
plugins = [
  "superpowers@superpowers-marketplace",
]
EOF
```

### Reference profiles in project config

```toml
# .claude/fettle.toml
profiles = ["backend"]
plugins = [
  "project-specific@registry",
]
```

### Status output with provenance

```
Context: /path/to/project

✓ superpowers@superpowers-marketplace (from: default)
✓ project-specific@registry
✗ missing-plugin@registry (from: backend) (missing)

2 present, 1 missing
```

## Test Coverage

- 35 tests total (was 20 before this feature)
- 9 new tests in `profiles.test.ts`
- 2 new tests in `diff.test.ts`
- 1 new test in `status.test.ts`
- 2 new tests in `config.test.ts`
- 1 new test in `context.test.ts`

## Deferred / Followups

Documented in `docs/followups/profile-enhancements.md`:

- `!plugin` negation syntax to exclude plugins
- `include_default = false` to skip auto-include
- Profile nesting (profiles including other profiles)
- Project-level profiles (`.claude/profiles/`)
- `FETTLE_CONFIG_HOME` env var for config directory override
