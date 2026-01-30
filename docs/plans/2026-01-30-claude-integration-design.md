# Claude Integration Design

## Goal

Fettle automatically syncs plugins at Claude session start - installing missing plugins and notifying the user if a restart is needed.

## Components

### 1. `fettle apply --hook`

Hook-friendly output mode for the existing `apply` command.

**Behavior:**

| Scenario | stdout | exit code |
|----------|--------|-----------|
| Nothing to do | (empty) | 0 |
| Plugins installed | "Installed X plugins. Restart Claude to activate." | 0 |
| Install failed | (empty) | 1, stderr has error |
| No config found | (empty) | 0 (not an error in hook context) |

Key insight: in hook context, "no config" isn't an error - the project just doesn't use Fettle.

**Files:** `src/apply.ts`, `src/cli.ts`

### 2. `fettle init`

Wires Fettle into Claude by adding a SessionStart hook.

**Hook configuration added to `~/.claude/settings.json`:**

```json
{
  "hooks": {
    "SessionStart": [
      {
        "hooks": [
          {
            "type": "command",
            "command": "fettle apply --hook"
          }
        ]
      }
    ]
  }
}
```

**Interactive mode (default):**

```
$ fettle init

Fettle - Context-aware plugin manager for Claude Code

This will:
  • Add a SessionStart hook to ~/.claude/settings.json
  • Create ~/.config/fettle/profiles/ for shared plugin profiles

Create a default profile? (y/n) y
Profile name [default]:

Created:
  ✓ SessionStart hook added to ~/.claude/settings.json
  ✓ ~/.config/fettle/profiles/default.toml

Next steps:
  • Add plugins to your profile: ~/.config/fettle/profiles/default.toml
  • Or create a project config: .claude/fettle.toml
  • Restart Claude to activate the hook
```

**Non-interactive flags:**

- `--yes` / `-y` - Skip prompts, use defaults (creates default profile)
- `--hook-only` - Only add the hook, don't create profile

**Files:** `src/cli.ts`, `src/init.ts` (new)

## Not Included

- `fettle deinit` - Add later if needed

## Implementation Order

1. Add `--hook` flag to `apply` command
2. Create `init` command with interactive flow
3. Add non-interactive flags to `init`
4. Update README with installation instructions
