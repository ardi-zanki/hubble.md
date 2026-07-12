---
name: request-pr-review
description: Request an automated review of the current pull request, address valid feedback, and repeat until approval. Use after opening a PR and before handing it to a human reviewer.
---

# Request a PR review

Push the current changes, then wait for the `Review Pull Requests` GitHub Actions workflow for the current HEAD. Use `gh` to read its review.

Address valid feedback, run relevant checks, commit, and push. Wait for the next review and repeat until approved.

Do not accept feedback blindly. If the reviewer is wrong or the same concern repeats, explain the disagreement and stop for human judgment. Stop after three review rounds.
