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

## Config Directory Override

Support `FETTLE_CONFIG_HOME` environment variable to override the default config directory (`~/.config/fettle`). Useful for:

- Development/testing without touching user's real config
- CI/CD environments
- Multiple config sets

Implementation:

```typescript
export function getConfigHome(): string {
  return process.env.FETTLE_CONFIG_HOME || join(homedir(), '.config', 'fettle');
}

export function getProfilesDir(): string {
  return join(getConfigHome(), 'profiles');
}
```
