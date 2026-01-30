# CLI Color Design

Add color to fettle's CLI output for faster scanning, visual hierarchy, and a friendly personality.

## Goals

1. **Faster scanning** - Quickly spot problems (missing/failed) vs successes
2. **Visual hierarchy** - Distinguish headers, content, and secondary info
3. **Personality** - Friendly & approachable, like npm/yarn install progress

## Color Palette

### Semantic Colors (status)

| Meaning | Color | Used For |
|---------|-------|----------|
| Success/Present | Green | `✓` symbol, "present" count |
| Missing/Failed | Red | `✗` symbol, "missing" count, errors |
| Attention/Extra | Yellow | `?` symbol, "extra" count |
| Action/Change | Cyan | `+` symbol for installs |

### Structural Colors (hierarchy)

| Element | Color | Purpose |
|---------|-------|---------|
| Headers | Bold white | `Context:`, `Installed:`, `Failed:` |
| Plugin names | Default/white | Primary content |
| Provenance | Dim + source color | `(from: default)` etc |

### Provenance Source Colors

Dim versions to be subtle but scannable by source:

| Source | Color |
|--------|-------|
| default | Dim blue |
| project | Dim magenta |
| Other profiles | Dim cyan |

## Output Examples

### `fettle status` (mixed state)

```
Context: /Users/josh/workspace/fettle        [bold white header]

✓ ci-cd-tools@pickled-claude-plugins (from: default)    [green ✓, dim blue provenance]
✓ git@pickled-claude-plugins (from: default)            [green ✓, dim blue provenance]
✓ superpowers@superpowers-marketplace (from: project)   [green ✓, dim magenta provenance]
✗ my-plugin@registry (from: project) (missing)          [red ✗, red "missing"]
? old-plugin@registry (not in config)                   [yellow ?, yellow "not in config"]

3 present, 1 missing, 1 extra                           [green/red/yellow counts]
```

### `fettle apply` (installs)

```
Context: /Users/josh/workspace/fettle        [bold white]

Installed:                                   [bold white]
  + my-plugin@registry                       [cyan +]
  + another-plugin@registry                  [cyan +]

Failed:                                      [bold white]
  ✗ broken-plugin@registry - Connection refused   [red ✗, dim error]

2 plugins installed, 1 failed                [cyan/red counts]
```

## Implementation

### Library

Use **chalk** for coloring:
- Auto-detects color support (CI, pipes, `NO_COLOR`)
- Chainable API
- Industry standard

```bash
npm install chalk
```

### Code Structure

Create `src/colors.ts`:

```typescript
import chalk from 'chalk';

export const colors = {
  // Semantic
  success: chalk.green,
  error: chalk.red,
  warning: chalk.yellow,
  action: chalk.cyan,

  // Structural
  header: chalk.bold.white,
  dim: chalk.dim,

  // Provenance
  sourceDefault: chalk.dim.blue,
  sourceProject: chalk.dim.magenta,
  sourceOther: chalk.dim.cyan,
};

export const symbols = {
  present: colors.success('✓'),
  missing: colors.error('✗'),
  extra: colors.warning('?'),
  install: colors.action('+'),
};
```

### Files to Update

1. `src/colors.ts` - New file with color definitions
2. `src/status.ts` - Use colors in `formatStatusResolved()`
3. `src/apply.ts` - Use colors in `formatApplyResult()`
4. `src/cli.ts` - Use colors in init command output

### Hook Mode

Keep `--hook` output plain text (no ANSI) since Claude reads it, not humans.

## Future Considerations

### `fettle add` command

When showing extra plugins, hint at the fix:
```
? old-plugin@registry (not in config) — run: fettle add old-plugin@registry
```

### Celebratory messaging

Could add friendly messages when everything is clean:
```
✓ All 8 plugins present. You're in good fettle!
```

Not in scope for this work but worth considering.

## Summary

| Change | File |
|--------|------|
| Add chalk dependency | package.json |
| Create color module | src/colors.ts |
| Colorize status output | src/status.ts |
| Colorize apply output | src/apply.ts |
| Colorize init output | src/cli.ts |
