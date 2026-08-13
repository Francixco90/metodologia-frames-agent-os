---
name: metodologia-workshop-route-landing-html
description: This skill should be used when the user asks to "create a workshop route landing page", "compile a multilingual workshop funnel", "build an eight-section training landing", "render a printable no-JS route page", or "verify a workshop landing against its spec".
version: 0.1.0
license: LicenseRef-MetodologIA-Internal
metadata:
  owner: MetodologIA
  lifecycle_state: candidate
  execution_scope: local-candidate-evaluation
  model_agnostic: true
---

# MetodologIA Workshop Route Landing HTML

Compilar landings genéricas de rutas formativas desde una especificación estructurada. Mantener
el contenido del programa fuera de la skill: esta capacidad aporta contrato, renderer sintético
y verificación, no campañas reales ni autoridad de publicación.

## Ruta operativa

1. **Spec.** Crear `workshop-route-landing-spec-v1` con exactamente ocho secciones, paridad
   ES/EN/PT, design-system lock hash-bound, CTA de una a tres palabras y recursos declarados
   como `available` o `pending`. Calcular `specSha256` mediante
   `sha256-canonical-json-v1`, excluyendo solo ese campo.
2. **Compile.** Consumir únicamente la spec validada. Escapar todo contenido, conservar el
   orden declarado y emitir HTML autocontenido, manifest y receipt. Usar SVG inline en CTA;
   no usar red, reloj, aleatoriedad, tracking, formularios ni dependencias remotas.
3. **Verify.** Validar schema, hash, ocho secciones, paridad, estados de recursos, enlaces
   relativos, no-JS, impresión, teclado nativo y dos compilaciones cross-process byte-idénticas.
4. **Review.** Mantener `RENDERED_DRAFT` y `candidate`. Registrar `coverage_gap` hasta que
   Verifier, Guardian y H01 completen los gates independientes. No publicar.

## Invariantes

- Usar exactamente: `entry`, `tension`, `route`, `method`, `resources`, `outcomes`, `trust`,
  `invitation`, en ese orden.
- Mantener IDs y orden equivalentes entre ES, EN y PT; traducir texto, nunca IDs.
- Limitar cada CTA visible a una, dos o tres palabras y acompañar enlaces de acción con SVG
  inline decorativo.
- Mostrar enlaces solo para recursos `available`; representar `pending` sin `href` ni acción
  falsa.
- Conservar contenido, navegación y recursos disponibles sin JavaScript. Usar enlaces y
  controles HTML nativos con foco visible.
- Ocultar navegación y CTA al imprimir, sin perder el contenido de las ocho secciones.
- Bloquear rutas absolutas, locators privados, URLs de edición, assets sin derechos, formularios,
  telemetría y cualquier intento de `READY` o `PUBLISHED`.
- Regenerar desde la spec; nunca corregir manualmente el HTML compilado.

## Comandos

```bash
node skills/metodologia-workshop-route-landing-html/scripts/compile-fixture.mjs \
  skills/metodologia-workshop-route-landing-html/fixtures/positive/valid-spec.json \
  <directorio-salida>
node skills/metodologia-workshop-route-landing-html/scripts/check-skill.mjs
```

Leer [references/operating-contract.md](references/operating-contract.md) antes de adaptar el
renderer. Consultar [references/capability-boundary.yml](references/capability-boundary.yml)
para límites de ejecución. Esta skill no solicita red ni publica.
