# Fettle Progress

## Current State: MVP Complete

**Date:** 2026-01-30

Fettle MVP is fully implemented and ready for use. The tool syncs Claude Code plugins to a declared state in `.claude/fettle.toml`.

## What's Working

### Commands

```bash
# Show diff between desired and installed plugins
fettle status

# Preview what would be installed
fettle apply --dry-run

# Install missing plugins
fettle apply
```

### Configuration

Location: `.claude/fettle.toml`

```toml
plugins = [
  "superpowers@superpowers-marketplace",
  "ci-cd-tools@pickled-claude-plugins",
]
```

### Execution

```bash
# Via npx (once published)
npx fettle status

# Local development
npm run dev -- status
```

## Architecture

```
src/
  cli.ts        # Entry point, Commander setup
  context.ts    # Find .claude/fettle.toml, resolve project root
  config.ts     # Parse TOML config
  claude.ts     # Shell out to `claude plugin list/install`
  diff.ts       # Compare desired vs actual state
  status.ts     # Status command implementation
  apply.ts      # Apply command implementation
```

## Test Coverage

20 tests across 6 test files:
- context.test.ts (6 tests) - Project root and config path resolution
- config.test.ts (3 tests) - TOML parsing
- claude.test.ts (2 tests) - Plugin list JSON parsing
- diff.test.ts (4 tests) - Plugin diff logic
- status.test.ts (2 tests) - Status output formatting
- apply.test.ts (3 tests) - Apply result formatting

## Commits

```
4b19501 chore: add vitest config to exclude dist from tests
18f255a chore: prepare package.json for npm publishing
e820142 chore: add example fettle.toml config
35f3c6c feat: add CLI entry point with status and apply commands
7695064 fix: handle config read/parse errors in runStatus
d5a191c fix: handle config read/parse errors in runApply
cb1b017 feat: add apply command to install missing plugins
39ea088 fix: use beforeAll hook for test fixture setup
d03a2ba feat: add status command to show plugin diff
27800fd feat: add diff logic to compare desired vs installed plugins
2a5a46f fix: prevent command injection in Claude CLI integration
6f22031 feat: add Claude CLI integration for plugin list/install
15020a0 feat: add TOML config parsing
05ad652 test: add happy path tests for context resolution
1b7995e feat: add context resolution for finding fettle.toml
8ae795c chore: initialize Node.js/TypeScript project
```

## What's Deferred

See `docs/plans/2026-01-30-mvp-design.md` for full scope decisions.

### Not in MVP
- MCP servers (plugins only for now)
- Multi-scope management (local scope only)
- `fettle doctor` command (deep runtime validation)
- `fettle init` command (generate config from current state)
- Tool adapters (other agents beyond Claude)
- `--remove` flag to uninstall extra plugins

### Known Edge Cases
- See `docs/followups/scope-overlap-handling.md` for handling plugins at multiple scopes

## Next Steps

1. **Publish to npm** - `npm publish` to enable `npx fettle`
2. **Real-world testing** - Use in actual projects to find edge cases
3. **Phase 1 features** - `fettle init`, `--remove` flag, better error messages
