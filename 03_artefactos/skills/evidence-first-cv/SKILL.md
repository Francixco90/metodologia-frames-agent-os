---
name: evidence-first-cv
description: This skill should be used when the user asks to "crear mi CV en HTML", "adaptar mi CV a una vacante", "hacer un résumé ATS", "comparar versiones de mi hoja de vida", or export a traceable bilingual CV package.
version: 0.2.0
license: LicenseRef-MetodologIA-Internal
metadata:
  owner: MetodologIA
  lifecycle_state: active
  execution_scope: local-evaluation
  model_agnostic: true
---

# Evidence-First CV

Compone CV recruiter-first y ATS-safe desde una `cv-spec-v1` aprobada y un
Evidence Bank canónico. Personalizar significa seleccionar, ordenar y expresar
evidencia; no añadir coincidencias sin respaldo. [METODOLOGIA][CONFIG]

## Preflight

Exige `candidate_id`, brief hash-bound, Evidence Bank hash-bound y
`cv-spec-v1` en `HUMAN_APPROVED`. Para `targeted_cv`, exige además snapshot de
vacante y application brief fijados por hash. Rechaza una spec obsoleta o una
selección de evidencia que no sea subconjunto del banco vigente. Si falta una
decisión que cambie veracidad, elegibilidad, posicionamiento o outputs, devuelve
la pregunta al orchestrator. Nunca ingiere PII desde el repositorio versionado.

## Flujo C06

1. Congela `spec_sha256` y valida sus bindings de brief, evidencia y vacante.
2. Selecciona exactamente los evidence IDs autorizados; no mezcla versiones ni
   toma requisitos de la vacante como capacidades.
3. Compila una fuente canónica según posicionamiento, orden, idiomas, page
   budget, keywords visibles, omisiones y límites declarados en la spec.
4. Redacta BLUF: valor o resultado → método → beneficio → validación o límite.
5. Proyecta únicamente la matriz solicitada: HTML ejecutivo, ATS HTML, ATS DOCX
   y ATS PDF. Ningún derivado se convierte en fuente editorial.
6. Liga cada output material al `spec_sha256`, `evidence_bank_sha256` y hash de
   contenido canónico en `cv-package-v2`; cada variante liga además su propia
   fuente lingüística por ref y hash, sin asumir que ES y EN son bytes iguales.
7. Valida claims, enlaces, lectura lineal, texto extraíble, accesibilidad,
   impresión, paridad entre idiomas y formatos, privacidad y límite de páginas.

Ejecuta `node skills/evidence-first-cv/scripts/check-skill.mjs` antes del gate.
El checker vuelve a leer archivos y hashes, no acepta un `PASS` autorreportado.

## Perfiles visuales

`candidate-neutral-ats` es default. `metodologia-career` hace visible la marca
MetodologIA. `authorized-brand` exige identidad y derechos registrados. Todos
son offline, responsive, sin telemetría ni fuentes remotas. La identidad del
candidato domina el documento; MetodologIA conserva procedencia metodológica.

## Claims y métricas

Solo usa evidence IDs `verified` o `user_confirmed` y su canal debe incluir
`cv`. Cada métrica conserva valor, unidad, contexto, periodo y limitación. Un
objetivo, estimación o transferencia posible se declara como tal o se omite.
Formación no se convierte en certificación.

## Outputs

- Markdown canónico por idioma solicitado.
- HTML ejecutivo accesible, responsive, imprimible y CSP estricta.
- ATS HTML de una columna, ATS DOCX estructural y ATS PDF con texto extraíble.
- `variant-manifest.json` según `schemas/cv-package-v2.schema.json`.
- Reporte de claims, paridad, visual/ATS, gaps y siguiente gate `CR_PACKAGE_QA`.

No declares un formato producido si el archivo no existe y su hash no fue leído
desde disco. Dos compilaciones offline con inputs y runtime fijados deben ser
idénticas. Reporta checks observados; nunca afirma porcentajes ATS no medidos.
Un HTML estático permite comprobar semántica, contenido visible y dependencias,
pero no acredita reflow, impresión ni páginas renderizadas: sin navegador y
receipt esos checks permanecen `UNKNOWN`. PDF exige herramientas observables
para texto, enlaces y páginas. `PUBLISHED` exige receipt externo materializado y
ligado al hash exacto del paquete `READY` predecesor; producir archivos no
equivale a publicar.

## Stop rules

Bloquea spec no aprobada o stale, claim sin evidencia, contradicción material,
idioma irresoluble, vacante no fijada para personalización, template o renderer
inexistente, paridad fallida, texto no extraíble, overflow, asset remoto, PII
dirigida a Git o hash declarado de un output ausente. Un runtime no reproducible
produce `UNKNOWN`; nunca se convierte en `PASS`.

## Done

El valor y rol se entienden en el primer tercio; 100% de claims materiales son
trazables; idiomas y formatos no se contradicen; el paquete queda
`RENDERED_DRAFT`/`DRAFTED`, no `SUBMITTED`, ligado a la spec aprobada y con QA
independiente pendiente o aprobado explícitamente.
