# Rename: fettle → fitout

## Context

The name `fettle` is taken on npm. After brainstorming alternatives, we chose `fitout`:

- **Meaning**: "to supply someone or something with all of the things that will be needed"
- **Metaphor**: Like Q fitting out James Bond with gadgets before a mission
- **Available**: npm ✓, GitHub ✓, no inappropriate meanings

## Scope

51 files contain "fettle". Changes fall into these categories:

### 1. Package Identity

**package.json**:
- `name`: `@technicalpickles/fettle` → `fitout`
- `bin`: `fettle` → `fitout`
- `repository.url`: update GitHub URL
- `homepage`: update GitHub URL
- `bugs.url`: update GitHub URL

**package-lock.json**: Will regenerate after package.json changes.

### 2. Config Paths

| Location | Old | New |
|----------|-----|-----|
| Project config | `.claude/fettle.toml` | `.claude/fitout.toml` |
| Global config home | `~/.config/fettle/` | `~/.config/fitout/` |
| Environment variable | `FETTLE_CONFIG_HOME` | `FITOUT_CONFIG_HOME` |
| Skill directory | `~/.claude/skills/fettle/` | `~/.claude/skills/fitout/` |

**Files to update**:
- `src/paths.ts` - `getFettleConfigHome()` → `getFitoutConfigHome()`
- `src/context.ts` - config filename
- `src/init.ts` - skill name, hook commands
- `src/test-utils.ts` - `fettleHome` → `fitoutHome`

### 3. CLI & User-Facing Text

**src/cli.ts**:
- `.name('fettle')` → `.name('fitout')`

**src/hookError.ts**:
- `[fettle]` prefix → `[fitout]`

**src/completion.ts**:
- All `fettle` command references → `fitout`

**src/status.ts**, **src/install.ts**:
- Command suggestions: `fettle init` → `fitout init`, etc.

**src/init.ts**:
- Skill name and description
- Hook command: `fettle install --hook` → `fitout install --hook`
- All user-facing messages

### 4. Tests

All test files need updating for:
- Config paths (`.claude/fettle.toml` → `.claude/fitout.toml`)
- Environment variables (`FETTLE_CONFIG_HOME` → `FITOUT_CONFIG_HOME`)
- Expected output strings
- Temp directory prefixes (`fettle-test-` → `fitout-test-`)

Files:
- `src/context.test.ts`
- `src/paths.test.ts`
- `src/globalConfig.test.ts`
- `src/test-utils.test.ts`
- `src/hookError.test.ts`
- `src/init.test.ts`
- `src/install.test.ts`
- `src/status.test.ts`
- `src/completion.test.ts`

### 5. Documentation

**Must update** (user-facing):
- `README.md`
- `CLAUDE.md`
- `CONTRIBUTING.md`
- `CHANGELOG.md`
- `.github/ISSUE_TEMPLATE/bug_report.md`

**Historical docs** (leave as-is or light touch):
- `docs/plans/*` - historical record, don't rewrite history
- `docs/progress/*` - historical record
- `docs/design.md` - note the rename at top, keep history
- `docs/followup/npm-name-alternatives.md` - mark resolved

**Rename file**:
- `docs/playground/fettle-playground.html` → `docs/playground/fitout-playground.html`

### 6. Repository

After code changes:
1. Rename GitHub repo: `technicalpickles/fettle` → `technicalpickles/fitout`
2. Or create new repo and archive old one

## Implementation Order

1. **Source code** - Update all `src/*.ts` files
2. **Tests** - Update all `src/*.test.ts` files
3. **Run tests** - Verify everything passes
4. **Package** - Update `package.json`, regenerate lock file
5. **Docs** - Update README, CLAUDE.md, CONTRIBUTING, CHANGELOG
6. **Commit** - Single commit: "rename: fettle → fitout"
7. **Repository** - Rename on GitHub
8. **Publish** - `npm publish` as `fitout`

## Migration Notes

For existing users (if any):
- Old config at `.claude/fettle.toml` won't be found
- Old global config at `~/.config/fettle/` won't be found
- Could add migration detection, but YAGNI for now (pre-release)

## Verification

- [ ] `npm run build` succeeds
- [ ] `npm test` passes
- [ ] `npm run dev -- status` works
- [ ] CLI shows `fitout` in help
- [ ] Config file is `.claude/fitout.toml`
- [ ] Hook command is `fitout install --hook`
