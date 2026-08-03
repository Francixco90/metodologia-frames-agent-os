# Creative Contract — ground truth rule

Brand truth, no lazy defaults, offline-first, story spine before HTML. Verified by
`creative-audit.mjs` and the brand router preflight, not by logs.

## Contract

1. **Brand truth viene del router.** Colores, fonts, voz, tokens semanticos, CTA de un
   movimiento — preservar via `metodologia-brand-router` (BrandProfileV2, VoiceProfileV2,
   ChannelProfileV1). No hardcodes literales en HTML; referencea tokens semanticos.
2. **No lazy defaults web.** Blanco puro, sombras suaves, copy generico, gradientes
   genericos, 3 cards iguales — cuestionarlos. Interpretar la prompt genera un concepto.
   Ver `references/house-style.md`.
3. **Video-medium density, no web-page empty.** Escala, depth, foreground detail. Una
   composicion de video no es una web page. Ver `references/composition-patterns.md`.
4. **Story spine antes de HTML.** Hook (< 3s), value-before-evidence, beats con
   timestamps, final con CTA del brand. Narration = propuesta, no filler. Ver
   `references/narration-and-pacing.md`.
5. **Offline-first fonts/assets.** System fonts o brand bundle pinned local (licencia
   resuelta). No Google Fonts CDN, no external assets, no network. Hereda
   `content-os-core` render adapter hook.
6. **No extra scenes/narration/music/captions/transitions** salvo que el request lo pida
   o propongas la expansion explicita.
7. **Espanol latino neutro** por defecto. Variante explicita EN/PT via VoiceProfile.
8. **Motion guardrails heredados** de `content-os-animation` (seek-safe, finite repeats,
   stagger cap) y `content-os-keyframes` (pose contract). Esta skill es no-animacion.

## Example (ground truth)

```yaml
schemaVersion: content-os-creative-brief-v1
compositionId: cos-brand-reveal
brandRef: registries/brand/brand-profile-v2.yml
voiceRef: registries/brand/voice-profile-v2.yml
channelRef: registries/brand/source-bundle-v1.yml
compositionPattern: title-card
durationSeconds: 4
storySpine:
  hook: {text: 'Content OS', at: 0}
  beats:
    - {label: 'wordmark', at: 0.2, purpose: 'brand mark entrance', valueBeforeEvidence: true}
    - {label: 'tagline', at: 1.2, purpose: 'value promise'}
    - {label: 'settle', at: 2.6, purpose: 'lockup proof'}
  final: {text: 'MetodologIA', at: 3.6}
palette:
  bg: 'token://brand/surface/deep'
  fg: 'token://brand/foreground/primary'
typography:
  display: 'token://brand/font/display'
constraints: {offlineFontsOnly: true, noExternalAssets: true, noNetwork: true, language: 'es-LATAM'}
```

## Failure modes

| Failure             | Fix                                                                |
| ------------------- | ------------------------------------------------------------------ |
| missing-brandRef    | resolver metodologia-brand-router preflight antes de HTML          |
| external-font       | usar offline brand bundle o system fonts                           |
| external-asset      | resolver asset en inbox (source-lock + derechos) o autorar SVG/CSS |
| lazy-default        | interpretar prompt, generar concepto, no restyle literal           |
| missing-story-spine | declarar hook+beats+final con timestamps antes de HTML             |
| empty-beats         | cada beat necesita `purpose`; cortar o fusionar filler             |

`RENDERED_DRAFT` != `HUMAN_APPROVED` != `READY` != `PUBLISHED`. `VOICE_CANDIDATE` permite
borrador interno; bloquea `READY`, aprobacion humana y publicacion (hereda router).
