# Context-Aware Plugin Manager (Working Title)

## Problem Statement
Managing plugins across different scopes (global, user, project, local, worktree) is painful and error‑prone. Configuration files often *look* correct but don’t reflect what’s actually installed or enabled at runtime. This mismatch leads to broken sessions, missing capabilities, and wasted time debugging.

The goal is a tool that:
- Ensures the *actual runtime state* matches expectations
- Makes switching contexts cheap and reliable
- Works across multiple tools (not hard‑coded to one)
- Requires minimal setup or environment assumptions

---

## Core Idea
A **context-aware environment manager** for plugin‑driven tools.

At a high level:
- You run a single command
- It determines the current context (global / project / worktree)
- It loads the appropriate configuration
- It audits the real runtime state (not just files)
- It installs/enables what’s missing
- It validates the final state and reports clearly

Optionally, part of this logic can live inside the target tool itself as a self‑check plugin.

---

## Key Concepts

### Contexts / Profiles
A *profile* defines:
- Which plugins should be installed
- Where they should be installed (global, local, etc.)
- Optional metadata (why, notes, grouping)

Profiles can exist at multiple levels:
- Global default
- Project root
- Worktree override

Resolution order:
1. Worktree config
2. Project config
3. Global config

---

## Validation Philosophy

**Files are advisory. Runtime is authoritative.**

Validation should:
- Query the tool itself for installed + enabled plugins
- Compare against the desired state
- Detect:
  - Missing plugins
  - Installed but disabled plugins
  - Unexpected extras (optional warning)

Validation modes:
- **Fast**: minimal checks, install missing items
- **Thorough**: full audit + confirmation of enablement

---

## Interactive Tool Challenges
Some tools are interactive and not easily scriptable.

Proposed approach:
- Launch the tool in a managed session (e.g. tmux)
- Wait for known readiness output
- Execute introspection commands (e.g. listing plugins)
- Capture and parse output

This allows:
- Verifying what’s actually available
- Avoiding reliance on filesystem inspection

---

## Optional Self‑Check Plugin

To avoid wrapper scripts everywhere:
- Provide a small plugin installed globally
- On startup:
  - Check whether the environment matches expectations
  - Display a clear status (configured / misconfigured)

Optional slash command:
- Trigger setup or validation from inside the tool

This makes misconfiguration visible immediately.

---

## CLI Design (Draft)

Examples inspired by env managers (nvm, virtualenv, etc.):

- `tool apply` – apply the current profile
- `tool validate` – audit and report
- `tool list` – show available profiles
- `tool status` – show current state vs desired

Design goals:
- Predictable
- Scriptable
- Minimal flags for common cases

---

## Configuration Format

Requirements:
- Human‑readable
- Supports comments
- Structured enough for validation

Leading candidate: **TOML**

Rationale:
- Clear structure
- Comment support
- Easy to deserialize
- Can be validated post‑parse with a schema layer

Schema validation happens *after* loading (against hashes / objects).

---

## Language & Distribution

Primary requirement:
- Runs without caring about local environment details

Target execution models:
- `npx <tool>`
- `uvx <tool>`

Viable options:
- **Node**: excellent CLI distribution via npm / npx
- **Python**: viable via uv + optional bundling (PEX)

Decision criteria:
- Fast iteration
- Low friction for users
- Clean CLI ergonomics

---

## Naming Direction

Constraints:
- Not tied to a single tool
- Slightly playful
- Suggests coordination / orchestration / setup

Not final — to be revisited after core behavior stabilizes.

---

## Open Questions / Next Steps

Implementation‑oriented questions:
- What is the minimum viable config schema?
- How strict should validation be by default?
- What failure modes should be fatal vs warnings?
- How easy is it to add support for a second tool?

UX questions:
- What does “success” look like in output?
- How noisy is too noisy?
- How do we make misconfiguration obvious but not annoying?

Once answered, move directly into:
- CLI skeleton
- Config loader + resolver
- Validation engine

