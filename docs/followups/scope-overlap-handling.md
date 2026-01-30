# Scope Overlap Handling

## Context

Fettle MVP manages plugins at `scope=local` only. However, plugins can also be installed at `user` or `global` scopes outside of Fettle's control.

## Edge Cases to Address

1. **Plugin in config, already installed at higher scope**
   - User has `superpowers@marketplace` at `user` scope
   - Project's `fettle.toml` also lists it
   - Should Fettle skip (already available)? Or install locally anyway (isolation)?

2. **Plugin at higher scope shadows local behavior**
   - Different versions at different scopes
   - Enabled at user, disabled at local (or vice versa)

3. **Uninstall behavior**
   - If Fettle removes a local plugin, but it exists at user scope, it may still be active
   - User might be surprised

## Possible Approaches

- **Strict local isolation**: Always install locally regardless of higher scopes
- **Aware but local**: Detect higher-scope installs, warn user, still manage local
- **Scope-aware config**: Allow explicit `prefer_scope` or `skip_if_available` options

## Decision

Deferred to post-MVP. For now, Fettle only manages local scope and ignores other scopes.
