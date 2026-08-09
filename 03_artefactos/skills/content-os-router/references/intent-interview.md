# Intent interview — source-to-content

Protocolo de captura de intent para routing source→video. Route-once: corre una
vez, escribe `intent-brief.jsonl`, sale. Nada re-abre el router.

Para `content-intent-v2`, preguntar solo por campos materialmente bloqueantes y
no superar tres preguntas: audiencia, resultado y fuente/autoridad. Registrar
los demás faltantes como supuestos visibles en el brief. Toda pieza nueva crea
`brief.md`; HTML se ofrece como proyección. [CONFIG]

## 1. Estado del proyecto

Aplicar la primera fila que matchee; no evaluar filas menores:

| Estado                                          | Acción                                                         |
| ----------------------------------------------- | -------------------------------------------------------------- |
| Intent con `deliverable` + `source_type` claros | Rutcea directo via `references/routes.md`. Sin entrevista.     |
| Intent con `source_type` pero sin `deliverable` | Pedir el deliverable (una pregunta routing-only). No adivines. |
| Intent ambiguo (keyword suelta, sin subject)    | Pedir qué es el video (R0). No rutcea por keyword.             |
| Fresh creation sin señales                      | Correr entrevista completa abajo.                              |

## 2. Captura (entrevista)

- **Source** — ¿de qué parte el video? URL, GitHub PR, texto/articulo, website,
  brief, footage, music, figma. Registrado como `source_type` + `source_ref`.
- **Deliverable** — ¿qué tipo de video? Explainer, product launch, motion
  graphic, captions, deck, general. Matchea contra la route table
  (`references/routes.md`). Route-by-deliverable, no por keyword.
- **Length** — ¿duración objetivo? <10s = motion-graphics. >180s =
  `content-os-general-video`. Especializados fuertes 30-90s.
- **Style** — ¿brand/palette/voice? Delegado a `content-os-creative` (Capability
  Fase 2). El router no decide style; lo pasa al capability_map.
- **Runtime** — ¿HTML+GSAP (Frames ContentOS default) o Remotion explícito? Default
  html-gsap. No mezclar.

## 3. Resuelve ambigüedades

Antes de finalizar la route, leer `references/routes.md` § Ambigüedades. Si el
candidato no satisface su contract, seguir ruteando en vez de forzar el match.

## 4. Escribe el brief

La entrevista termina escribiendo `intent-brief.jsonl` con `schemaVersion:
router-intent-v1`, `intentId`, `source_type`, `source_ref`, `deliverable`,
`route`, `capability_map[]`, `duration_s`, `runtime`, `offline: true`,
`workflow_status`. El brief es el único artifact de routing que el workflow lee.

## 5. Despacha

- Workflow Fase 3 existe (`workflow_status: available`): despachar al workflow.
- Workflow Fase 3 pendiente (`workflow_status: pending`): marcar `coverage_gap`,
  despachar capabilities (draft manual), documentar gap en `TASK.md`.

No network en el route path. No CLI fetch. No render (el adapter vive en
`content-os-core`). Deterministic: mismo intent → misma route.
