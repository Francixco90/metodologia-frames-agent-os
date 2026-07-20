---
name: instagram-carousel-production
description: This skill should be used when the user asks to "build an Instagram carousel", "render a MetodologIA carousel", "validate carousel cards and alt text", or "prepare a carousel pilot for review".
version: 0.1.0
license: LicenseRef-MetodologIA-Internal
compatibility: Requires the carousel content plugin, static-social renderer and hash-bound brand profiles.
metadata:
  owner: MetodologIA
  lifecycle_state: active
  execution_scope: local-candidate-production
---

# Instagram Carousel Production

Construir un carrusel como plugin de contenido, no como caso especial del orquestador. Mantener la
spec como autoridad y tratar PNG, HTML, contact sheet, manifest y receipt como derivados.

## Preflight

1. Validar `ContentWorkOrderV2` y `CanonicalEditorialUnitV1`.
2. Resolver fuentes, claims, BrandProfile, VoiceProfile y ChannelProfile por hash.
3. Exigir entre tres y diez tarjetas, posiciones continuas, alt text por tarjeta, conclusión al
   inicio y CTA de un movimiento al final.
4. Confirmar derechos de fonts y cualquier asset visual.

## Producción

1. Escribir copy en la spec; prohibir copy incrustado en el renderer.
2. Ejecutar `pnpm carousel:build`.
3. Bloquear red, reloj y aleatoriedad durante render.
4. Capturar dos veces cada tarjeta y comparar su hash.
5. Emitir PNG individuales, galería offline, contact sheet, screenshots desktop/móvil, manifest,
   hashes y receipt.
6. Ejecutar `pnpm verify:carousel`; encargar RT-09 antes del veredicto Guardian.

## QA

Verificar secuencia, swipe, continuidad, densidad, jerarquía, diacríticos, texto largo, alt ausente,
claim huérfano, contraste, safe zones, crop, overflow y derechos. Tratar CJK, RTL y emoji como
variantes explícitas de canal; no degradar silenciosamente.

## Stop rules

Detener ante `SOURCE_GAP`, `CLAIM_MISMATCH`, `RIGHTS_GAP`, `BRAND_DRIFT`, overflow, no determinismo
o identidades solapadas. Mantener `RENDERED_DRAFT` y emitir `WORKFLOW_PILOT_REVIEW`. Esperar una
aceptación explícita; no emitir `READY` ni publicar.

## Fixtures y checks

Usar `fixtures/positive/eight-card-pilot.yml` y `fixtures/negative/orphan-claim.yml`. Ejecutar
`pnpm verify:carousel` y `pnpm verify:skills`.
