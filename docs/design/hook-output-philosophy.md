# Hook Output Philosophy

Fettle runs as a Claude Code SessionStart hook via `fettle install --hook`. This document explains the output strategy for hook mode.

## Principle: Signal, Don't Noise

Hook output becomes context for Claude. Every line we emit is something Claude might act on or reference. We should only output when there's something actionable.

## Output Strategy

| Situation | stdout | stderr | Exit Code |
|-----------|--------|--------|-----------|
| All plugins present | (empty) | - | 0 |
| Plugins installed | System reminder listing installed plugins | - | 0 |
| No config found | Guidance to run `fettle init` | - | 0 |
| Config parse error | (empty) | `[fettle] Failed to parse...` | 1 |
| Profile error | (empty) | `[fettle] Profile errors...` | 1 |
| Install failure | Partial success if any | `[fettle] Failed to install...` | 1 |

## Rationale

**Silent on success (no changes):** When all plugins are already installed, there's nothing for Claude to do. Emitting "all good!" would just waste context tokens and add noise to every session.

**Loud on action:** When we install plugins, Claude should know - it may need to inform the user to restart, or understand why new capabilities appeared.

**Loud on error:** Errors go to stderr with `[fettle]` prefix so users can identify the source when hooks fail. Claude Code shows stderr to users on hook failure.

**Guidance on missing config:** This isn't an error (exit 0) but is actionable - Claude should inform the user about setup.

## stderr Identification

All errors written to stderr are prefixed with `[fettle]` so users can identify which hook failed when multiple SessionStart hooks are configured. Claude Code doesn't show the command name on failure, only stderr output.
