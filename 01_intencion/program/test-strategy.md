# Estrategia de pruebas

## Selección

Se adopta una matriz por capas y tipos con cinco niveles de automatización. Este vertical slice no
ejecuta un modelo predictivo en producción; por eso no inventa métricas de accuracy, drift o
fairness de modelo. La evidencia se concentra en contratos, fuentes, decisiones, render,
accesibilidad, seguridad e integración. [CONFIG]

## Matriz aplicada

| Tipo        | UI / producto                                    | Contratos / adapters                     | Pipeline                          | Decisión agéntica                  | Datos y evidencia                  | Infraestructura                          |
| ----------- | ------------------------------------------------ | ---------------------------------------- | --------------------------------- | ---------------------------------- | ---------------------------------- | ---------------------------------------- |
| Funcional   | Web offline, captions, frames y badges           | Zod strict, NotebookLM read-only, n8n v2 | DAG, estados y build reproducible | 5 propuestas, 20 reviews, síntesis | Dedupe, claims y receipts          | Toolchain exacto y composición resoluble |
| Rendimiento | Sin SLO externo; se registra duración del render | Sin carga live autorizada                | Concurrencia Remotion fijada      | No aplica benchmark de LLM         | Hashing acotado                    | CPU local; no claim de escalabilidad     |
| Seguridad   | XSS/CSP/offline, overflow                        | Default deny, hashes, H01, replay        | Sin secretos ni red en render     | Sin chain-of-thought privado       | Sin PII ni locators                | Auditoría de dependencias                |
| Compliance  | Accesibilidad visual y captions                  | Approval/release separados               | Lineage y gates                   | Dissent y evidencia auditables     | Derechos, licencia y retención     | Artefactos portables                     |
| Fairness    | Texto/estado no dependen solo de color           | Respuesta consistente fail-closed        | Misma política por paquete        | No hay decisión sobre personas     | No hay datos demográficos          | No aplica asignación multi-tenant        |
| Integración | Web y Motion desde un expediente                 | Core ↔ adapters hash-bound               | Source → committee → build → QA   | Decisión ↔ spec ↔ componentes      | Source snapshot ↔ claims ↔ outputs | Remotion + Chromium + FFmpeg             |

## Niveles

| Nivel          | Evidencia                                         | Gate                     |
| -------------- | ------------------------------------------------- | ------------------------ |
| T1 Unit        | funciones, schemas, timing, estados, stores       | cada cambio              |
| T2 Component   | sources, skills, web, Remotion, n8n               | antes de handoff         |
| T3 Integration | expediente y adapters entre capas                 | antes de render/closeout |
| T4 System      | build, smoke, dos full renders, ffprobe, framemd5 | revisión técnica         |
| T5 Acceptance  | playback, derechos, Guardian, H01, release        | promoción humana         |

## Casos adversariales obligatorios

- Fuentes: hash ausente, duplicado, derechos o autoridad irresueltos, locator privado.
- Comité: menos/más de cinco, pares incompletos/duplicados, assessment IDs repetidos,
  chain-of-thought textual y aprobación no ligada.
- Estado: salto de gate, evidencia no ligada, Guardian=producer, actor humano distinto de H01.
- Memoria/receipts: mutación nested, replay con evidencia cambiada, hash stale.
- Web: claim bloqueado/huérfano, campo desconocido, script/red/remoto y overflow.
- Motion: 16:9, 9:16, 1:1, texto largo, RTL/CJK/emoji, captions solapados, audio ausente o más
  largo, asset corrupto/expirado, transición ≥ escena, red durante render, timeout/abort, WebGL
  headless, Lottie externo y licencia desconocida.
- Release: evidence refs inexistentes, callback/retry/kill-switch alterados, replay no revalidado y
  package sin H01.

## Reglas de veredicto

- Un test verde no compensa un receipt faltante.
- Un output material exige producer y verifier distintos.
- Un defecto crítico o alto bloquea Guardian.
- Un caso manual no ejecutado se registra `coverage_gap`; nunca se simula.
- `RENDER_VALIDATED` técnico no altera el bloqueo gobernado previo a `SOURCE_LOCKED`.
