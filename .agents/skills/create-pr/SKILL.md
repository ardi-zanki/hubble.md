---
name: create-pr
description: Open a pull request for the current branch. Use whenever asked to make/create/open a PR. Fills the repo PR template and records a changelog entry first.
---

# Create a PR

Two things every PR here needs, in order:

## 1. Changelog entry

Run the `changelog` skill before or right after opening the PR (an entry
needs the PR number for its link, so: open PR, add entry with the link,
push). Skip only for internal-only churn the skill itself says to skip
(refactors, deps, CI, tests).

## 2. PR body from the template

Use `.github/pull_request_template.md` for the body. Do not freeform.

- **Description**: what the change does for the user, then notable
  implementation points. Link related issues; `Closes #N` when one exists,
  drop the placeholder line when none does.
- **Type of Change**: mark exactly one.
- **Testing**: only check boxes that are true. `Existing tests pass` means
  you ran them (`pnpm test` in the touched packages), not that CI probably
  will. Describe manual testing concretely; attach screenshots or note
  where a demo video will go.
- **Checklist**: same honesty rule. Don't check the "discussed in an issue"
  box unless there is an issue.

Then the usual mechanics: branch off main if not already, concise commit
messages, push, `gh pr create`.
