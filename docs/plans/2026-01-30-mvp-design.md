# Fettle MVP Design

> Context-aware plugin manager for Claude Code

## Scope

**In scope:**
- Claude Code plugins only
- `local` scope only (per-project isolation)
- Two commands: `apply` and `status`

**Deferred:**
- MCP servers
- Multi-scope management (user/global)
- `fettle doctor` (deep runtime validation)
- `fettle init` (generate config from current state)
- Tool adapters (other agents beyond Claude)

## Core Flow

```
fettle apply
```

1. **Detect context** - Find `.claude/fettle.toml` in current dir or git root
2. **Load desired state** - Parse TOML for required plugins
3. **Get actual state** - Run `claude plugin list --json`, filter to `scope=local` + `projectPath=<current>`
4. **Diff** - Find missing plugins, find extras
5. **Apply** - Install missing plugins

## Configuration

**Location:** `.claude/fettle.toml`

**Format:**
```toml
plugins = [
  "superpowers@superpowers-marketplace",
  "ci-cd-tools@pickled-claude-plugins",
]
```

## CLI Commands

### `fettle apply`

Install missing plugins to sync desired state.

```
fettle apply [options]

Options:
  --dry-run    Show what would change, don't apply
  --remove     Also uninstall plugins not in config
```

**Output:**
```
$ fettle apply
Context: /Users/josh/workspace/myproject

Installing:
  + superpowers@superpowers-marketplace
  + ci-cd-tools@pickled-claude-plugins

2 plugins installed
```

### `fettle status`

Show diff between desired and actual state. No mutations.

```
$ fettle status
Context: /Users/josh/workspace/myproject

✓ superpowers@superpowers-marketplace
✗ ci-cd-tools@pickled-claude-plugins (missing)

1 present, 1 missing
```

## Architecture

```
src/
  cli.ts          # Entry point, argument parsing
  context.ts      # Find .claude/fettle.toml, resolve project root
  config.ts       # Parse TOML, validate shape
  claude.ts       # Shell out to `claude plugin list/install`
  diff.ts         # Compare desired vs actual state
  apply.ts        # Orchestrate the apply flow
  status.ts       # Orchestrate the status flow
```

## Types

```typescript
// Desired state from config
interface PluginSpec {
  id: string;  // e.g. "superpowers@superpowers-marketplace"
}

// Actual state from `claude plugin list`
interface InstalledPlugin {
  id: string;
  version: string;
  scope: "local" | "user" | "global";
  enabled: boolean;
  projectPath?: string;
}

// Diff result
interface PluginDiff {
  missing: PluginSpec[];      // In config, not installed locally
  extra: InstalledPlugin[];   // Installed locally, not in config
  present: InstalledPlugin[]; // In both
}
```

## Dependencies

- `commander` - CLI parsing
- `smol-toml` - TOML parsing (lightweight)
- No runtime deps on Claude SDK (shell out to `claude` CLI)

## Claude CLI Integration

**List plugins:**
```bash
claude plugin list --json
```

Returns array of:
```json
{
  "id": "superpowers@superpowers-marketplace",
  "version": "4.0.3",
  "scope": "local",
  "enabled": true,
  "projectPath": "/Users/josh/workspace/myproject"
}
```

**Install plugin:**
```bash
claude plugin install <plugin-id> --scope local
```

## Error Handling

| Scenario | Behavior |
|----------|----------|
| No `fettle.toml` found | Error: "No fettle.toml found. Run `fettle init` to create one." |
| Invalid TOML syntax | Error with line number from parser |
| `claude` CLI not found | Error: "Claude CLI not found. Is Claude Code installed?" |
| Plugin install fails | Show error, continue with remaining plugins, exit code 1 |
| All plugins already present | Success: "Nothing to do. 3 plugins already installed." |

## Output Style

- Quiet when correct
- Loud when broken
- Clear next steps

```
# Success - minimal
$ fettle apply
✓ 3 plugins synced

# Partial failure - actionable
$ fettle apply
✓ superpowers@superpowers-marketplace
✗ bad-plugin@unknown - registry not found

1 installed, 1 failed
```

## Distribution

- **Language:** Node.js/TypeScript
- **Package:** npm
- **Execution:** `npx fettle`

## Success Criteria

- [ ] `fettle apply` installs missing local plugins
- [ ] `fettle status` shows desired vs actual diff
- [ ] Works in any directory with `.claude/fettle.toml`
- [ ] Handles missing config gracefully
- [ ] Handles install failures gracefully
