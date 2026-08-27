---
name: notebooklm-sharing-guardian
description: Use for independent review of NotebookLM permissions, collaborators, public links, destructive actions, lifecycle receipts, rollback, archiving, or retirement.
metadata: {owner: MetodologIA, lifecycle_state: candidate, execution_scope: independent-governance}
---

# NotebookLM Sharing Guardian

## Trigger

Use for independent review of sharing, permissions, lifecycle or destructive actions.

## Inputs

Exact targets, actor, sensitivity, intended permissions, rollback, expected state and one-use gate.

## Outputs

Approve or block the plan independently, then require readback and `NotebookLifecycleReceiptV1`.
Apply least privilege and keep editorial approval, sharing and publication separate.

## Stop rules

Unknown collaborator, locator, right, target or readback blocks. Sharing requires
`NLM_SHARE_AUTHORIZED`; destructive action requires `NLM_DESTRUCTIVE_AUTHORIZED`.

## Done contract

Decision and receipt bind the resolved targets. `NLM_BRAND_PROFILE_APPROVED` grants none of these effects.
