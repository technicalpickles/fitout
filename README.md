# Fettle

Context-aware plugin manager for Claude Code.

## The Problem

Managing Claude Code plugins across projects is painful:
- Config files *look* correct but don't reflect what's actually installed
- This mismatch leads to broken sessions and missing capabilities
- Manually syncing plugins across projects is tedious and error-prone

## The Solution

Fettle ensures your actual runtime state matches your declared configuration.

1. Declare desired plugins in `.claude/fettle.toml`
2. Run `fettle status` to see the diff
3. Run `fettle apply` to sync

## Installation

```bash
npm install -g fettle
```

Requires [Claude Code CLI](https://claude.ai/docs/claude-code) to be installed.

## Quick Start

Create `.claude/fettle.toml` in your project:

```toml
plugins = [
  "superpowers@superpowers-marketplace",
  "ci-cd-tools@pickled-claude-plugins",
]
```

Check status:

```bash
fettle status
```

Output:

```
Context: /path/to/project

✗ superpowers@superpowers-marketplace (missing)
✗ ci-cd-tools@pickled-claude-plugins (missing)

0 present, 2 missing
```

Install missing plugins:

```bash
fettle apply
```

## Commands

### `fettle status`

Shows the diff between desired and installed plugins.

- `✓` - Plugin is installed
- `✗` - Plugin is missing
- `?` - Plugin is installed but not in config

Exit code is `1` if any plugins are missing, `0` otherwise.

### `fettle apply`

Installs missing plugins to sync with config.

```bash
fettle apply           # Install missing plugins
fettle apply --dry-run # Preview what would be installed
```

## Profiles

Share plugin sets across projects using profiles.

### User Profiles

Create profiles at `~/.config/fettle/profiles/`:

```toml
# ~/.config/fettle/profiles/default.toml
# Auto-included in every project (silent if missing)
plugins = [
  "superpowers@superpowers-marketplace",
]
```

```toml
# ~/.config/fettle/profiles/backend.toml
plugins = [
  "database-tools@some-registry",
  "api-helpers@some-registry",
]
```

### Using Profiles

Reference profiles in your project config:

```toml
# .claude/fettle.toml
profiles = ["backend"]
plugins = [
  "project-specific@registry",
]
```

Plugins merge additively. The `default` profile auto-includes if present.

### Provenance

Status output shows where each plugin comes from:

```
Context: /path/to/project

✓ superpowers@superpowers-marketplace (from: default)
✓ database-tools@some-registry (from: backend)
✓ project-specific@registry

3 present
```

## Configuration Reference

### Project Config (`.claude/fettle.toml`)

```toml
# Optional: explicit profiles to include
profiles = ["backend", "testing"]

# Required: plugins for this project
plugins = [
  "plugin-name@registry",
]
```

### Profile Config (`~/.config/fettle/profiles/<name>.toml`)

```toml
# Plugins provided by this profile
plugins = [
  "plugin-name@registry",
]
```

## Development

```bash
npm install          # Install dependencies
npm test             # Run tests
npm run dev -- status # Run in dev mode
npm run build        # Build to dist/
```

## License

MIT
