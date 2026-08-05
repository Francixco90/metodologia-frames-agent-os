# Approvals — REMOTION-VS001

## Estado fail-closed

- `no_approval_receipt_present`
- Governed workflow state: `BLOCKED_BEFORE_SOURCE_LOCK`.
- Visible artifact status: `RENDERED_DRAFT · LOCAL TEST ONLY`.
- Technical media evidence, if present, has no effect on the governed workflow.
- No committee approval for `REGISTRY_APPROVED` or `REVIEW_SHOTS_APPROVED`.
- No independent Guardian receipt.
- No H01 human playback approval.
- `READY` is not authorized; neither are release or publication.

This directory is an approval boundary, not proof that approval occurred. A receipt may be added only
by the authorized approver after reviewing the exact artifact version and hash. [CONFIG]

## Required Markdown receipt contract

Copy the template below into a new receipt only after a real decision. Replace every placeholder;
unresolved placeholders make the receipt invalid.

```markdown
---
artifact_id: REMOTION-VS001
artifact_version: '<exact-version>'
artifact_sha256: '<64-lowercase-hex>'
decision: '<approve|revise|reject>'
approver_actor_id: '<authorized-actor-id>'
approver_role: '<committee|guardian|human>'
decided_at: '<RFC3339 timestamp>'
conditions:
  - '<condition or explicit none>'
risks_accepted:
  - '<risk or explicit none>'
next_state: '<direct governed next state or NO_STATE_CHANGE>'
---

# Approval decision

Evidence reviewed:

- `<portable relative evidence path + SHA-256>`

Decision rationale:

`<bounded rationale tied to the reviewed version and hash>`
```

Producer and approver must be different actors. An approval for another hash, a blank template, an
AI-generated placeholder or an absent full-video review cannot advance state. [CONFIG]
