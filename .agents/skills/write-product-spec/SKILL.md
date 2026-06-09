---
name: write-product-spec
description: Write a PRODUCT.md spec for a significant Hubble user-facing feature, focused only on user experience and observable behavior. Use when the user asks for a product spec, UX spec, PRD, desired behavior doc, or wants feature behavior clarified before implementation.
---

# write-product-spec

Write a `PRODUCT.md` spec for a significant Hubble feature.

## Overview

The product spec captures what the user experiences. It should make desired behavior unambiguous enough that an agent can later write a technical plan and implementation without guessing product intent.

Stay out of implementation. Do not include internal types, state layout, data flow, package boundaries, module architecture, algorithms, migrations, or file paths. Those belong in the companion `TECH.md` from `write-tech-spec`.

"User" means the consumer of the surface:

- For app UX: the person using Hubble web or desktop.
- For CLI surfaces: the developer invoking `hubble`.
- For shared editor or sync behavior: the app/user-visible behavior callers can rely on, not the internals that produce it.

Write specs to `specs/<id>/PRODUCT.md`, where `<id>` is one of:

- a GitHub issue id, prefixed with `gh-` (for example `specs/gh-456/PRODUCT.md`)
- a short kebab-case feature name (for example `specs/local-workspace-onboarding/PRODUCT.md`)

`specs/` should contain only id-named directories as direct children. Use the sibling `TECH.md` path for the same id when one exists.

Only create a GitHub issue when the user explicitly asks. This repo uses GitHub Issues on `bholmesdev/hubble.md` via `gh`; see `docs/agents/issue-tracker.md`.

## Before Writing

Gather only enough context to write observable behavior:

- Directory id: GitHub issue id or kebab-case feature name.
- Target surface: `apps/desktop`, `apps/www`, CLI, editor, sync, or cross-surface.
- Target users and their goal.
- Existing user journey and desired user journey.
- Existing Hubble screens, flows, and design-system primitives that should shape the experience.
- Key states, edge cases, and user-visible failure modes.

Read `CONTEXT.md` and relevant ADRs when terminology matters. Use the project glossary: Workspace, Workspace Folder, Plain Folder, Loose File, Cloud Sync, Markdown File, Asset, Embed, Embed Bundle, Workspace Snapshot.

If the feature has UI or interaction design, inspect nearby Hubble screens and existing primitives before drafting Behavior. The spec should describe the intended user experience in terms of familiar app patterns and expected controls, without inventing a new visual system.

## Structure

Required sections:

1. **Summary** — 1-3 sentences describing the feature and desired outcome.
2. **Behavior** — the core of the spec: numbered, testable, user-perspective invariants.

Optional sections:

- **Problem** — only when motivation is not obvious from Summary.
- **Goals / Non-goals** — only when scope is ambiguous.
- **Design context** — include only when existing screens, components, or flows are important references.
- **UX validation** — include when a Computer Use walkthrough would clarify how to verify the experience.
- **Open questions** — prefer inline `**Open question:** ...`; collect only if there are several.

Do not include implementation, module breakdown, package/app impact, engineering validation, or success criteria. `TECH.md` owns technical testing. `PRODUCT.md` may include a UX-only Computer Use validation outline: screens to open, user actions to perform, and visible outcomes to confirm.

## Behavior Section

Behavior is the spec. It should describe the user experience completely enough that `TECH.md` can reference its numbered invariants.

Cover, as relevant:

- Default behavior and happy path.
- Every user-visible state and transition.
- Inputs the user can provide and responses they see.
- Existing design-system primitives the user should experience: dialogs, menus, buttons, lists, editor controls, toasts, empty states, and comparable Hubble patterns.
- Empty, loading, pending, offline, permission, error, timeout, and cancellation states.
- Cross-surface differences between desktop and web.
- Workspace states: Workspace Folder, Plain Folder, Loose File, local-only Workspace, synced Workspace.
- Races or concurrent user actions that affect what the user sees.
- Accessibility, keyboard, focus, and reduced-motion expectations.
- Invariants that must not regress.

Write concrete observable behavior, not aspirations.

## Length Heuristic

- Trivial fix or narrow UI copy tweak: no spec.
- Small feature: ~30-60 lines.
- Medium cross-module feature: ~80-150 lines.
- Large behavior-rich feature: longer is fine when Behavior carries the length.

Keep framing thin. If the same idea appears in Summary, Problem, Goals, and Behavior, collapse the framing.

## UX Validation

When useful, include a short `## UX validation` section focused only on observable experience. Assume the agent has Computer Use access.

Good entries name:

- the app surface to open: desktop or web
- the Workspace state to use: Workspace Folder, Plain Folder, Loose File, local-only Workspace, or synced Workspace
- the exact user actions
- the visible result, focus behavior, keyboard behavior, persistence, or error state to confirm

Do not include unit tests, package commands, implementation probes, or module-level validation here. The companion `TECH.md` maps Behavior invariants to technical tests and full validation.

## Keep Current

Update `PRODUCT.md` in the same PR when shipped behavior changes. The checked-in spec should describe what ships.

## Related Skills

- `write-tech-spec`
- `to-issues`
- `grill-with-docs`
