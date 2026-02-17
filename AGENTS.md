# AGENTS.md — Dunning System (bp-billing-reminder)

## Project Overview

A standalone npm package implementing a dunning system (automated billing reminder workflow) as pure business logic. No infrastructure dependencies — returns action descriptors, never performs side effects.

**Spec:** See GitHub Issue #1 for full specification (Requirements + Architecture).

## Build & Test Commands

```bash
npm install          # install dependencies
npm run build        # tsc → dist/
npm run test         # vitest run
npm run test:watch   # vitest (watch mode)
npm run test:coverage # vitest --coverage
npm run lint         # eslint .
npm run format:check # prettier --check .
npm run typecheck    # tsc --noEmit
```

## Architecture

**Pure logic package** — no I/O, no side effects, no runtime dependencies.

- TypeScript strict mode, ESM only (`"type": "module"`)
- Build: `tsc` (no bundler)
- Output: `dist/*.js` + `dist/*.d.ts`
- Node.js ≥18

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

**Public API exports:**

- `transition(instance, event): TransitionResult | null`
- `createInstance(invoiceId, dueDate, config?): DunningInstance`
- All types (DunningState, DunningEvent, ActionDescriptor, DunningConfig, DunningInstance, TransitionResult)

## Git Workflow

### Branching

- `main` — protected, always deployable
- `feat/<issue-number>-<short-description>` — feature branches
- `fix/<issue-number>-<description>` — bug fixes

### Commit Messages (Conventional Commits)

```
<type>(<scope>): <description>

Refs #<issue-number>
```

- **type:** `feat`, `fix`, `test`, `chore`, `docs`, `refactor`
- **scope:** optional, module name (e.g., `state-machine`, `business-days`)
- **Refs #N:** always reference the issue for traceability
- Messages must tell a story — not just "add stuff" but explain what and why

### PR Process

1. Create branch from issue
2. **Open Draft PR immediately** — CI feedback loop + governance visibility from first commit
3. Push commits, iterate with CI feedback
4. When done → Mark as Ready → merge

- **PR title:** conventional commit format
- **PR body:** what was implemented, decisions made, which AC are covered, link to spec
- **Merge strategy:** regular merge (not squash) — preserves commit history for analysis
- **TDD is expected** — CI failing mid-work is normal, final state must pass

### Transparency

PRs serve as a **governance interface** — a human monitors progress, can intervene, and evaluates post-hoc.

- Document for the human, not for yourself
- PR description explains WHAT, WHY, what decisions were made, what's missing
- Every PR references its issue (`Refs #N` or `Closes #N`)

## Development Workflow

### Phase 0: Environment Setup

If the project is not yet initialized:

1. Initialize npm package (`package.json` with `"type": "module"`)
2. Configure TypeScript (strict mode, ES2022 target, Node16 resolution)
3. Configure ESLint (flat config + typescript-eslint strict) and Prettier
4. Configure Vitest (100% coverage thresholds) and Stryker (mutation testing)
5. Set up CI pipeline (`.github/workflows/ci.yml`): typecheck → lint → format → test → build
6. Create directory structure (`src/`, `tests/`)
7. Define domain types from spec in `src/types.ts`
8. Verify: `npm run build` and `npm run test` both pass (even if no tests yet)

If the project is already set up, skip to Phase 1.

### Phase 1: Spec Decomposition

1. Read the full specification (Issue #1)
2. Decompose into sub-issues by **AC groups + dependency graph**
3. Each sub-issue contains:
   - Scope (what this issue covers)
   - Relevant AC from spec (copy the Given/When/Then)
   - Files to create/modify
   - Dependencies (`Depends on: #N`)
4. Order follows dependency graph: types/utilities first → core logic → features building on top
5. Create all sub-issues before starting implementation

### Phase 2: Per-Issue Implementation (TDD cycle)

For each issue, in dependency order:

1. Create feature branch: `feat/<issue-number>-<short-description>`
2. Open Draft PR immediately (CI feedback from first commit)
3. **Write tests first** from acceptance criteria (red phase)
   - Each `describe` block maps to an AC category
   - Expected values come from AC, not from code observation
4. **Implement** to make tests pass (green phase)
5. **Refactor** if needed (keep tests green)
6. Run full test suite: `npm run test`
7. Run type check: `npm run typecheck`
8. Run lint: `npm run lint`
9. Commit with conventional message: `feat(<scope>): <description>` + `Refs #N`
10. Update issue with what was done (see Phase 4)
11. Mark PR as Ready when all CI checks pass

### Phase 3: When Stuck

If tests fail after 2 fix attempts and the root cause is not obvious:

1. **Stop** — do not burn tokens repeating the same approach
2. **Document** in the current issue: what you tried, what failed, error output
3. **Create a child fix issue** with:
   - Title: `fix(<scope>): <description of problem>`
   - Body: what was tried, what failed, relevant error output, current state
   - Label: `Depends on: parent issue`
4. End current session — a fresh session will pick up the child issue

**Limits:** Max 3 child fix issues per parent. After 3 failed attempts → mark parent as blocked, move on.

### Phase 4: Issue Documentation

After each session, update the issue with a comment:

- **What was done:** brief summary of implementation
- **Test results:** which tests pass/fail, coverage
- **Decisions:** any design decisions and rationale
- **Status:** done / in progress / blocked
- **Remaining:** what's left to do (if any)

This documentation serves the next agent session — write for someone with fresh context who needs to continue your work.

## Issue Decomposition

Spec (Issue #1) is decomposed into sub-issues by **AC groups + dependency graph**:

1. **Project setup** — types, package.json, tsconfig, CI (`chore`)
2. **Business days calculator** — AC group: Business days calculation (`feat`)
3. **Core state machine — happy path** — AC group: Time-based transitions (`feat`)
4. **Payment + cancellation** — AC groups: Payment, Terminal states, Cancellation (`feat`)
5. **Pause/resume** — AC group: Pause/Resume (`feat`)
6. **Manual advance + configurable timeouts** — AC groups: Manual advance, Configurable timeouts (`feat`)

Each sub-issue contains: relevant AC from spec, reference to parent spec #1, clear scope.

Order follows dependency graph: types/utilities first → core logic → features building on top.

## Code Style

- TypeScript strict mode — no `any`, no type assertions unless absolutely necessary
- ESLint flat config (`eslint.config.js`) with TypeScript plugin
- Prettier for formatting
- No runtime dependencies — pure logic only
- Functions return data, never perform side effects

## Testing

- **Framework:** Vitest
- **Files:** `*.test.ts` in `tests/` directory
- **TDD flow:** red → green → refactor
- **Coverage target:** 100% branch coverage
- **Mutation testing:** Stryker (validates test quality, not just coverage)
- **Test organization:** by AC groups from spec — each `describe` block maps to an AC category

```typescript
describe('Time-based transitions (happy path)', () => {
  it('ISSUED → DUE_SOON: 7bd before due date', () => { ... })
  it('DUE_SOON → OVERDUE: due date reached', () => { ... })
})
```

**Critical rules:**

- Tests verify behavior described in spec, not implementation details
- Expected values come from **acceptance criteria**, never from observing what code currently does
- Do not weaken tests to make them pass — fix the code instead
- A failing test is a signal to fix the code, not to adjust the test
- Write tests **before** implementation (TDD) — this prevents deriving expected values from buggy code
- Coverage is necessary but not sufficient — mutation score is the primary quality metric

## Quality Gates

**Before merge (must pass):**

1. CI green — typecheck + lint + prettier + tests + build
2. Coverage does not drop below threshold
3. PR references an issue (`Refs #N` / `Closes #N`)
4. PR description is complete
5. Package builds successfully (`tsc` → `dist/`)

**End of project (measured, not blocking):** 6. Mutation score (Stryker report) 7. Package is publish-ready (exports work, README exists)

## CI Pipeline

GitHub Actions (`.github/workflows/ci.yml`), runs on every push to a PR:

1. `tsc --noEmit` — type check
2. `eslint .` — lint
3. `prettier --check .` — format check
4. `vitest run` — tests
5. `tsc` — build (verify package builds)
