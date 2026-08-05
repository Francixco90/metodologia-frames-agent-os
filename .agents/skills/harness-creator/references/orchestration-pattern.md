# Orchestration Pattern

## Problem

A coding-agent harness must turn stated intent into verified results without coupling the agent to a specific runtime, model, or external orchestrator. The risk: either the harness hardcodes a workflow engine (brittle, non-portable) or it leaves the agent to improvise every step (unrepeatable, unauditable).

The four frameworks in the compendio — ICM, Harness Engineering, NL2Graph, and AI Chains — each address a different layer of this problem. This pattern maps them to concrete folders and subsystems of the generated harness so an agent can self-orchestrate a DAG of gates instead of executing an externally scripted pipeline. [DOC]

## Golden Rules

### 1. ICM: Five Context Layers Map to Folders

In-Context Mastery loads context by layers (C0 identity → C4 task), keeping the working prompt at the edge and pushing filler to the middle. The harness mirrors this with numeric-prefix folders so any agent navigates without a map: `00_inbox` (raw input) → `01_intencion` (intent) → `10_proceso` (gates/workflows) → `20_artefactos` (outputs) → `80_estado` (state) → `90_verificacion` (evidence) → `99_archive` (done). Depth limit 4 prevents context sprawl. [CONFIG]

### 2. NL2Graph: Gates with an Independent Verifier

Intent is translated into a directed graph of verification gates. Each gate has a producer and a verifier, and they must be distinct (Rule 9 of AGENTS.md). The agent prepares the DAG; it does not bypass gates or auto-promote states. A gate passes only when its verifier command returns green. [CONFIG]

### 3. AI Chains: Primitives Plus Editable Intermediate Layers

Work is decomposed into primitive operations (read, write, run, verify) composed as a chain. Intermediate layers (state files, progress notes, handoff records) are editable artifacts, not hidden state. This keeps the chain inspectable and resumable across sessions. [DOC]

### 4. Harness: Seven Subsystems, Conserved Plus Two New

The five conserved subsystems (Instructions, State, Verification, Scope, Lifecycle) plus two added by this skill (Orchestration, Structure) form the seven subsystems scored by `validate-harness.mjs`. Orchestration declares the self-orchestration preamble in its 5 .md files; Structure enforces the folder taxonomy and depth limit. [DOC]

## Framework Mapping

| Framework | Core concept | Where in the harness |
|---|---|---|
| ICM (In-Context Mastery) | Context loaded by layers C0–C4; edge-first, no filler | Numeric-prefix folders (`00_inbox` … `99_archive`); depth limit 4; `AGENTS.md`/`CLAUDE.md` as C0 entry |
| Harness Engineering | Five conserved subsystems + 2 new = 7 scored subsystems | `templates/` files: `AGENTS.md`, `feature-list.json`, `progress.md`, `init.sh`, `session-handoff.md`, plus orchestration .md files |
| NL2Graph | Intent → directed graph of verification gates; producer ≠ verifier | `10_proceso/gates/` (gate definitions); `90_verificacion/` (evidence); `validate-harness.mjs` as independent verifier |
| AI Chains | Primitive ops composed as chains; editable intermediate layers | `10_proceso/workflows/` (chain definitions); `80_estado/` (intermediate state); `progress.md` as chain cursor |

## When To Use

- You are generating a harness where the agent must drive its own workflow, not follow an externally scripted pipeline.
- The target repo needs repeatable, auditable progression from intent to verified artifact.
- You want portability across agents (Claude, Gemini, others) without re-coupling to a runtime.
- The user asks for self-orchestration: stated intent becomes a DAG of gates the agent walks.

## Tradeoffs

| Decision | Benefit | Cost |
|---|---|---|
| Folders mirror ICM layers | Any agent navigates without a map | Rigid taxonomy; renaming breaks the contract |
| Gates with independent verifier | Auditable, fail-closed progression | Producer and verifier must stay distinct; harder to shortcut |
| Editable intermediate layers | Chain is inspectable and resumable | More files to keep coherent; drift risk if stale |
| 7 subsystems (5 + Orchestration + Structure) | Self-orchestration is first-class, scored | Two extra subsystems to validate and maintain |

## Gotchas

1. **Preamble is verbatim, not paraphrased** — The self-orchestration preamble ("convierte intención en resultados por procesos auto orquestado") must appear unchanged in the 5 orchestration .md files. Paraphrasing breaks the self-describing DAG contract. [CONFIG]
2. **Depth limit is a guardrail, not a suggestion** — Folders deeper than 4 levels break the ICM edge-first loading assumption. Excess depth silently pushes critical context into the middle. [CONFIG]
3. **Producer ≠ verifier is non-negotiable** — An agent that produces a gate's output cannot also verify it (AGENTS.md Rule 9). A gate is green only when an independent verifier says so. [CONFIG]
4. **Prepare workflows, do not execute them** — The harness declares the DAG and its gates; it does not run the user's business workflows. Execution belongs to the target repo's own commands. [DOC]

## Related Patterns

- [Lifecycle and Bootstrap](lifecycle-bootstrap-pattern.md) — How the harness initializes across entry modes
- [Skill Runtime](skill-runtime-pattern.md) — How this skill is packaged and progressively disclosed
- [Context Engineering](context-engineering-pattern.md) — How context layers are loaded at the edge

## Evidence

- `[DOC]` Compendio de los 4 marcos (ICM, Harness Engineering, NL2Graph, AI Chains) revisado; mapeo a carpetas y subsistemas documentado en `SKILL.md`.
- `[CONFIG]` Reglas del repo: `AGENTS.md` (producer ≠ verifier, no ejecutar conectores), `SKILL.md` (5+2 subsistemas, preamble verbatim, depth limit 4, folder regex `^\d{2}_[a-z][a-z0-9-]*$`).