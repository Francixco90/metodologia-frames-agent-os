---
template_only: true
approval_receipt_present: false
artifact_id: REMOTION-VS001
artifact_version: '<exact-version>'
artifact_sha256: '<64-lowercase-hex>'
decision: NOT_ISSUED
approver_actor_id: '<authorized-actor-id>'
approver_role: '<committee|guardian|human>'
decided_at: '<RFC3339 timestamp>'
conditions:
  - '<condition or explicit none>'
risks_accepted:
  - '<risk or explicit none>'
next_state: NO_STATE_CHANGE
---

# Approval decision template

This file is not an approval receipt and grants no state transition. Copy it only after a real,
authorized review of the exact artifact version and hash.

## Evidence reviewed

- `<portable relative evidence path + SHA-256>`

## Decision rationale

`<bounded rationale tied to the reviewed version and hash>`
