# UX Improvements Design

Based on hands-on usage feedback in `docs/feedback/user-experience-iteration.md`.

## 1. Command Structure & Install Rename

**Goal:** Match the Bundler mental model - `fettle` runs `fettle install`.

**Changes:**

1. Rename `apply` → `install` in cli.ts
   - Update command name and description
   - Keep `--dry-run` and `--hook` flags
   - Rename `src/apply.ts` → `src/install.ts` (and test file)

2. Default command - `fettle` with no args runs `install`
   - Add `.action()` on root program or use Commander's default command

3. Update references:
   - Hook command: `fettle apply --hook` → `fettle install --hook`
   - Skill docs mentioning `fettle apply`
   - Help text / tips

## 2. Init Improvements

**Goal:** Make init idempotent with phased checks, color treatment, and preview mode.

**New flow:**
```
init →
  1. Check global setup (hook + skill)
     - If missing: prompt to set up
     - If present: show ✓ and skip
  2. Check default profile
     - If missing: prompt to create
     - If present: show ✓ and skip
  3. Check project config
     - If missing: show preview, confirm, create
     - If present: show ✓ and skip
  4. If everything exists: "Already initialized"
```

**New check functions:**
- `hasDefaultProfile(profilesDir)`
- `hasProjectConfig(projectRoot)`
- `hasFettleSkill()` (already have `hasFettleHook`)

**Example output (partially set up):**
```
Checking Fettle setup...

Global:
  ✓ SessionStart hook
  ✓ Diagnostic skill
  ✗ Default profile (missing)

Create default profile? [Y/n] y
Profile name [default]: default
  ✓ Created ~/.config/fettle/profiles/default.toml

Project:
  ✗ Project config (missing)

Ready to create .claude/fettle.toml:
    # Fettle project config
    profiles = ["default"]

    plugins = [
      # "example-plugin@marketplace",
    ]

Create? [Y/n] y
  ✓ Created .claude/fettle.toml
```

**Example output (fully set up):**
```
Checking Fettle setup...

Global:
  ✓ SessionStart hook
  ✓ Diagnostic skill
  ✓ Default profile

Project:
  ✓ Project config

Already initialized.
```

## 3. Status Command: Show Global State

**Add global section at top of status output:**

```
Global:
  ✓ Hook installed
  ✓ Skill installed
  ✓ Profile: default

Context: ~/workspace/project

Plugins:
  ✓ plugin-a
  ✗ plugin-b (missing)

2 present, 1 missing
```

**Behavior:**
- Global section always shown (quick health check)
- If any global piece missing, show with ✗ and dim hint
- Profile line shows which profiles are being used (from project config)

**When no project config:**
```
Global:
  ✓ Hook installed
  ✓ Skill installed
  ✓ Profile: default

No project config. Run `fettle init` to create one.
```

## 4. Marketplace in Global Config

**Goal:** Global config defines expected marketplaces so `fettle install` works out of the box on new machines.

**File: `~/.config/fettle/config.toml`**
```toml
[marketplaces]
pickled-claude-plugins = "https://github.com/technicalpickles/pickled-claude-plugins"
```

**New functions:**
- `getGlobalConfigPath()` → `~/.config/fettle/config.toml`
- `readGlobalConfig()` → `{ marketplaces: Record<string, string> }`
- `ensureMarketplaces(marketplaces)` → register missing ones with Claude

**Install behavior:**
1. Read `~/.config/fettle/config.toml`
2. For each marketplace, check if registered with Claude
3. If missing, register using source URL
4. Proceed with plugin installation

**Init additions:**
- Check for global config, create if missing
- Prompt for initial marketplace (or use sensible default)

## 5. Ctrl+C Error Handling

**Problem:** Ctrl+C during prompts throws readline error.

**Fix in `src/prompt.ts`:**
```typescript
rl.on('close', () => {
  // Handle Ctrl+C - readline closes without answer
  console.log('');
  process.exit(130);
});
```

Apply to both `confirm()` and `input()` functions.

## 6. Install/Status Path Display

**Changes:**
- Remove "Context: /path" unless different from `process.cwd()`
- Substitute `$HOME` with `~` in all displayed paths

**Implementation:**
```typescript
function formatPath(path: string): string {
  const home = homedir();
  return path.startsWith(home) ? path.replace(home, '~') : path;
}

// Only show context if different from cwd
const cwd = process.cwd();
const contextLine = projectRoot !== cwd
  ? `${colors.header('Context:')} ${formatPath(projectRoot)}\n\n`
  : '';
```

## Implementation Order

1. Command structure & install rename (quick, high impact)
2. Ctrl+C error handling (quick fix)
3. Path display polish (quick fix)
4. Init improvements (moderate complexity)
5. Status global section (builds on init work)
6. Marketplace in global config (requires design for Claude CLI integration)
