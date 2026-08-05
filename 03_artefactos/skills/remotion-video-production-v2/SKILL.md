---
name: remotion-video-production-v2
description: This skill should be used when the user asks to "route a ContentWorkOrderV2 to Remotion", "create a motion candidate package", "adapt the Remotion skill to AgentContractV2", or "produce an Instagram reel-motion draft".
version: 0.1.0
license: LicenseRef-MetodologIA-Internal
compatibility: Extends remotion-video-production 0.1.0 with V2 work-order, orchestration and candidate-package bindings.
metadata:
  owner: MetodologIA
  lifecycle_state: active
  execution_scope: local-design-and-validation
---

# Remotion Video Production V2

Adaptar el flujo Remotion existente a las interfaces V2 sin reescribir su implementación ni elevar
su licencia. Cargar `skills/remotion-video-production/SKILL.md` para reglas audiovisuales,
determinismo, schemas y gates; aplicar esta skill como overlay de compatibilidad.

## Entrada V2

1. Validar `ContentWorkOrderV2` y exigir `contentType: reel-motion` o un tipo Motion registrado.
2. Resolver `CanonicalEditorialUnitV1`, BrandProfile, VoiceProfile, ChannelProfile y
   ContentTypeDefinition por hash.
3. Convertir la entrada al `render-input.schema.json` V1 mediante un adapter puro y trazable.
4. Registrar el hash de entrada V2 y el hash del input V1 derivado.

## Ejecución y salida

1. Mantener Remotion `4.0.494`, React 19 y Zod 4 fijados.
2. Aplicar las reglas offline, frame-driven, assets/licencias, captions y QA de la skill V1.
3. Envolver el `RenderOutput` V1 en `CandidatePackageV2`; conservar el receipt V1 y su hash.
4. Registrar producer, RT-09 y Guardian como identidades distintas.
5. Emitir únicamente `RENDERED_DRAFT`.

## Compatibilidad

Conservar los outputs históricos de VS-001 byte-idénticos. Crear receipts nuevos con IDs derivados
del hash; no reutilizar IDs ni rebrandear historia. Agregar tipos Motion mediante plugin, manifest,
fixtures y tests; no modificar el core ni el orquestador.

## Stop rules

Heredar todos los stop rules V1. Mantener el uso comercial/productivo bloqueado por el gap de
licencia del runtime. Rechazar perfil de canal vencido para `READY`, fuente/claim stale, red,
aleatoriedad, aprobación ausente o solicitud de publicación.

## Fixtures y checks

Usar `fixtures/positive/v2-adapter.yml` y `fixtures/negative/production-license.yml`. Ejecutar los
cuatro checks de la skill V1, `pnpm verify:orchestration` y `pnpm verify:skills`.
