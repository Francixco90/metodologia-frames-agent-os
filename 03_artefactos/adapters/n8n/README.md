# n8n adapter

The adapter remains inert and dry-run only. Version 2 requires every artifact,
render receipt, input, asset manifest, canonical `H01` human approval and policy to resolve
through an injected evidence reader and match its declared SHA-256 before a
proposal can be accepted. The approval must bind the same artifact and render
receipt and must be a real `H01 / human → HUMAN_APPROVED` decision.

The default reader resolves nothing, so callers must inject either an
in-memory fixture reader or the repository-scoped reader explicitly before any
package can be accepted. Missing evidence, hash drift, malformed policies and
forged approvals fail closed.

This adapter validates and proposes an already approved, hash-bound render package. It does not interpret a brief, edit copy, choose a composition, access credentials, activate a workflow or publish.

Safety defaults:

- `dryRun` must be `true`.
- `approvalState` must be `HUMAN_APPROVED`.
- all material inputs and the approval receipt are hash-bound;
- idempotency replay re-resolves all evidence before returning the prior result;
- a reused key with different content fails;
- the provided workflow is inactive and has no credentials or network nodes.
