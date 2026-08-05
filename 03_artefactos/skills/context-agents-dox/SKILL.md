---
name: context-agents-dox
description: This skill should be used when the user wants to document, profile, or maintain a registry of available agents and their capabilities, roles, and boundaries.
version: 0.1.0
license: LicenseRef-MetodologIA-Internal
metadata:
  owner: MetodologIA
  lifecycle_state: active
  execution_scope: local-evaluation
  model_agnostic: true
---

# context-agents-dox

Use this skill whenever the operator needs to inventory the agents that participate in a MetodologIA engagement, capture what each one can do, where its authority starts and stops, and keep that registry truthful as the team evolves. It is the homologue of the open-source `agents-dox` skill, re-expressed in MetodologIA voice for local evaluation only.

## When to trigger

- The operator asks to list, profile, or document the agents available in a repo or engagement.
- A new agent joins the committee and its role, capabilities, and boundaries must be recorded.
- An existing agent changes scope, ownership, or boundaries and the registry needs a refresh.
- The operator wants a single source of truth for who can touch what, so parallel edits do not drift.

Do not trigger for generic codebase documentation, memory capture, or contract authoring. Those belong to sibling skills. Err toward trigger when agent boundaries are in question; mark `coverage_gap` instead of guessing a boundary.

## What it captures

The registry is an agent inventory organized around four durable facets:

1. **Identity** — agent name, owning plugin or workspace, lifecycle state, model affinity.
2. **Capabilities** — what the agent can produce: analysis, drafting, validation, orchestration, review.
3. **Boundaries** — the allowlist of paths it may write, the tools it may call, and the explicit no-go zones it must respect.
4. **Compositions** — which other agents it composes with, who leads, who supports, and where handoffs happen.

Every entry must carry an evidence tag (`[CONFIG]`, `[DOC]`, `[INFERENCIA]`, `[SUPUESTO]`) on any material claim about a boundary or capability. A claim without a limit is incomplete; a boundary without a source cannot be marked `[DOC]`.

## How to maintain it

- Read the existing registry before editing. Ontology-first: never invent a new agent slot when an existing one covers the role.
- One writer per entry. Two agents editing the same boundary is a conflict; surface it, do not silently merge.
- After every meaningful change, run a DOX pass over the nearest owning `AGENTS.md` so the registry and the contract tree stay aligned.
- Remove stale entries immediately. A retired agent left in the registry is worse than a missing one because it invites misrouting.
- Fail-closed: if provenance, authority, or boundaries cannot be verified, mark `coverage_gap` and escalate rather than infer a polished boundary.

## Runtime boundary

This skill is local-evaluation only. No network calls, no git mutations, no auto-publish. Any execution beyond reading and drafting requires explicit operator confirmation. The runtime receipt lives at `receipts/runtime-boundary.yml`.

## Composition

- With `context-save` / `context-restore` — keep the registry inside durable memory, not in ephemeral context.
- With the DOX tree — the registry is a consumer of `AGENTS.md` contracts, never a replacement for them.
- With the committee — every peer reads the same registry before claiming work, so parallel agents do not drift.

Derivada de agents-dox (DN-OpenSource/claude-skills, Apache-2.0).
