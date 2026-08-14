---
name: career-design-system
description: This skill should be used when creating or revising an executive CV/portfolio HTML, choosing between two visual directions, applying MetodologIA Career components, or checking a career artifact for design-system drift.
version: 1.0.0
license: LicenseRef-MetodologIA-Internal
metadata:
  owner: MetodologIA
  lifecycle_state: active
  execution_scope: local-evaluation
  model_agnostic: true
---

# Career Design System

Convierte una `cv-spec-v2` factual en una decisión visual verificable antes de
renderizar HTML ejecutivo. Opera dentro de Spec-First; no autoriza claims,
publicación ni postulación. [METODOLOGIA][CONFIG]

## Preflight

1. Exige spec y evidence bank vigentes. Para HTML ejecutivo exige design brief.
2. Lee [`context.md`](context.md) y el manifiesto público
   `../../brand/career-design-system/manifest.v1.json`.
3. Valida hashes de decisión, tokens, componentes, iconos, fuentes y composición.
4. ATS-only usa `candidate-neutral-ats` y no requiere decisión visual.

## Flujo

1. **Indagar.** Registra audiencia, densidad, jerarquía, formatos, accesibilidad,
   impresión, idioma y restricciones en un design brief; no infiere preferencias
   ausentes que cambien la composición.
2. **Proponer.** Antes de aprobación produce exactamente dos alternativas con el
   mismo contenido sintético: Blueprint Executive y Neo-Swiss Editorial. Usa
   [`references/options-contract.md`](references/options-contract.md).
3. **Verificar.** Comprueba offline, JS-off, temas, teclado, reflow, impresión,
   contraste y hashes. El estado máximo es `DESIGN_OPTIONS_READY`.
4. **Decidir.** Registra elección humana hash-bound. Sin aprobación vigente,
   detén HTML ejecutivo; no elijas por la persona.
5. **Compilar.** Usa solo tokens, componentes, iconos y composición registrados.
   El copy visible viene de la fuente canónica, no de JavaScript.
6. **Revisar.** Ejecuta el checker focal y luego Career OS. Aplica la matriz de
   [`references/verification.md`](references/verification.md).

## Regla de salida

Entrega manifest y outputs ligados a `spec_sha256`, `design_decision_sha256`,
`design_system_sha256`, `composition_id` y `canonical_content_sha256`. Un cambio
en cualquiera invalida render y aprobación anterior.

## Stop rules

Bloquea ante aprobación ausente/stale, más o menos de dos alternativas, componente
o icono no registrado, color literal fuera de autoridad, fuente/licencia no
verificada, dependencia remota, copy en JavaScript, PII dirigida a Git, overflow,
contraste insuficiente o evidencia sin autoridad. Un check no observado es
`UNKNOWN`, nunca `PASS`.

## Done

```sh
node 03_artefactos/skills/career-design-system/scripts/check-skill.mjs
```

El checker debe pasar y un QA independiente debe revisar el render. El resultado
permanece `RENDERED_DRAFT` hasta gates humanos posteriores.
