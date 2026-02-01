# SessionStart:clear Hook Error Investigation

**Date:** 2025-01-31
**Status:** Open
**Priority:** Low

## Problem

User sees intermittent "SessionStart:clear hook error" messages when running `/clear` in Claude Code.

## Investigation Summary

### What "SessionStart:clear" Means

- When `/clear` is run in Claude Code, it triggers SessionStart hooks
- The `:clear` suffix is the command identifier (from `/clear`)
- This is Claude Code's internal naming convention: `SessionStart:<command>`

### Hooks That Run on SessionStart

From `~/.claude/settings.json`:

```json
"SessionStart": [
  {
    "hooks": [{ "type": "command", "command": "~/bin/apctl hook session-start" }]
  },
  {
    "hooks": [{ "type": "command", "command": "fettle apply --hook" }]
  }
]
```

### Elimination Process

1. **apctl (agenticpets)** - Ruled out
   - Code explicitly exits 0 on all errors (silent failure by design)
   - Tested manually: works without error
   - Socket exists at `/tmp/agenticpets.sock`

2. **fettle apply --hook** - Likely source
   - Only other SessionStart hook
   - Returns non-zero exit codes on errors (e.g., `exit 1` for unknown options)

### Test Results

```bash
# apctl works silently
echo '{"session_id":"test","cwd":"/tmp"}' | ~/bin/apctl hook session-start
# Exit: 0 (always)

# fettle can fail with exit 1
fettle apply --hook --verbose
# error: unknown option '--verbose'
# Exit: 1
```

## Hypotheses for Intermittent Failures

1. **Timing/race condition** - Hook runs before fettle is ready
2. **Network issues** - Fettle may make network calls to check plugin state
3. **Plugin state issues** - Something about plugin resolution failing
4. **stdin handling** - Claude Code may pass unexpected input on /clear

## Recommended Investigation

1. Add verbose/debug logging to `fettle apply --hook`
2. Log stdin contents when hook is invoked to see what Claude Code sends
3. Check if the error correlates with network availability
4. Consider making `--hook` mode more resilient (exit 0 on non-critical errors)

## Potential Fix

If fettle hook should be best-effort (don't block Claude Code on failure):

```typescript
// Wrap hook execution to always succeed
try {
  await applyHook()
} catch (e) {
  console.error('Hook error (non-fatal):', e.message)
  process.exit(0)  // Don't report as error to Claude Code
}
```

## Files Referenced

- `~/.claude/settings.json` - Hook configuration
- `/Users/josh.nichols/workspace/agenticpets/cmd/apctl/hook.go` - apctl hook implementation
- `~/bin/fettle` - Fettle binary
