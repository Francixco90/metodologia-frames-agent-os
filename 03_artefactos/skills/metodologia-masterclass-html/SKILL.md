---
name: metodologia-masterclass-html
description: This skill should be used when the user asks to "create a MetodologIA HTML masterclass", "compile a multilingual slide class", "build 90 and 120 minute facilitation modes", "connect slides to a workbook deep link", or "verify an accessible HTML masterclass". Route typed slide production through Spec -> Compile -> Verify with deterministic timing, keyboard semantics, local rights-cleared assets, and RENDERED_DRAFT output.
version: 0.1.0
license: LicenseRef-MetodologIA-Internal
metadata:
  owner: MetodologIA
  lifecycle_state: candidate
  execution_scope: local-candidate-production
  model_agnostic: true
---

# MetodologIA Masterclass HTML

Compilar masterclasses HTML reproducibles desde slides tipadas. Mantener MetodologIA como
única identidad visible y usar la spec como autoridad de contenido, timing, notas, recursos y
enlaces profundos. Tratar el HTML como derivado, no como fuente editable.

## Ruta operativa

1. **Spec.** Crear `masterclass-spec-v1` conforme a
   [schemas/masterclass-spec-v1.schema.json](schemas/masterclass-spec-v1.schema.json). Declarar
   variantes genéricas de 90 y 120 minutos, slides localizadas, intención, nota de facilitación,
   tiempos y recursos tipados.
2. **Compile.** Resolver el design-system lock y assets por SHA-256. Generar navegación,
   recorrido, progreso, contador, controles y panel de facilitación desde el modelo, sin parches
   de strings ni relojes.
3. **Verify.** Validar schema, paridad de `slide.id`, suma exacta de 90/120 minutos, semántica de
   teclado, deep links y derechos. Repetir el build y exigir bytes idénticos.
4. **Review.** Entregar solo `RENDERED_DRAFT`. Registrar `coverage_gap` si falta ensayo del
   facilitador, revisión pedagógica, visual, accesible o humana.

## Invariantes

- Mantener el mismo orden e IDs de slides en todos los idiomas.
- Exigir `intent`, `facilitatorNote`, tiempos core/extended y `resources` en cada slide.
- Sumar exactamente 90 minutos para el modo core y 120 para el extendido.
- Ofrecer botones, recorrido y teclado: siguiente con ArrowRight/PageDown/Space; anterior con
  ArrowLeft/PageUp; Home/End para extremos. No capturar teclas al escribir en inputs.
- Conservar idioma, slide y fragmento al cambiar locale.
- Tratar deep links como contratos relativos con locale, fragmento y target tipado; bloquear el
  build si el destino no existe.
- Mantener todo el contenido esencial disponible sin red. No usar autoplay, tracking ni
  telemetría.
- Usar únicamente assets locales, hash-bound y con derechos despejados.

## Stop rules

Detener con `coverage_gap` ante lock ausente u obsoleto, slides desalineadas por idioma, suma
distinta de 90/120, recurso sin tipo, deep link roto, asset sin derechos, locator privado,
output inexistente, hash divergente o builds no idénticos. No declarar `FINAL`,
`HUMAN_APPROVED`, `READY` o `PUBLISHED`.

## Verificación

```bash
node skills/metodologia-masterclass-html/scripts/check-skill.mjs
pnpm verify:skills
```

Leer [references/operating-contract.md](references/operating-contract.md) antes de implementar
un compilador o validar un paquete. El registro y hashes transversales los resuelve el
coordinador mediante el gate del repositorio.

