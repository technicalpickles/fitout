# Shell Autocompletion

**Status: Implemented**

Shell autocompletion for fettle commands and arguments using `@pnpm/tabtab`.

## What to Complete

### Commands
- `fettle status`
- `fettle apply`
- `fettle update`
- `fettle marketplace refresh`
- `fettle init`

### Flags
- `--refresh` for status and update
- `--dry-run` for apply and update
- `--hook` for apply
- `-y/--yes` and `--hook-only` for init

### Dynamic Completions
- `fettle update <plugin>` - Complete with installed plugin IDs from current project
- Could also complete marketplace names for future `fettle marketplace` subcommands

## Implementation Options

### Option A: Commander.js Built-in (Recommended)

Commander has built-in completion support via `@commander-js/extra-typings` or manual setup.

```typescript
import { program } from 'commander';

// Generate completion script
program
  .command('completion')
  .description('Generate shell completion script')
  .argument('<shell>', 'Shell type: bash, zsh, fish')
  .action((shell) => {
    // Output completion script for the specified shell
  });
```

Users would run:
```bash
# Bash
fettle completion bash >> ~/.bashrc

# Zsh
fettle completion zsh >> ~/.zshrc

# Fish
fettle completion fish > ~/.config/fish/completions/fettle.fish
```

### Option B: tabtab Package

The `tabtab` npm package provides cross-shell completion:

```typescript
import tabtab from 'tabtab';

tabtab.install({
  name: 'fettle',
  completer: 'fettle',
});
```

### Option C: Manual Completion Scripts

Write shell-specific completion scripts:

**Bash** (`fettle-completion.bash`):
```bash
_fettle_completions() {
  local cur="${COMP_WORDS[COMP_CWORD]}"
  local prev="${COMP_WORDS[COMP_CWORD-1]}"

  case "$prev" in
    fettle)
      COMPREPLY=($(compgen -W "status apply update marketplace init" -- "$cur"))
      ;;
    update)
      # Dynamic: list installed plugins
      local plugins=$(fettle _complete-plugins 2>/dev/null)
      COMPREPLY=($(compgen -W "$plugins --refresh --dry-run" -- "$cur"))
      ;;
    marketplace)
      COMPREPLY=($(compgen -W "refresh" -- "$cur"))
      ;;
  esac
}
complete -F _fettle_completions fettle
```

## Dynamic Plugin Completion

For `fettle update <plugin>`, we need to complete with installed plugin IDs.

Add a hidden command for completion scripts to call:

```typescript
program
  .command('_complete-plugins', { hidden: true })
  .action(() => {
    const projectRoot = resolveProjectRoot(process.cwd());
    const installed = listPlugins();
    const local = installed
      .filter(p => p.scope === 'local' && p.projectPath === projectRoot)
      .map(p => p.id);
    console.log(local.join('\n'));
  });
```

## Implementation

Used **@pnpm/tabtab** (maintained fork of tabtab by pnpm team):

```bash
# Install completions (prompts for shell if not specified)
fettle completion install [bash|zsh|fish|pwsh]

# Remove completions
fettle completion uninstall
```

### Files

- `src/completion.ts` - Completion logic and tabtab integration
- `src/completion.test.ts` - Tests

### How It Works

1. At CLI startup, `handleCompletion()` checks if we're in completion mode via `tabtab.parseEnv()`
2. If completing, returns appropriate completions based on context (commands, flags, subcommands, plugin IDs)
3. Users install completions via `fettle completion install` which adds sourcing to shell config

### Dynamic Completions

Plugin IDs for `fettle update <plugin>` shows only outdated plugins (compares installed versions against marketplace data). Falls back to all installed plugins if marketplace data isn't cached.

## References

- [@pnpm/tabtab](https://github.com/pnpm/tabtab) - Maintained fork used in this implementation
- [tabtab](https://github.com/mklabs/tabtab) - Original package
- [Bash completion tutorial](https://iridakos.com/programming/2018/03/01/bash-programmable-completion-tutorial)
- [Zsh completion guide](https://github.com/zsh-users/zsh-completions/blob/master/zsh-completions-howto.org)
