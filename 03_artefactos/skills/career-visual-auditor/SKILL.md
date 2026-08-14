---
name: career-visual-auditor
description: This skill should be used when an executive CV or career portfolio needs an independent visual, responsive, theme, icon, dialog, print, or accessibility audit before review or promotion.
version: 0.2.0
license: LicenseRef-MetodologIA-Internal
metadata:
  owner: MetodologIA
  lifecycle_state: active
  execution_scope: local-evaluation
  model_agnostic: true
---

# Career Visual Auditor

Audita consumidores del design system Career sin producirlos ni corregirlos.
Opera después del build y antes de revisión humana. [METODOLOGIA]

## Preflight

1. Resuelve HTML, manifest, spec, decisión visual y sistema observado.
2. Rechaza hashes divergentes, red remota, PII o estado superior a la evidencia.
3. Usa contenido sintético en Git; los CV reales se evalúan solo en raíz privada.
4. Carga `references/audit-contract.md` para la matriz material.

## Auditoría

- Verifica tokens semánticos y ausencia de colores literales en consumidores.
- Calcula contraste en navy y light; light admite near-white, near-black, grises y dorado.
- Mide jerarquía, ancho de lectura, densidad, espacio en blanco y palabras indivisibles.
- Recorre 320, 375, 390, 768, 1024 y 1440 px; 100/200%, portrait y landscape.
- Exige iconos SVG inline, nombre accesible y targets de al menos 44×44 px.
- Prueba diálogos: una X, trap, Escape, backdrop, scroll y retorno de foco.
- Prueba JS-off, reduced motion, forced colors e impresión light sin controles.
- Compara capturas, pero nunca convierte una preferencia estética en PASS factual.

## Economía visual

Marca como `REVISE` una card con más de una idea o prueba principal, accesos visibles
por encima de cuatro, rails redundantes, numeración decorativa o texto repetido.
La lectura 8/30 segundos es un test de comprensión, no un claim cognitivo.
[NEUROCIENCIA][INFERENCIA]

## Resultados

Emite `PASS`, `REVISE`, `BLOCKED` o `UNKNOWN` con viewport, selector, criterio y
evidencia reproducible. Un test ausente permanece `UNKNOWN`; no se autocertifica.
Este skill no concede `HUMAN_APPROVED`, `READY` ni `PUBLISHED`.

## Done

```sh
node 03_artefactos/skills/career-visual-auditor/scripts/check-skill.mjs
node 03_artefactos/skills/career-visual-auditor/scripts/audit-page.mjs <html> <manifest> <decision> <audit-input>
```

Exige además privacidad, ownership y Guardian independiente.
