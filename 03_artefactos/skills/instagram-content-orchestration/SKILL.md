---
name: instagram-content-orchestration
description: This skill should be used when the user asks to "orchestrate an Instagram workflow", "run the five-role content committee", "create an Instagram candidate package", or "advance the next Instagram content type".
version: 0.1.0
license: LicenseRef-MetodologIA-Internal
compatibility: Requires AgentContractV2, ContentWorkOrderV2, OrchestrationRunV2 and the Instagram workflow matrix.
metadata:
  owner: MetodologIA
  lifecycle_state: active
  execution_scope: local-orchestration
---

# Instagram Content Orchestration

Orquestar un workflow canónico desde work order hasta paquete candidato sin simular aprobación ni
publicación. Mantener dos agentes permanentes: `CreativeOrchestratorV2` produce y `GuardianV2`
verifica en modo read-only.

## Preflight

1. Validar `ContentWorkOrderV2` de forma estricta y resolver tipo, superficie, patrón editorial,
   audiencia, locale, fuentes, claims y perfiles.
2. Confirmar que el tipo existe en
   `registries/content-types/instagram-workflow-matrix.yml`.
3. Rechazar cualquier tipo `planned`; solo `active_candidate` puede construir.
4. Fijar los hashes de input antes de instanciar especialistas.

## Ejecución

1. Instanciar RT-02…RT-10 como especialistas efímeros únicamente cuando la etapa los requiera.
2. Limitar la concurrencia a dos instancias.
3. Ejecutar el comité de cinco en olas `2+2+1`; persistir cinco propuestas y veinte evaluaciones
   cruzadas.
4. Registrar `actor_instance_id`, rol, tool, timestamp, hashes, decisión, error y dissent. Excluir
   razonamiento privado.
5. Aplicar tres intentos por etapa y dos revisiones Guardian como máximos.
6. Ejecutar RT-09 antes de RT-11 y exigir identidades distintas para producer, verifier y Guardian.

## Estados y errores

Tratar `RENDERED_DRAFT`, `GUARDIAN_VERIFIED`, `WORKFLOW_PILOT_REVIEW`,
`WORKFLOW_PILOT_ACCEPTED`, `READY` y `PUBLISHED` como estados distintos. Emitir errores del catálogo
público y conservar el mapping interno. Superado el presupuesto, emitir
`ITERATION_BUDGET_EXCEEDED`.

## Stop rules

Detener ante fuente, marca, canal, derechos, ownership o aprobación faltantes. Nunca mutar memoria
desde borradores. La aceptación humana desbloquea un solo workflow siguiente; no autoriza
publicación.

## Fixtures y checks

Usar `fixtures/positive/carousel-run.yml` y `fixtures/negative/concurrency.yml`. Ejecutar
`pnpm verify:orchestration` y `pnpm verify:skills`.
