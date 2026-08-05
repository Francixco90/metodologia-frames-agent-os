# Formal execution scope

## Authority and source of truth

- Current user instruction: execute the approved orchestration plan.
- Governing requirements: `docs/program/requirements-traceability.md`.
- Product requirements: Prompt Maestro V6, SHA-256
  `19803669c1ae8dacf62af64936060235cb7d15b870c7f0abc23962159be5bde2`.
- Technical authorities: exact package metadata, current Remotion documentation and runtime license.
- Material claims must resolve to a source registry entry and claims ledger row.

## In scope

1. An isolated, self-contained local Git repository.
2. Shared inbox, registries, memory, evidence, approvals, receipts and state machines.
3. Web and Content/Motion networks over the same project dossier.
4. RT-01 through RT-11 contracts and a five-member creative committee.
5. Canonical `remotion-video-production` skill with lineage, rules, schemas, fixtures and tests.
6. A first-party synthetic vertical slice with an offline Web artifact and deterministic Remotion video.
7. A NotebookLM read-only adapter contract and an n8n dry-run transport adapter.
8. Unit, contract, integration, negative, visual, audiovisual, privacy, rights and Guardian evidence.
9. Human-ready release packet without publication.

## Out of scope

- Publishing, sending, deploying or activating an external integration.
- Writing to NotebookLM or importing/activating n8n workflows.
- Treating unavailable pasted texts as if they had been received.
- Redistributing video, screenshot, article or skill content without established rights.
- Declaring commercial Remotion eligibility without the operating legal entity.
- Declaring `READY`, `FINAL` or `PUBLISHED` from a render alone.
- Persisting private chain-of-thought, secrets, PII or private locators.

## Deliverables and acceptance

| Deliverable         | Acceptance evidence                                                                                              |
| ------------------- | ---------------------------------------------------------------------------------------------------------------- |
| Repository baseline | Clean Git history, exact lockfile, pinned toolchain, acyclic DAG and collision-free ownership.                   |
| Domain core         | Runtime schemas, guarded transitions, canonical hashes, append-only memory and negative tests.                   |
| Source system       | Candidate/quarantine/active states, dedupe, rights/authority gates and explicit `0/4` canonical-text gap.        |
| Agent system        | Eleven role contracts; producer, verifier, Guardian and H01 remain distinct.                                     |
| Skill Foundry       | Canonical skill passes local checks; external skill code remains reference-only while license is absent.         |
| Web slice           | Offline HTML, desktop/mobile screenshots, no overflow or console errors, claims visible.                         |
| Motion slice        | Schema-valid props, calculated metadata, local assets, smoke/full MP4, ffprobe and deterministic-frame evidence. |
| n8n adapter         | Dry-run package validates hashes, approval, idempotency, retry and kill-switch; no live mutation.                |
| Release packet      | Guardian verdict, accepted risks, residual gaps, exact state and human next action.                              |

## Expected edge-case behavior

- Missing source, rights or authority: quarantine the candidate; continue only with synthetic first-party fixtures.
- Unknown license: reference-only; block adoption and commercial release.
- Missing or mismatched hash: reject transition and transport.
- Committee with fewer than five valid proposals: block decision.
- Duplicate n8n idempotency key: return the existing receipt; never duplicate a job.
- Remote request during render: fail the renderer.
- Non-deterministic API or output mismatch: fail AV validation.
- PII, secret or local locator in a versionable file: fail privacy gate.
- Absent Guardian or H01 receipt: cap state below `READY`.

## Trade-offs

- Staging adds a promotion step but prevents host-worktree contamination.
- A synthetic slice proves architecture and rendering, not corpus completeness.
- Local system fonts improve portability and rights safety but reduce typographic uniqueness.
- Strict failure states slow apparent progress while preserving truthful readiness.
- Publication remains manual because rollback, rights and channel authority materially exceed build authorization.

## Completion boundary

The local implementation is complete when its reproducible gates pass and the target repository exists. Product readiness remains `PARTIAL_CONTROLLED` until the missing sources, rights, license eligibility, Guardian and H01 receipts are resolved. Publication requires a new, explicit authorization.
