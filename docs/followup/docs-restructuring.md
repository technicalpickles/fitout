# Docs Restructuring

## Current Issues

- Inconsistent naming: `followup/` vs `followups/`
- Mixed concerns: plans, progress, design, feedback all at same level

## Options

### Option A: Consolidate under `docs/internal/`

```
docs/
  internal/
    plans/
    progress/
    followup/
    design/
    feedback/
```

Pros: Clear separation between internal dev docs and user-facing docs
Cons: Deeply nested

### Option B: ADR-style

```
docs/
  adr/           # Architecture Decision Records (was plans/)
  dev/           # Progress, feedback, followup
```

Pros: Industry-standard pattern
Cons: Loses some structure

### Option C: Minimal cleanup

- Rename `followups/` to `followup/` (consolidate)
- Keep rest as-is

Pros: Minimal change
Cons: Still a bit scattered

## Recommendation

Start with Option C (minimal cleanup), consider Option A if docs grow significantly.
