# Triage Labels

Every open issue should carry **exactly one** readiness label. Bug/feature templates pre-apply `needs-triage`; the `Triage New Issues` workflow also seeds `needs-triage` on open when no readiness label is present (blank issues, CLI/API creates, template misses). The triage agent then replaces that with a decision label when it can.

| Label                | Meaning                                                                             |
| -------------------- | ----------------------------------------------------------------------------------- |
| `needs-triage`       | Maintainer or triage agent needs to evaluate this issue                             |
| `ready-to-implement` | Behavior and scope are clear; anyone (contributor or agent) can pick this up        |
| `needs-discussion`   | Open product or technical questions; discuss on the issue before implementing       |
| `wontfix`            | Will not be actioned (human-applied)                                                |

Use `ready-to-implement` when the issue is clearly outlined and implementation can start without further product decisions.

Use `needs-discussion` for everything else: ambiguity, open design decisions, or uncertain fit. The triage comment should leave concrete clarifying questions so the discussion can start immediately.

Other labels (`bug`, `enhancement`, priority, etc.) are orthogonal and may coexist with a readiness label. Do not leave an open issue with only non-readiness labels.

Older labels (`ready-for-spec`, `ready-for-agent`, `needs-info`, `wait-to-implement`) are retired from the triage flow; `ready-for-spec` was renamed to `needs-discussion` and `ready-for-agent` to `ready-to-implement`.
