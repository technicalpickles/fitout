# Feedback: Marketplace refresh workflow

**Date:** 2026-02-01
**Context:** Testing plugin updates after marketplace changes

## Summary

When a marketplace publishes new versions, the local cache doesn't automatically update. Users must explicitly refresh before updates are detected.

## Current Workflow

```bash
# This says "all up-to-date" even when marketplace has new versions
$ fettle update
All plugins are up-to-date.

# Must explicitly refresh first
$ fettle marketplace refresh
Refreshing marketplaces...
✔ Successfully updated 4 marketplace(s)

# Now update works
$ fettle update
✓ second-brain@pickled-claude-plugins updated 1.1.0 → 1.2.0
```

Or use the `--refresh` flag:

```bash
$ fettle update --refresh
Refreshing marketplaces...
✔ Successfully updated 4 marketplace(s)
✓ second-brain@pickled-claude-plugins updated 1.1.0 → 1.2.0
```

## Observations

1. **Silent stale cache**: `fettle update` doesn't warn that marketplace data might be stale
2. **--refresh works well**: The flag is the right UX for "check for updates now"
3. **Session start hook**: Doesn't refresh marketplaces (by design - speed)

## Suggestions

1. **Consider cache age warning**
   - If marketplace cache is >24h old, suggest `--refresh`
   - "Marketplace data is 3 days old. Use --refresh to check for updates."

2. **Document the workflow**
   - README should explain: `fettle update` uses cached marketplace data
   - `fettle update --refresh` or `fettle marketplace refresh` to sync

3. **Maybe: periodic background refresh**
   - Not in session hook (too slow)
   - Could be a separate scheduled task
   - Or refresh on first `update` of the day

## Not a Bug

This behavior is reasonable for performance. Marketplace refresh requires network requests to GitHub for each marketplace. Making this automatic on every `update` would slow things down.

The `--refresh` flag is the right solution. Just needs documentation/discoverability.
