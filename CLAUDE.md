# Fitout

Context-aware plugin manager for Claude Code.

## Progress Docs

Progress documents are stored in `docs/progress/` with timestamped filenames:

```
docs/progress/YYYYMMDDhhmm-<title>.md
```

Example: `docs/progress/202601301230-mvp-complete.md`

Write a progress doc when completing a significant milestone or ending a session.

## Commands

```bash
npm run dev -- status      # Run status command in dev mode
npm run dev -- install     # Run install command in dev mode
npm run dev                # Run install (default command)
npm test                   # Run tests
npm run build              # Build to dist/
```

## Architecture

- `src/cli.ts` - Entry point
- `src/context.ts` - Find config, resolve project root
- `src/config.ts` - Parse TOML
- `src/claude.ts` - Shell out to Claude CLI
- `src/diff.ts` - Compare desired vs actual
- `src/status.ts` - Status command
- `src/install.ts` - Install command

## Config

Project config lives at `.claude/fitout.toml`:

```toml
plugins = [
  "plugin-name@registry",
]
```
