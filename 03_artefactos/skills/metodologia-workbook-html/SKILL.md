---
name: metodologia-workbook-html
description: This skill should be used when the user asks to "create a MetodologIA HTML workbook", "compile a multilingual workbook", "build a three-sheet training workbook", "make a printable no-JS workbook", or "verify a workbook against its spec". Route workbook production through Spec -> Compile -> Verify with local rights-cleared assets, language parity, no response persistence, and RENDERED_DRAFT output.
version: 0.1.0
license: LicenseRef-MetodologIA-Internal
metadata:
  owner: MetodologIA
  lifecycle_state: candidate
  execution_scope: local-candidate-production
  model_agnostic: true
---

# MetodologIA Workbook HTML

Compilar workbooks HTML reproducibles desde una especificación estructurada. Mantener
MetodologIA como única identidad visible y separar fuente, compilador y resultado. Tratar el
HTML como derivado: nunca corregirlo manualmente para ocultar un defecto de la spec o del
template.

## Ruta operativa

1. **Spec.** Crear `workbook-spec-v1` conforme a
   [schemas/workbook-spec-v1.schema.json](schemas/workbook-spec-v1.schema.json). Exigir un lock
   de diseño hash-bound, al menos tres hojas, contenido localizado con paridad estructural,
   assets locales con derechos y criterios explícitos de impresión y no-JS.
2. **Compile.** Consumir únicamente la spec validada, el design-system lock y los assets
   declarados. Ordenar entradas de forma estable; omitir relojes, aleatoriedad, telemetría y
   red. Emitir HTML, manifest de bytes y receipt ligados al `specSha256`.
3. **Verify.** Validar schema, paridad de `sheet.id` y `step.id`, assets/derechos, enlaces,
   teclado, impresión, no-JS y ausencia de persistencia de respuestas. Ejecutar dos builds y
   exigir bytes idénticos.
4. **Review.** Entregar solo `RENDERED_DRAFT`. Registrar `coverage_gap` cuando falte revisión
   visual, pedagógica, accesible o humana. No conceder `HUMAN_APPROVED`, `READY` ni
   `PUBLISHED`.

## Invariantes

- Mantener tres o más hojas. Permitir que cada hoja funcione como ruta de autoentrenamiento.
- Conservar la misma secuencia de hojas y pasos en cada locale; traducir contenido, no IDs.
- Permitir copiar prompts y operar tabs con teclado sin guardar respuestas del participante.
- Guardar solo preferencias inocuas de idioma o tema cuando la spec lo autorice.
- Garantizar contenido legible y navegación por fragmentos sin JavaScript.
- Producir impresión limpia sin controles interactivos ni cortes críticos.
- Bloquear `http(s)`, `file:`, rutas absolutas, locators privados, assets sin hash o derechos,
  URLs `/edit`, tracking y formularios que transmitan respuestas.
- Mantener fuentes, iconos, imágenes y scripts locales, declarados y hash-bound.

## Stop rules

Detener con `coverage_gap` ante lock ausente u obsoleto, diferencias estructurales entre
idiomas, menos de tres hojas, persistencia de respuestas, asset sin derechos, locator privado,
output inexistente, hash divergente o segunda compilación no idéntica. No publicar ni activar
conectores.

## Verificación

```bash
node skills/metodologia-workbook-html/scripts/check-skill.mjs
pnpm verify:skills
```

Leer [references/operating-contract.md](references/operating-contract.md) antes de implementar
un compilador o revisar un paquete. El checker de esta skill valida fixtures y semántica local;
el registro y sus hashes son responsabilidad del gate transversal del repositorio.

