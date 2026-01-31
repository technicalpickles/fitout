# Fettle CLI Design System

Visual language and color conventions for fettle's terminal output.

## Personality

**Friendly & approachable** - like npm/yarn install progress. Warm, encouraging, celebrates success states.

## Color Palette

### Semantic Colors

Colors that convey meaning about state or action.

| Color | Meaning | Use Cases |
|-------|---------|-----------|
| Green | Success, present, good state | `✓` symbol, "present" counts, "All N plugins present" |
| Red | Error, missing, failure | `✗` symbol, "missing" counts, error messages |
| Yellow | Attention, warning, unknown | `?` symbol, "extra" counts, gentle warnings |
| Cyan | Action, change, new | `+` symbol, install counts |

### Structural Colors

Colors that create visual hierarchy.

| Color | Purpose | Use Cases |
|-------|---------|-----------|
| Bold white | Headers, section landmarks | `Context:`, `Installed:`, `Failed:`, `Next steps:` |
| Dim | Secondary information | Error details, parenthetical notes |

### Provenance Colors

Dimmed colors to indicate where a plugin configuration came from.

| Source | Color | Example |
|--------|-------|---------|
| default | Dim blue | `(from: default)` |
| project | Dim magenta | `(from: project)` |
| Other profiles | Dim cyan | `(from: work)` |

## Symbols

| Symbol | Color | Meaning |
|--------|-------|---------|
| `✓` | Green | Present, success, complete |
| `✗` | Red | Missing, failed, error |
| `?` | Yellow | Extra, unknown, needs attention |
| `+` | Cyan | Installing, adding, action |

## Output Patterns

### Headers

Use bold white for structural headers that help users scan output:

```
Context: /path/to/project
```

```
Installed:
  + plugin-name
```

### Status Lists

Each line starts with a colored symbol, followed by the item, then dimmed metadata:

```
✓ plugin-name@registry (from: default)
✗ missing-plugin@registry (from: project) (missing)
? unknown-plugin@registry (not in config)
```

### Summaries

Color-echo the categories from the list above:

```
8 present, 1 missing, 2 extra
[green]    [red]      [yellow]
```

### Success States

Celebrate when everything is good:

```
✓ All 8 plugins present
[green symbol + green text]
```

### Action Feedback

Show what changed with cyan:

```
Installed:
  + new-plugin@registry
  + another-plugin@registry

2 plugins installed
[cyan]
```

### Error States

Red for failures, dim for details:

```
Failed:
  ✗ bad-plugin@registry - Connection refused
                          [dim]
1 failed
[red]
```

## Implementation

Colors are centralized in `src/colors.ts`:

```typescript
import { colors, symbols, provenanceColor } from './colors.js';

// Semantic colors
colors.success('text')   // green
colors.error('text')     // red
colors.warning('text')   // yellow
colors.action('text')    // cyan

// Structural colors
colors.header('text')    // bold white
colors.dim('text')       // dim

// Pre-colored symbols
symbols.present          // green ✓
symbols.missing          // red ✗
symbols.extra            // yellow ?
symbols.install          // cyan +

// Provenance (returns a color function)
provenanceColor('default')('(from: default)')  // dim blue
provenanceColor('project')('(from: project)')  // dim magenta
```

## Plain Text Contexts

Some contexts should remain uncolored:

- **Hook mode (`--hook`)**: Output is read by Claude, not humans
- **Piped output**: Chalk auto-detects and strips colors
- **`NO_COLOR` env var**: Chalk respects this standard

## Future Considerations

### Hints for Resolution

When showing problems, hint at the fix:

```
? old-plugin@registry (not in config) — run: fettle add old-plugin
                                        [dim]
```

### Progress Indicators

For longer operations, consider spinners or progress bars (not yet implemented).
