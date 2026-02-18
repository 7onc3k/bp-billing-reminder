# AGENTS.md — Dunning System (bp-billing-reminder)

## Project Overview

A standalone npm package implementing a dunning system (automated billing reminder workflow) as pure business logic. No infrastructure dependencies — returns action descriptors, never performs side effects.

**Spec:** See GitHub Issue #1 for full specification (Requirements + Architecture).

**Open issues:** #3 (business days), #4 (core state machine), #5 (payment + cancellation), #6 (pause/resume), #7 (manual advance + timeouts). Implement in order — each depends on the previous.

## Build & Test Commands

```bash
npm install           # install dependencies
npm run build         # tsc → dist/
npm run test          # vitest run
npm run test:coverage # vitest --coverage
npm run lint          # eslint .
npm run format:check  # prettier --check .
npm run typecheck     # tsc --noEmit
npx stryker run       # mutation testing (run after all tests pass)
```

## Architecture

**Pure logic package** — no I/O, no side effects, no runtime dependencies.

- TypeScript strict mode, ESM only (`"type": "module"`)
- Build: `tsc` (no bundler) → `dist/*.js` + `dist/*.d.ts`
- Node.js ≥ 18

**Directory layout:**

```
src/
  index.ts           — public API exports
  types.ts           — DunningState, DunningEvent, ActionDescriptor, etc.
  transition.ts      — transition(instance, event): TransitionResult
  create-instance.ts — createInstance(invoiceId, dueDate, config?)
  business-days.ts   — countBusinessDays(), addBusinessDays()
  config.ts          — default timeouts, DEFAULT_CONFIG
tests/
  transition.test.ts
  business-days.test.ts
  create-instance.test.ts
```

**Public API exports:** `transition`, `createInstance`, all types from `src/types.ts`.

## Code Style

- TypeScript strict mode — no `any`, no type assertions unless necessary
- ESLint + Prettier (configs already present)
- No runtime dependencies
- Functions return data, never perform side effects

## Git Workflow

**Branches:** `main` (protected) + `feat/<issue-number>-<desc>` / `fix/<issue-number>-<desc>`

**Commit format:**
```
<type>(<scope>): <description>

Refs #<issue-number>
```
Types: `feat`, `fix`, `test`, `chore`, `docs`, `refactor`

**PR process:** Open Draft PR immediately on first commit → iterate with CI → mark Ready when done. Regular merge (not squash) — preserves history for analysis.

**Transparency:** PR description explains what was implemented, which AC are covered, decisions made. Every PR references its issue.

## CI Pipeline

GitHub Actions (`.github/workflows/ci.yml`), runs on every PR push:

1. `tsc --noEmit` — typecheck
2. `eslint .` — lint
3. `prettier --check .` — format
4. `vitest run` — tests (100% coverage threshold enforced)
5. `tsc` — build
