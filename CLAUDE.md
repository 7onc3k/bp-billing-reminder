# CLAUDE.md — Reference Implementation

## Goal
Human expert baseline for the dunning system. This is the quality ceiling
against which all 6 experiment runs (R0-R5) will be compared.

Primary outputs:
1. **Behavioral test suite** — portable tests from AC, usable across all runs
2. **Working implementation** — validates the spec is implementable
3. **Mutation score benchmark** — Stryker baseline for test quality comparison

## Workflow
1. Read Issue #1 completely before touching code
2. Write ALL behavioral tests from AC — they must fail first (red)
3. Design types and interfaces
4. Implement until green
5. Run Stryker — record mutation score as benchmark

## Package API (must match spec)
Tests and implementation must use this API — it's the portable contract:

```typescript
process(state, event, now) → { state, actions }
```

Events: `tick`, `payment_received`, `invoice_cancelled`, `dunning_paused`, `dunning_resumed`, `manual_advance`

## Constraints (same as experiment runs)
- Commit as you progress
- No history rewriting (no amend, squash, rebase, force-push)
- No planning or tracking .md files in the repo
