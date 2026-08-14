# Video OS v1

Video OS convierte un pedido simple y material fuente autorizado en un video verificable con
entre tres y cinco decisiones humanas. Es una capa de producto sobre `R6`,
`02_proceso/workflows/multimedia/**` y `content-os-general-video`; no duplica sus capacidades.
[DOC]

## Resultado

- Un contrato canónico `Spec → Compile → Verify → Review → Promote`. [CONFIG]
- Un paquete documental con secciones estables y contenido variable por tema. [DOC]
- Contexto JIT por etapa para que un modelo de razonamiento bajo complete deltas, no reconstruya
  el sistema. [INFERENCIA]
- Estado honesto: `RENDERED_DRAFT` no implica aprobación, readiness ni publicación. [CONFIG]

## Experiencia de cuatro decisiones

1. Pedido y fuentes: Video OS propone arquetipo, restricciones y preguntas bloqueantes.
2. Dirección: se aprueban spec, privacidad y storyboard multiframe.
3. Borrador: se revisa el render principal con evidencia técnica, editorial y de privacidad.
4. Cierre: se aprueba una corrección, derivado o handoff; publicar queda fuera del Video OS.

La segunda decisión puede omitirse solo cuando el usuario pide automatización y la spec está
completa; una quinta se habilita para una única ronda de corrección. Nunca se exceden cinco sin
abrir una nueva revisión. [CONFIG]

## Métricas de aceptación

- `3 <= prompt_budget.max <= 5` y máximo tres preguntas bloqueantes.
- Cada cápsula de contexto consume como máximo 1.800 tokens estimados.
- Todos los derivados enlazan `spec_sha256` y el manifiesto vigente.
- Un export secundario puede solicitarse desde el intake, pero permanece en cola y solo se compila
  después del `PASS` independiente del principal.
- Privacidad por defecto `light`: máscaras de campo, no placas persistentes.
- El intro con persona conserva movimiento real; congelar un frame queda bloqueado.
- El runtime termina automáticamente en `RENDERED_DRAFT`; `HUMAN_APPROVED` solo puede provenir
  de un receipt externo explícito. Nunca publica.

`coverage_gap`: reducir al menos 50 % de tokens y conservar calidad con un modelo de razonamiento
bajo requiere benchmark comparativo con tareas representativas; este contrato lo hace medible,
pero no afirma todavía ese resultado. [SUPUESTO]
