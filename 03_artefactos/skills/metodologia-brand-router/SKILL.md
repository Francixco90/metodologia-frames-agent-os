---
name: metodologia-brand-router
description: This skill should be used when the user asks to "apply MetodologIA branding", "adapt content to the MetodologIA voice", "resolve the social brand profile", or "check a MetodologIA asset for brand drift".
version: 0.2.0
license: LicenseRef-MetodologIA-Internal
compatibility: Requires BrandProfileV2, VoiceProfileV2, ChannelProfileV1 and generated brand projections.
metadata:
  owner: MetodologIA
  lifecycle_state: active
  execution_scope: internal-brand-routing
---

# MetodologIA Brand Router

## Contexto operativo

Lee [`context.md`](context.md) antes de cargar referencias. Define el contexto mínimo, la ruta, los efectos permitidos, los gates y el handoff de esta skill.

Resolver la identidad visual, la voz y la adaptación de canal antes de producir un candidato. Usar
esta skill como router; no duplicar tokens, listas de voz o reglas de canal dentro de cada renderer.

## Preflight

1. Leer `registries/brand/brand-profile-v2.yml`,
   `registries/brand/voice-profile-v2.yml` y el perfil de canal declarado por el work order.
2. Verificar las referencias y SHA-256 del bundle de fuentes, tokens, tipografías y licencias.
3. Ejecutar `pnpm brand:generate` y `pnpm verify:brand`; exigir paridad CSS, TypeScript y JSON.
4. Clasificar cada decisión como `preserve`, `adapt` o `exclude` usando
   `registries/brand/brand-adaptation-decision-v1.yml`.

## Routing

- Preservar naming, pilares, Minto, evidencia honesta, tokens semánticos y CTA de un movimiento.
- Adaptar densidad, tono, dimensiones y safe zones desde `ChannelProfile`, nunca desde literales del
  renderer.
- Excluir fuentes dirty, emojis estructurales, blanco sobre dorado, colores de marca fuera de la
  proyección y copy incrustado en código.
- Mantener español latino neutro por defecto. Crear una variante explícita para EN o PT.

## Salida

Emitir referencias portables a `BrandProfileV2`, `VoiceProfileV2`, `ChannelProfileV1` y
`BrandAdaptationDecisionV1`, cada una con hash. Registrar las decisiones preserve/adapt/exclude y
los gaps sin copiar el contenido completo de los perfiles.

## Stop rules

Detener con el error estable correspondiente ante perfil ausente, hash stale, fuente dirty usada
como autoridad, licencia de font no resuelta, red list incumplida o contraste insuficiente.
`VOICE_CANDIDATE` permite borrador interno; bloquea `READY`, aprobación humana y publicación.

## Fixtures y checks

Usar `fixtures/positive/route.yml` y `fixtures/negative/stale-profile.yml`. Ejecutar
`pnpm verify:skills` antes de aceptar una nueva versión.
