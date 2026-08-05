---
name: context-lsp
description: This skill should be used when the user wants to leverage Language Server Protocol data (definitions, references, diagnostics, symbols) to ground context decisions in precise codebase structure rather than guesses.
version: 0.1.0
license: LicenseRef-MetodologIA-Internal
metadata:
  owner: MetodologIA
  lifecycle_state: active
  execution_scope: local-evaluation
  model_agnostic: true
---

# Context LSP — grounding context decisions in Language Server Protocol data

Grep finds text; a language server finds the symbol. When a context decision
depends on where a symbol is defined, who references it, what type it carries,
or what diagnostics the compiler emits, text search returns shadowed names,
comments, strings and same-named symbols from other scopes. The language
server resolves the actual symbol the way the compiler does. Use it to ground
context decisions in codebase structure rather than guesses.

## When to use

Reach for this skill whenever a context decision would benefit from precise
codebase structure: locating where a symbol is defined, finding all usages or
callers of a function/class/variable, understanding the type or signature of a
symbol, enumerating the outline of a file, searching a symbol by name across
the project, or reading compiler/analyzer diagnostics for a set of files.

Trigger on phrases like "where is X defined", "find all usages", "who calls
this", "what's the type of this", "what errors does the compiler report here",
"ground this decision in the code".

## LSP signals it uses

- **definitions** — go-to-definition resolves the file, line and column where
  the symbol under a position is declared. Use it to confirm a symbol's origin
  before reasoning about its behavior.
- **references** — find-references returns every place the symbol is used,
  including the declaration. Use it to measure impact radius before a refactor
  or to ground a claim about who depends on a symbol.
- **hover / type info** — returns the type, signature and docs of the symbol
  under a position. Use it to verify a symbol's contract instead of inferring
  it from the call site.
- **document symbols** — outline of a file: classes, functions, fields, with
  ranges. Use it to map a file's structure before reading it line by line.
- **workspace symbols** — find a symbol by name across the project. Use it to
  locate an entity when you only know its name, not its file.
- **diagnostics** — compiler/analyzer errors and warnings for the files you
  pass. Use it to ground decisions about code health in the compiler's own
  verdict, not in a guess.

## How to query

Run the language server through a one-shot helper: each invocation starts the
server, runs the queries, and shuts it down. Pass positions as 1-based
`FILE:LINE:COL` — the same numbers Read/Grep show you. Output lines are
`file:line:col — snippet`, directly usable for follow-up Reads.

Batch related queries (definition + references for the same symbol) into one
invocation to amortize server startup.

## How to ground decisions

1. **Detect and verify** — identify the stack from project markers
   (`tsconfig.json`/`package.json`, `pyproject.toml`, `pubspec.yaml`,
   `Cargo.toml`). If the server binary is missing, report it in one line and
   fall back to Grep/Glob/Read for the current query. The skill never stalls a
   task on a missing server.
2. **Query** — ask the language server for the signal you need (definition,
   references, hover, symbols, diagnostics). Batch related queries.
3. **Ground** — cite the LSP result (file:line:col) as evidence for the
   decision. A claim about "who calls this" backed by `references` is grounded;
   a claim backed only by grep is approximate.
4. **Record gaps** — if the server is missing, crashes, times out, or returns
   empty results you suspect are wrong, report what happened in one line and
   mark `coverage_gap` for the ungrounded portion. Do not substitute a polished
   inference for a missing signal.

## Fallback rule

Any failure — server missing, crash, timeout, empty results you suspect are
wrong — means: report what happened in one line, then answer the user's
question with Grep/Glob/Read instead. The LSP path is an upgrade, not a
dependency. This is a fail-closed posture: a missing signal is reported as a
gap, never dressed up as a grounded claim.

## Limitations

- One-shot means big projects re-index per invocation — batch queries to
  amortize.
- LSP columns count UTF-16 code units; printed column numbers on lines with
  astral-plane characters (emoji) may differ from your editor's display.
- `diagnostics` reports only the files you pass, not the whole project — use
  the project's own build/type-check command for a full sweep.
- The skill reads codebase structure; it does not modify code, run git, or
  open network connections. Any execution is deferred to the operator behind
  explicit confirmation.

## Validación

- The checker local `skills/context-lsp/scripts/check-skill.mjs` verifies
  presence of governance tokens, absence of forbidden APIs and absolute paths,
  frontmatter fields, LINEAGE fields, and fixture completeness.
- If a needed language server isn't installed, the skill emits `coverage_gap`
  for the ungrounded portion instead of fabricating a structural claim.

Derivada de lsp (DN-OpenSource/claude-skills, Apache-2.0).
