---
name: frames-docs-as-code
description: This skill should be used when the user asks to "documentar Frames", "generar diagramas de workflows", "actualizar el portal documental", "sincronizar documentación transversal", or verify that repository documentation still matches executable manifests.
version: 0.1.0
license: LicenseRef-MetodologIA-Internal
metadata:
  owner: MetodologIA
  lifecycle_state: active
  execution_scope: local-evaluation
  model_agnostic: true
---

# Frames Docs as Code

## Contexto operativo

Lee [`context.md`](context.md). Usa esta skill para proyectar documentación desde fuentes ejecutables, no para convertir prosa en autoridad. [METODOLOGIA][CONFIG]

## Procedimiento

1. Identifica la fuente canónica, audiencia y páginas afectadas.
2. Completa `DocumentationImpactPlanV1`; `NOT_APPLICABLE` requiere reason code.
3. Regenera Markdown, HTML, secuencias e índices aplicables.
4. Compara referencias, contenido semántico, hashes y doble replay offline.
5. Emite `DocumentationClosureReceiptV1` solo sobre el candidate congelado.
6. Entrega a RT-09; no autoapruebes `DOCS_TRANSVERSAL_COMPLETE`.

Abre [`references/operating-contract.md`](references/operating-contract.md) para reglas de paridad, freshness y recuperación.

## Invariantes

- Manifests y contratos ejecutables mandan; las páginas son proyecciones.
- Un generado nunca se corrige manualmente.
- Un workflow sin referencia o secuencia resoluble bloquea.
- El portal público excluye extensiones, locators y estado privados.
- La documentación no concede merge, publicación ni efectos externos.

## Salida

Devuelve fuentes, derivados, cambios, hashes, cobertura, gaps, pruebas, receipt y siguiente gate. `UNKNOWN` bloquea.
