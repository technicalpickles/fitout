# User Experience Iteration Feedback

Captured from hands-on usage session.

## Command Structure

### Default Command
- `fettle` without arguments should run `fettle install` (equivalent to current `apply`)
- Goal: match mental model from tools like Bundler (`bundle` runs `bundle install`)

### Command Renaming
- Rename `apply` → `install`
- Keep `fettle update` for handling outdated plugins

## Init Command Issues

### Current Problems
1. Does two things: system-level setup AND local fettle.toml creation
2. Seems to override global stuff even when already set up
3. Asks "do you want to create project config?" when one already exists
4. No color treatment

### Desired Behavior
Split into phases with checks:

1. **Pre-check**: Is it set up globally? If not, prompt to set up
2. **Default profile**: Check for default profile, ask to create if missing
3. **Project config**: If running interactively and project config exists, say "already initialized"
4. **Preview mode**: Before creating `.claude/fettle.toml`, show preview of contents (indented)

Should be idempotent - do nothing if already set up.

## Apply/Install Command

### Context Display
- Currently shows "Context: /path/to/directory"
- Remove unless different from current working directory
- Substitute `$HOME` with `~` for cleaner display

### Otherwise
Looks okay, just needs the rename.

## Usage/Help
- Add color treatment to make things stand out
- Use status command as reference for styling

## Status Command

### What's Good
- Little icons
- Dim text for less important info
- Reused colors for profile names
- Good example to follow for other commands

### Improvements to Consider
1. **Table/columnar view**: Show plugin, source, profile in columns for better scanability
2. **JSON output**: Add `--json` flag for scripting
3. **Check mode**: Like `bundle check` - exit non-zero if something needs to be installed (could be separate command or flag)

## Marketplace Configuration

### Problem
Global config should include list of marketplaces to ensure they get set up. Without this, hitting a new marketplace (like `pickled-claude-plugins`) has no path forward.

### Desired Behavior
1. Global config maps expected marketplaces
2. `fettle install` on new machine should:
   - First ensure marketplaces exist
   - Then set up plugins from them
   - Finally install plugins
3. Should work out of the box without secondary steps

## Shell Completions

### Issues Found
1. Wants to install to global fish config instead of completions directory
2. Ctrl+C during completion install throws error about readline being closed
   - Should handle gracefully as normal operation

## Development/Testing Challenges

### Problem
Fettle rewrites itself when testing, interfering with development environment.

### Needs
- Sandbox approach for testing
- Automated tests that don't interfere with real config
- Maybe a sandbox command/helper

## Update Command

### Open Questions
- Where do Claude plugin files actually end up when installed?
- Consider lock file concept (like Bundler, npm) for reproducibility
- For now, assume latest is desired
