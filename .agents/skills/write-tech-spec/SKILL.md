---
name: write-tech-spec
description: Write a TECH.md spec for a significant Hubble feature after researching the monorepo architecture. Use when the user asks for a technical spec, implementation plan, architecture plan, or package/app/module breakdown tied to product behavior.
---

# write-tech-spec

Write a `TECH.md` spec for a significant Hubble feature.

## Overview

The tech spec translates product behavior into an implementation plan that fits this monorepo. It should identify affected apps, packages, module boundaries, data flow, validation, and sequencing so an agent can implement and reviewers can evaluate the plan.

Prefer a sibling `PRODUCT.md` first. Reference its numbered Behavior invariants instead of restating user-facing behavior.

Write specs to `specs/<id>/TECH.md`, where `<id>` matches the sibling product spec when present:

- a GitHub issue id, prefixed with `gh-` (for example `specs/gh-456/TECH.md`)
- a short kebab-case feature name (for example `specs/local-workspace-onboarding/TECH.md`)

`specs/` should contain only id-named directories as direct children.

Only create a GitHub issue when the user explicitly asks. This repo uses GitHub Issues on `bholmesdev/hubble.md` via `gh`; see `docs/agents/issue-tracker.md`.

## When To Use

Use for changes that span multiple modules, affect shared packages, change sync/workspace behavior, introduce new data flow, or need reviewable architecture. Skip or keep very short for single-file UI fixes.

## Research Before Writing

Read the product spec if it exists, then inspect the relevant code. Do not guess about architecture when the code can be inspected.

Always check:

- `CONTEXT.md` for domain terms.
- Relevant `docs/adr/*` for architectural constraints.
- Existing UI primitives and nearby feature implementations before proposing new components or patterns.
- Root `package.json` and `pnpm-workspace.yaml` when package/app commands or ownership matter.
- Affected app/package source under:
  - `apps/desktop`
  - `apps/www`
  - `packages/editor`
  - `packages/ui`
  - `packages/sync`
  - `packages/sync-backend`
  - `packages/convex-client`
  - `packages/cli`

Capture the current commit SHA with `git rev-parse HEAD`. When referencing code, prefer commit-pinned GitHub links to exact files/lines if the remote is available. If not, use local paths and line numbers.

## Structure

Required sections:

1. **Context** — what is being built, current architecture in the affected area, relevant domain terms, and key code references. Reference `PRODUCT.md` for behavior.
2. **Affected apps and packages** — list each touched app/package and why:
   - `apps/desktop`
   - `apps/www`
   - `packages/editor`
   - `packages/ui`
   - `packages/sync`
   - `packages/sync-backend`
   - `packages/convex-client`
   - `packages/cli`
   Include only relevant entries.
3. **Module architecture** — describe the proposed breakdown by module/file responsibility. Include new modules, changed modules, ownership boundaries, public APIs, and how data moves between them.
4. **Detailed plan** — concrete implementation steps, types/APIs/state introduced, migrations or config changes, UI primitives reused, and tradeoffs. Explain why the design fits Hubble's existing patterns.
5. **Testing and validation** — map important `PRODUCT.md` Behavior invariants to checks:
   - unit tests
   - integration tests
   - package/app-level tests
   - `pnpm check` for quick iteration
   - `pnpm build:desktop` before final confidence when relevant
   - manual desktop/web validation
   - Computer Use flows for UI verification, assuming the agent has access
6. **Parallelization** — decide whether sub-agents would help. If useful, define roles, owned files/packages, branches/worktrees, sequencing, and merge strategy. If not useful, say why briefly.

Optional sections:

- **End-to-end flow** — include when tracing across UI, editor, sync, backend, or CLI clarifies the design.
- **Diagram** — Mermaid only when it explains data flow or state transitions faster than prose.
- **Risks and mitigations** — real regressions, migration concerns, data loss risks, sync hazards, or rollout hazards.
- **Follow-ups** — deferred cleanup or later slices.

## Testing Guidance

Use repo-native commands:

- `pnpm check` for quick iteration.
- `pnpm build:desktop` for the full check: package builds, Biome, TypeScript, Vite, and Cargo check.

For web app validation, use the dev server with `?test=1` when appropriate. This bypasses connect/workspace-picker screens and requires `VITE_TEST_CONVEX_URL` and `VITE_TEST_WORKSPACE_ID` in `apps/www/.env.local`.

For Computer Use validation, describe specific observable flows, for example:

- open the desktop app
- create/open the relevant Workspace Folder, Plain Folder, or Loose File
- perform the feature flow
- verify visible state, focus, keyboard behavior, error state, and persistence
- repeat on web when the behavior is cross-surface

Do not hand-wave "manual test the UI." Name exact screens, actions, and expected visible results.

## Writing Guidance

- Ground the plan in actual code.
- Use project vocabulary from `CONTEXT.md`.
- Separate app/package impact from module architecture.
- Prefer concrete module boundaries over generic layers.
- Reuse existing design-system primitives and nearby UI patterns before proposing new primitives.
- Explain tradeoffs only where more than one approach is plausible.
- Keep product behavior in `PRODUCT.md`; keep implementation proof in `TECH.md`.
- Use logical CSS spacing props in frontend plans: `margin/padding` inline/block/start/end, not physical left/right/top/bottom.

## Keep Current

Update `TECH.md` in the same PR when implementation boundaries, sequencing, risks, or validation strategy changes. The checked-in spec should describe what ships.

## Related Skills

- `write-product-spec`
- `to-issues`
- `grill-with-docs`
