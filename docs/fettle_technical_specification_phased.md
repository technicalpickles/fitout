# Fettle – Technical Specification

> **Fettle**: a context-aware environment and plugin manager that ensures the *actual runtime state* of a tool matches the expected configuration.

This document describes a **phased technical design** so Fettle can be useful immediately, even with hard-coded assumptions, and evolve toward a more general, extensible system.

---

## 1. Goals & Non‑Goals

### Goals
- Make plugin state predictable and visible
- Eliminate mismatch between config files and runtime reality
- Support multiple scopes (global, project, worktree)
- Be runnable with zero install friction (`npx`, `uvx`, etc.)
- Allow incremental implementation without blocking usability

### Non‑Goals (for now)
- Perfect abstraction across all tools
- Fully declarative, tool-agnostic schemas in v1
- Sophisticated dependency resolution between plugins

---

## 2. Mental Model

Fettle answers three questions:
1. **Where am I?** (context detection)
2. **What should be true here?** (desired state)
3. **Is it actually true?** (runtime validation)

Then it optionally fixes the gap.

---

## 3. Core Concepts

### Context
A context is derived from:
- Current working directory
- Git repository root (if present)
- Git worktree (if present)

Contexts resolve configuration in this order:
1. Worktree config
2. Repo config
3. Global config

### Profile
A profile defines a desired plugin state:
- Plugins required
- Installation scope (global / local)
- Optional notes or grouping

---

## 4. Configuration

### File Format
- **TOML**
- Supports comments
- Parsed into plain objects, then validated

### File Names
- `fettle.toml` (repo / worktree)
- `~/.config/fettle/config.toml` (global)

### Minimal v0 Schema (hard‑coded)
```toml
[tool]
name = "claude"  # hard-coded in v0

[plugins]
required = [
  "skills",
  "filesystem"
]

[plugins.install]
default_scope = "global"
```

> Validation in early phases is manual and forgiving.

---

## 5. CLI Design

### Implementation Choice
- **Language**: Node.js
- **Distribution**: npm
- **Execution**: `npx fettle`

Rationale:
- Zero-install execution via NPX
- Strong CLI ecosystem for CLIs
- Fast iteration and simple packaging


### Base Command

### Base Command
```sh
fettle <command> [options]
```

### Initial Commands (v0)

#### `fettle apply`
- Resolve context
- Load config
- Inspect runtime state
- Install missing plugins
- Enable where possible

#### `fettle status`
- Show desired vs actual state
- No mutations

#### `fettle doctor`
- Deep validation and diagnostic mode
- Verifies that plugins are **loaded and usable at runtime**, not merely installed
- May launch the tool and interact with it to confirm:
  - Plugin presence
  - Plugin activation
  - Command or capability availability
- Designed to catch subtle failure modes (e.g. installed but not exposed)
- Produces actionable diagnostics and suggested remediation

Doctor is explicitly allowed to be slower and more invasive than other commands.


---

## 6. Runtime Inspection

### Philosophy
- Runtime is authoritative
- Files are advisory

### Strategy (Initial)
- Launch tool in managed session (e.g. tmux)
- Wait for readiness signal
- Execute introspection commands
- Capture stdout
- Parse with regex / heuristics

> This is intentionally scrappy in early phases.

---

## 7. Architecture Overview

```
CLI
 ├─ Context Resolver
 ├─ Config Loader
 ├─ Validator
 ├─ Planner
 └─ Executor
```

### Key Modules
- **Context Resolver**: Git + filesystem detection
- **Config Loader**: TOML parsing + merge
- **Validator**: desired vs actual
- **Planner**: compute actions
- **Executor**: perform installs / enables

---

## 8. Phased Implementation Plan

### Phase 0 – Useful Immediately
**Goal**: Solve your personal pain fast.

- Single supported tool (hard-coded)
- One config file location
- Regex-based parsing
- Minimal schema validation
- Manual recovery acceptable

> Expected outcome: daily usable.

---

### Phase 1 – Less Fragile
- Proper context resolution
- Multiple config layers
- Clear error messages
- Dry-run support (`--check`)

---

### Phase 2 – Extensible Core
- Tool adapters (interface-based)
- Declarative schema validation
- Plugin metadata
- Better output formatting

---

### Phase 3 – Embedded Self‑Check
- Optional helper plugin / agent installed in the target tool
- Agent reports its own loaded capabilities and plugin state
- `fettle doctor` can query the agent directly to confirm:
  - Plugin presence
  - Plugin activation
  - Plugin functionality
- Startup validation signal inside the tool UI (configured / misconfigured)
- Optional in-tool remediation command

---

## 9. Distribution

### Target
- `npx fettle`
- `uvx fettle`

### Constraints
- Fast startup
- No global install required
- Minimal runtime dependencies

---

## 10. UX Principles

- Loud when broken
- Quiet when correct
- Clear next steps
- No false confidence

---

## 11. Open Design Questions

- What failures should block execution?
- Should extra plugins be errors or warnings?
- How strict should version pinning be?
- When does config auto‑generation make sense?

---

## 12. Success Criteria

You can:
- Run `fettle apply` in any repo or worktree
- Immediately know whether things are correct
- Fix misconfiguration without spelunking
- Trust that "configured" actually means configured

