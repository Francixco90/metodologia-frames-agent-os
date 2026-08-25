# Resume — TASK-loose-032

## Objective

Integrar una capacidad reproducible para videos explicativos MetodologIA con
contratos spec-first, diagramas HTML/SVG y ejecucion local fail-closed.

## Authority and current base

- Base reconciliada: `Javi/main@1f890f31`, que contiene el conjunto exacto
  #142–#149, #170, #173 y #197–#210.
- Worktree de reconciliacion: `metodologia-frames-agent-os-upstream-homologation-v1`.
- Rama local: `codex/upstream-homologation-v1`.
- El checkout Mamba/CV y el piloto faceless son solo lectura.

## Current boundary

- Codigo y fixtures sinteticos solamente.
- Sin medios, modelos, runtimes, fuentes duplicadas o locators privados.
- Task en `ESPECIFICADO`; gate objetivo `HM_CANDIDATE_VERIFIED`.
- Adaptador General Video en `PLAN_VERIFY_ONLY`, sin efectos, autoridad de render
  o publicacion y con estado maximo `BLOCKED`.
- Sin release audiovisual o publicacion.

## Materialized scope

1. #142–#147: contratos/routing Video OS, pruebas adversariales y adaptador
   General Video de plan/verificacion.
2. #148–#149, #170, #173 y #197–#199: arquitectura S00–S03, candidata S04 en
   cuarentena, fixtures sinteticos PASA/PIVOTE y checker ejecutable.
3. #200–#204: `DiagramStage`, geometria, layout lifecycle y prueba de browser.
4. #205–#209: contratos declarativos de voz/copy/ASR/captions, observacion de audio
   y lectura estable de materiales.
5. #210: registro de la superficie de contexto.

## Remaining coverage gaps

- Faltan receipts materiales hash-bound que acrediten `work-built` y
  `checks-green` para el conjunto integrado. Esta ausencia es la razon central
  para conservar el task en `ESPECIFICADO`.
- `write_set_history` es un `coverage_gap`: la implementacion historica alcanzo
  rutas finales fuera del write set original. La reconciliacion documental no
  concede autoridad retroactiva sobre esas escrituras.
- `GENERAL_VIDEO_METHOD_EXPLAINER_NOT_PROMOTED`; no hay compilacion o render
  autorizado desde General Video.
- Skill `UNREGISTERED_DRAFT · CANDIDATE_PENDING_GATE`; evaluacion S03 `NOT_RUN` y
  etapas S05–S09 sin materializar.
- ASR/captions `DECLARATIVE_ONLY`; audio no genera TTS, normaliza ni acredita
  escucha integral.
- `DiagramStage` y sus guards no equivalen a una cadena completa de build, render
  o QA audiovisual.
- Derechos de Pristino, Guardian, aprobacion humana y publicacion siguen siendo
  gates separados.

## Required checks

- `pnpm verify:video-os`
- `pnpm verify:skills`
- `pnpm typecheck`
- `pnpm check:repo`
- Pruebas adversariales focales y escaneo de binarios/locators.

## Next gate

Evaluar la candidata S04 y continuar S05–S09 solo mediante receipts validos.
`HM_CANDIDATE_VERIFIED` sigue siendo el gate objetivo;
`HM_PROMOTION_APPROVED` permanece manual y no autorizado.
