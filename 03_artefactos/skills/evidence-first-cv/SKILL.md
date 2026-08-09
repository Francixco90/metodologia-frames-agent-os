---
name: evidence-first-cv
description: This skill should be used when the user asks to "crear mi CV en HTML", "adaptar mi CV a una vacante", "hacer un résumé ATS", "comparar versiones de mi hoja de vida", or export a traceable bilingual CV package.
version: 0.1.0
license: LicenseRef-MetodologIA-Internal
metadata:
  owner: MetodologIA
  lifecycle_state: active
  execution_scope: local-evaluation
  model_agnostic: true
---

# Evidence-First CV

Compone CV recruiter-first y ATS-safe desde un brief aprobado y Evidence Bank
canónico. Personalizar significa seleccionar, ordenar y expresar evidencia; no
añadir coincidencias sin respaldo. [METODOLOGIA][CONFIG]

## Preflight

Exige `candidate_id`, brief, objetivo, idioma, perfil/evidencia, restricciones y
vacante fijada para `targeted_cv`. Si falta una decisión que cambie veracidad,
elegibilidad o posicionamiento, devuelve la pregunta al orchestrator. Nunca
ingiere PII desde el repositorio versionado.

## Flujo C06

1. Selecciona una base y registra injertos controlados; no mezcla versiones al
   azar.
2. Construye matriz requisito→evidencia cuando existe vacante.
3. Define arquitectura: hero/perfil, experiencia, proyectos, capacidades,
   formación y enlaces según audiencia.
4. Redacta BLUF: valor o resultado → método → beneficio → validación o límite.
5. Traduce tecnicismos a impacto para recruiter; conserva detalle pertinente
   para hiring manager.
6. Genera Markdown canónico, HTML semántico y manifest. PDF ATS es una
   proyección imprimible del HTML, no una fuente editorial nueva.
7. Valida claims, idioma, enlaces, selección de texto, orden lineal,
   accesibilidad, impresión, solapamientos y límite de páginas solicitado.

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

- `cv-source.md` canónico.
- `cv.html` accesible, responsive, imprimible y CSP estricta.
- `cv.pdf` ATS-safe cuando el renderer autorizado esté disponible.
- `variant-manifest.json` según
  `schemas/cv-package-v1.schema.json`.
- Reporte de claims, paridad, visual/ATS, gaps y siguiente gate `CR_PACKAGE_QA`.

No declares PDF producido si el archivo no existe y su hash no fue leído desde
disco. Dos renders offline con inputs fijados deben ser idénticos.

## Stop rules

Bloquea claim sin evidencia, contradicción material, idioma irresoluble,
vacante no fijada para personalización, template o renderer inexistente,
paridad fallida, texto no seleccionable, overflow, asset remoto, PII dirigida a
Git o hash declarado de un output ausente.

## Done

El valor y rol se entienden en el primer tercio; 100% de claims materiales son
trazables; Markdown/HTML/PDF no se contradicen; el paquete queda `DRAFTED`, no
`SUBMITTED`, con QA independiente pendiente o aprobado explícitamente.
