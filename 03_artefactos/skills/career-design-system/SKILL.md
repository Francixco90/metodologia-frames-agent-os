---
name: career-design-system
description: This skill should be used when creating or revising an executive CV/portfolio HTML, choosing between two visual directions, applying MetodologIA Career components, or checking a career artifact for design-system drift.
version: 1.0.0
license: LicenseRef-MetodologIA-Internal
metadata:
  owner: MetodologIA
  lifecycle_state: candidate
  execution_scope: local-evaluation
  model_agnostic: true
---

# Career Design System

Convierte una `cv-spec-v2` factual en una decisión visual verificable antes de
renderizar HTML ejecutivo. Opera dentro de Spec-First; no autoriza claims,
publicación ni postulación. [METODOLOGIA][CONFIG]

## Preflight

1. Exige spec y evidence bank vigentes. Para HTML ejecutivo exige design brief.
2. Lee el manifiesto público `../../brand/career-design-system/manifest.v1.json`.
3. Valida hashes de decisión, tokens, componentes, iconos, fuentes y composición.
4. ATS-only usa `candidate-neutral-ats` y no requiere decisión visual.

## Flujo

1. **Indagar.** Registra audiencia, densidad, jerarquía, formatos, accesibilidad,
   impresión, idioma y restricciones en un design brief; no infiere preferencias.
2. **Proponer.** Produce exactamente dos alternativas con contenido sintético:
   Blueprint Executive y Neo-Swiss Editorial.
3. **Verificar.** Comprueba offline, JS-off, temas, teclado, reflow, impresión,
   contraste y hashes. El estado máximo es `DESIGN_OPTIONS_READY`.
4. **Decidir.** Registra elección humana hash-bound. Sin aprobación vigente,
   detén HTML ejecutivo; no elijas por la persona.
5. **Compilar.** Usa solo tokens, componentes, iconos y composición registrados.
6. **Revisar.** Ejecuta el checker focal y luego Career OS.

## Stop rules

Bloquea ante aprobación ausente o stale, alternativas incompletas, componente no
registrado, dependencia remota, PII dirigida a Git, overflow o contraste insuficiente.
Un check no observado es `UNKNOWN`, nunca `PASS`.

## Estado candidato

Esta capa registra los assets y el contrato como `candidate`. La activación,
contexto operativo y receipt runtime se incorporan en el sucesor gobernado.
