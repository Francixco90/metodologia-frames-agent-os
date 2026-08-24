# Resume — TASK-loose-032

## Objective

Integrar una capacidad reproducible para videos explicativos MetodologIA con
contratos spec-first, diagramas HTML/SVG y ejecucion local fail-closed.

## Authority and base

- Base: `upstream/main@e37a3108`.
- Worktree: `metodologia-frames-agent-os-framework-explainer-v2`.
- Rama: `codex/framework-explainer-v2-foundation`.
- El checkout Mamba/CV y el piloto faceless son solo lectura.

## Current boundary

- Codigo y fixtures sinteticos solamente.
- Sin medios, modelos, runtimes, fuentes duplicadas o locators privados.
- Estado automatico maximo: `RENDERED_DRAFT · LOCAL TEST ONLY`.
- Sin merge, release o publicacion.

## Execution order

1. Contratos y routing Video OS.
2. Verificacion independiente.
3. Bridge General Video.
4. Skill candidata y evaluacion.
5. Motor visual y conductor desatendido.
6. Fixtures PASA/PIVOTE code-only.

## Required checks

- `pnpm verify:video-os`
- `pnpm verify:skills`
- `pnpm typecheck`
- `pnpm check:repo`
- Pruebas adversariales focales y escaneo de binarios/locators.

## Next gate

`HM_CANDIDATE_VERIFIED`; `HM_PROMOTION_APPROVED` permanece manual.
