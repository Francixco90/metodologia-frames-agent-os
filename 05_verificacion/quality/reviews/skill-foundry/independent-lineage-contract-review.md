# Verificación independiente A05 — lineage y contrato Skill Foundry

## Veredicto

`PASS_A05_SKILL_FOUNDRY_LINEAGE_CONTRACT`

La suite focal prueba que `skills/remotion-video-production/LINEAGE.yaml` es el único lineage
canónico, que el alias canónico `LINEAGE.yml` no existe y que el wrapper legacy conserva
`skills/stitch-remotion-walkthrough/LINEAGE.yml` sin introducir un alias `.yaml`. [CÓDIGO]

El PASS es contractual y local: no concede `READY`, aprobación humana, release, publicación ni
elegibilidad comercial del runtime Remotion. La licencia productiva continúa bloqueada por
`coverage_gap`. [CONFIG]

## Cobertura verificada

- Registry canónico enlazado al SHA-256 real de `SKILL.md`, al digest real del manifiesto completo
  del paquete, al algoritmo declarado y a la cadena
  `candidate → quarantined → evaluated → active`. [CÓDIGO]
- Registry legacy enlazado a sus hashes reales y a la cadena
  `candidate → quarantined`; el ID genérico `remotion` permanece ausente. [CÓDIGO]
- Los cuatro scripts canónicos son el inventario exacto declarado por el registry y se ejecutan
  con exit `0`: `check-skill`, `check-contracts`, `check-sources` y `check-example`. [CÓDIGO]
- El lineage canónico conserva fuentes externas como referencia sin copia, y tanto lineage como
  veredicto de licencia mantienen bloqueado el uso comercial o productivo. [DOC][CONFIG]
- Inventario exacto de fixtures: cinco positivos y cuatro negativos. Se validan input, output,
  error, tres rutas portables y el rechazo de doce rutas hostiles. [CÓDIGO]
- El wrapper legacy conserva lineage `.yml`, contenido local de cuarentena, ausencia de copia y
  blockers explícitos de commit y licencia. [DOC][CONFIG]

## Evidencia ejecutada

1. `pnpm exec vitest run tests/contract/skill-foundry.contract.test.ts`
   → `1` archivo, `5/5` tests PASS.
2. `pnpm typecheck`
   → exit `0`.
3. `pnpm exec eslint tests/contract/skill-foundry.contract.test.ts`
   → exit `0`, sin hallazgos.
4. `pnpm exec prettier --check tests/contract/skill-foundry.contract.test.ts`
   → PASS.
5. Los cuatro scripts Skill Foundry, ejecutados también dentro de la suite focal,
   reportaron `PASS REMOTION SKILL`, `PASS REMOTION CONTRACTS`, `PASS SOURCES` y
   `PASS REMOTION EXAMPLE`. [CÓDIGO]

SHA-256 de la suite independiente:
`4ad6a1805dad0473e7892812d3fd3c1399d1fd4a9a02c6adbcfc2c4a40b498f0`. [CÓDIGO]

## Ciclo de hallazgo

La línea base falló porque el test intentaba abrir el alias canónico inexistente
`LINEAGE.yml`. Al ampliar la matriz, el validador local de rutas del propio test también mostró
ser menos estricto que el schema publicado. Ambos defectos quedaron corregidos únicamente en la
suite contractual: el primero se volvió una aserción de naming y el segundo adoptó la gramática
portable fail-closed que rechaza las doce rutas hostiles. [CÓDIGO]

## Límites y privacidad

- No se modificaron archivos de producción, registries, skills, fixtures, scripts ni licencias.
- No se copiaron secretos, PII ni rutas personales dentro de artefactos públicos.
- `coverage_gap`: la elegibilidad comercial o productiva del runtime Remotion permanece sin
  adjudicar y bloqueada; este PASS no altera ese gate. [CONFIG]
