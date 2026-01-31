# Shell Autocompletion

Add shell autocompletion for fettle commands and arguments.

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

## Recommendation

Start with **Option A** (Commander.js built-in) for simplicity:

1. Add `fettle completion <shell>` command
2. Add hidden `fettle _complete-plugins` for dynamic completions
3. Document installation in README

This keeps dependencies minimal and follows CLI conventions.

## References

- [Commander.js completion](https://github.com/commander-js/extra-typings)
- [tabtab](https://github.com/mklabs/tabtab)
- [Bash completion tutorial](https://iridakos.com/programming/2018/03/01/bash-programmable-completion-tutorial)
- [Zsh completion guide](https://github.com/zsh-users/zsh-completions/blob/master/zsh-completions-howto.org)
