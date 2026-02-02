# Feedback: Status should show outdated plugins

**Date:** 2026-02-01
**Context:** Testing plugin updates after fixing version bump CI in pickled-claude-plugins

## Summary

`fettle status` shows present/missing plugins but doesn't show version information or flag outdated plugins. Users must run `fettle update` to discover if updates are available.

## Current Behavior

```
$ fettle status
Global:
  ✓ Hook installed
  ✓ Skill installed

Plugins:
✓ agent-meta@pickled-claude-plugins (from: default)
✓ second-brain@pickled-claude-plugins (from: default)
...

10 present
```

Status only shows:
- Present (✓) vs missing (✗)
- Which profile the plugin came from

## Expected Behavior

Status should show version info and flag outdated plugins:

```
$ fettle status
Global:
  ✓ Hook installed
  ✓ Skill installed

Plugins:
✓ agent-meta@pickled-claude-plugins 1.1.0 (from: default)
⚠ second-brain@pickled-claude-plugins 1.1.0 → 1.2.0 (from: default)
✓ git@pickled-claude-plugins 2.2.0 (from: default)
...

10 present, 1 outdated
```

## Why This Matters

1. **Discoverability**: Users don't know updates exist until they run `fettle update`
2. **CI/Automation**: Scripts checking `fettle status` can't detect drift
3. **Session start hook**: Could warn about outdated plugins at session start

## Workaround

Currently must run update to check:

```bash
$ fettle update --dry-run
# or
$ fettle update second-brain@pickled-claude-plugins --refresh
✓ second-brain@pickled-claude-plugins is already up-to-date (v1.2.0)
```

## Related Context

### The scenario that surfaced this

1. Bumped versions in pickled-claude-plugins marketplace (tool-routing 1.0.0→1.1.0, dev-tools 1.0.0→1.1.0, second-brain 1.1.0→1.2.0)
2. Ran `fettle status` - all showed as present ✓
3. Ran `fettle update` - said "All plugins are up-to-date"
4. Realized marketplace cache was stale
5. Ran `fettle marketplace refresh` then `fettle update` - still said up-to-date
6. Used `claude plugin update second-brain@pickled-claude-plugins --scope local` directly - that worked
7. After manual update, `fettle update <plugin>` correctly shows current version

### Observations

- `fettle update` checks versions correctly once marketplace is refreshed
- `fettle status` doesn't query versions at all
- The `--refresh` flag on update helps, but status has no equivalent
- Mixed versions across scopes (some at 1.0.0, some at 1.1.0, some at 1.2.0) aren't surfaced

## Suggested Changes

1. **Add version column to status output**
   - Show installed version for each plugin
   - Optionally show available version if different

2. **Add `--check-updates` flag to status**
   - Query marketplace for latest versions
   - Flag outdated plugins with ⚠

3. **Add summary line for outdated count**
   - "10 present, 2 outdated"

4. **Consider `--refresh` flag for status**
   - Refresh marketplace before checking
   - Similar to `fettle update --refresh`
