# Update Workflow Design

Detect outdated plugins and update them to latest versions.

## Commands & Flags

**New commands:**

```
fettle marketplace refresh    # Wrapper for `claude plugin marketplace update`
fettle update [plugin...]     # Update outdated plugins (all if no args)
```

**New flags:**

```
fettle status --refresh       # Refresh marketplaces before checking
fettle update --refresh       # Refresh marketplaces before updating
fettle update --dry-run       # Show what would be updated
```

## Architecture

### Data Flow

1. **Get installed plugins** - `claude plugin list --json`
2. **Get available versions** - Parse marketplace plugin.json files at:
   ```
   ~/.claude/plugins/marketplaces/{marketplace}/plugins/{plugin}/.claude-plugin/plugin.json
   ```
3. **Compare** - For each installed plugin, check if available > installed

### New Modules

**`src/marketplace.ts`**

```typescript
interface AvailablePlugin {
  id: string;           // "git@pickled-claude-plugins"
  version: string;      // "2.1.0"
  marketplacePath: string;
}

function listAvailablePlugins(): AvailablePlugin[]
function refreshMarketplaces(): void  // shells out to claude CLI
```

**`src/update.ts`**

```typescript
interface OutdatedPlugin {
  id: string;
  installedVersion: string;
  availableVersion: string;
}

function findOutdatedPlugins(installed: InstalledPlugin[], available: AvailablePlugin[]): OutdatedPlugin[]
function updatePlugin(pluginId: string): void  // shells out to claude CLI
```

## Output Formats

### Status with Outdated Detection

```
Context: /Users/josh/workspace/fettle

✓ git@pickled-claude-plugins (from: default)
↑ ci-cd-tools@pickled-claude-plugins v1.0.0 → v1.0.1 (outdated)

2 present, 1 outdated

Tip: Run `fettle update` to update outdated plugins.
     Run `fettle status --refresh` to check for newer versions.
```

**Symbols:**
- `✓` green - present and up-to-date
- `↑` yellow - present but outdated
- `✗` red - missing
- `?` dim - extra (not in config)

### Update Command

**Update all:**
```
Updating 2 outdated plugins...
  ✓ git@pickled-claude-plugins v2.0.0 → v2.1.0
  ✓ ci-cd-tools@pickled-claude-plugins v1.0.0 → v1.0.1

Updated 2 plugins. Restart Claude to apply changes.
```

**Specific plugin:**
```
  ✓ git@pickled-claude-plugins v2.0.0 → v2.1.0

Updated 1 plugin. Restart Claude to apply changes.
```

**Nothing to update:**
```
All plugins are up-to-date.
```

**Dry run:**
```
Would update 2 plugins:
  ↑ git@pickled-claude-plugins v2.0.0 → v2.1.0
  ↑ ci-cd-tools@pickled-claude-plugins v1.0.0 → v1.0.1
```

### Marketplace Refresh

```
fettle marketplace refresh
```
```
Refreshing marketplaces...
✓ Updated 4 marketplace(s)
```

## Error Handling

- Plugin not found: `Error: Plugin "foo@bar" not installed`
- Plugin up-to-date: `✓ git@pickled-claude-plugins is already up-to-date (v2.1.0)`

## Follow-up

- Shell autocompletion for commands and plugin names (Task #1)
