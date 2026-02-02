# Fitout

[![CI](https://github.com/technicalpickles/fitout/actions/workflows/ci.yml/badge.svg)](https://github.com/technicalpickles/fitout/actions/workflows/ci.yml)

Context-aware plugin manager for Claude Code.

## The Problem

Managing Claude Code plugins across projects is painful:
- Config files *look* correct but don't reflect what's actually installed
- This mismatch leads to broken sessions and missing capabilities
- Manually syncing plugins across projects is tedious and error-prone

## The Solution

Fitout ensures your actual runtime state matches your declared configuration.

1. Declare desired plugins in `.claude/fitout.toml`
2. Run `fitout status` to see the diff
3. Run `fitout apply` to sync

## Installation

```bash
# Install globally
npm install -g fitout

# Set up Claude integration
fitout init
```

This adds a SessionStart hook to Claude Code that automatically installs missing plugins when you start a session.

### Non-interactive setup

```bash
fitout init --yes        # Use defaults (creates default profile)
fitout init --hook-only  # Only add hook, no profile
```

Requires [Claude Code CLI](https://claude.ai/docs/claude-code) to be installed.

## Quick Start

Create `.claude/fitout.toml` in your project:

```toml
plugins = [
  "superpowers@superpowers-marketplace",
  "ci-cd-tools@pickled-claude-plugins",
]
```

Check status:

```bash
fitout status
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
fitout apply
```

## Commands

### `fitout status`

Shows the diff between desired and installed plugins.

- `✓` - Plugin is installed
- `✗` - Plugin is missing
- `?` - Plugin is installed but not in config

Exit code is `1` if any plugins are missing, `0` otherwise.

### `fitout apply`

Installs missing plugins to sync with config.

```bash
fitout apply           # Install missing plugins
fitout apply --dry-run # Preview what would be installed
```

## Profiles

Share plugin sets across projects using profiles.

### User Profiles

Create profiles at `~/.config/fitout/profiles/`:

```toml
# ~/.config/fitout/profiles/default.toml
# Auto-included in every project (silent if missing)
plugins = [
  "superpowers@superpowers-marketplace",
]
```

```toml
# ~/.config/fitout/profiles/backend.toml
plugins = [
  "database-tools@some-registry",
  "api-helpers@some-registry",
]
```

### Using Profiles

Reference profiles in your project config:

```toml
# .claude/fitout.toml
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

### Project Config (`.claude/fitout.toml`)

```toml
# Optional: explicit profiles to include
profiles = ["backend", "testing"]

# Required: plugins for this project
plugins = [
  "plugin-name@registry",
]
```

### Profile Config (`~/.config/fitout/profiles/<name>.toml`)

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
