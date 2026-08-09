---
name: content-os-creative
description: This skill should be used when the user asks to "apply brand tokens to a Frames ContentOS composition", "plan story beats and narration for a video", "pick a composition pattern (PiP, title card, stats)", "audit a creative brief for lazy defaults", or "resolve MetodologIA brand profile for a composition".
version: 0.2.0
license: LicenseRef-MetodologIA-Internal
compatibility: Requires the content-os-core HTML composition contract, content-os-animation seek-safe rules, and the metodologia-brand-router (BrandProfileV2, VoiceProfileV2, ChannelProfileV1). Offline render profile only. No external fonts, no external assets, no network.
metadata:
  owner: MetodologIA
  lifecycle_state: active
  execution_scope: local-evaluation
---

# Frames ContentOS Creative

## Contexto operativo

Lee [`context.md`](context.md) antes de cargar referencias. Define el contexto mínimo, la ruta, los efectos permitidos, los gates y el handoff de esta skill.

Direction creativa **no-animacion** para composiciones HTML+GSAP de Frames ContentOS: brand
(tokens, voz, canal), pacing (story spine, beats, rhythm), narration (script, tone,
openings), y composition (patterns, hierarchy, density). Aplica los perfiles de
`metodologia-brand-router` a composiciones; **no gobierna brand** — delega al router.
Adaptado de `hyperframes-creative` (vendor referencia) al arquitectura local fail-closed +
offline-first.

Para motion-craft (reglas, blueprints, transiciones) ver `content-os-animation`. Para
pose contract + lint ver `content-os-keyframes`. Esta skill anade **direction creativa**
encima del contrato tecnico.

## Preflight (siempre)

1. Resolver brand: leer `registries/brand/brand-profile-v2.yml`,
   `voice-profile-v2.yml` y el `ChannelProfileV1` declarado por el work order via
   `metodologia-brand-router`. Verificar hashes del bundle de fuentes/tokens/licencias.
2. Clasificar cada decision como `preserve`, `adapt` o `exclude` usando
   `registries/brand/brand-adaptation-decision-v1.yml`.
3. Si no hay design spec del proyecto, elegir ruta (house-style defaults / composition
   pattern / design picker). Ver `references/house-style.md` primero para evitar
   defaults web genericos.
4. Para multi-scene, planear beats y rhythm antes de escribir HTML. Ver
   `references/narration-and-pacing.md`.

## Default: aplica brand router + house-style

Corre `scripts/creative-audit.mjs <brief.yml>` antes de render. El auditor extrae
`brandRef`, `voiceRef`, `channelRef`, story spine beats, detecta fonts/assets externos
(no offline-first), lazy defaults web (blanco puro, sombras suaves, copy generico), y
emite `creative-audit.json` (schemaVersion `content-os-creative-audit-v1`). Falla closed
si brandRef ausente o font/asset externo detectado.

## Routing

| Topic                                                        | Carga                                                 |
| ------------------------------------------------------------ | ----------------------------------------------------- |
| Aplicar brand tokens (colores, fonts, voz)                   | metodologia-brand-router + rules/creative-contract.md |
| Planear story spine, beats, rhythm                           | references/narration-and-pacing.md                    |
| Composition patterns (PiP, title card, stats, slideshow)     | references/composition-patterns.md                    |
| Evitar defaults web genericos, layer recipe                  | references/house-style.md                             |
| Auditar brief creativo (brand refs, lazy defaults, externos) | scripts/creative-audit.mjs                            |
| Narration (script pacing, tone, openings)                    | references/narration-and-pacing.md §Narration         |

## Creative Contract (ground truth)

1. **Brand truth viene del router.** Colores, fonts, voz, tokens semanticos, CTA de un
   movimiento — preservar. No hardcodes literales en HTML; referencea tokens del
   BrandProfile.
2. **No lazy defaults web.** Blanco puro, sombras suaves, copy generico, gradientes
   genericos — cuestionarlos. La prompt interpretada genera un concepto, no un restyle
   literal. Ver `references/house-style.md`.
3. **Video-medium density, no web-page empty.** Escala, depth, foreground detail. Una
   composicion de video no es una web page. Ver `references/composition-patterns.md`.
4. **Story spine antes de HTML.** Hook, value-before-evidence, beats con timestamps.
   Narration = propuesta, no filler. Ver `references/narration-and-pacing.md`.
5. **Offline-first fonts/assets.** System fonts o fonts del brand bundle (pinned local,
   licencia resuelta). No Google Fonts CDN, no external assets, no network. Hereda
   `content-os-core` render adapter (hook rechaza no-`file:`/`data:`).
6. **No extra scenes/narration/music/captions/transitions** salvo que el request lo pida
   o propongas la expansion explicita.
7. **Espanol latino neutro por defecto.** Variante explicita para EN o PT (via
   VoiceProfile).
8. **Motion guardrails** heredados de `content-os-animation` (seek-safe, finite repeats,
   stagger cap). Esta skill es no-animacion; no duplica reglas de motion.

## Composition Patterns (offline-first)

| Pattern                  | Use                           | Density                     |
| ------------------------ | ----------------------------- | --------------------------- |
| Title card               | Hook single-shot, logo lockup | 1 hero + 1 supporting       |
| PiP (picture-in-picture) | Speaker + slide simultaneo    | 2 layers, foreground detail |
| Text-behind-subject      | Tipografia como ambiente      | 1 subject + 1 type layer    |
| Stats / data-in-motion   | Numero clave + contexto       | 1 stat + 1 annotation       |
| Slideshow                | Navegable deck (no MP4)       | 1 card por slide            |
| Lower-third              | Caption/credit overlay        | 1 bar + 1 lockup            |

Ver `references/composition-patterns.md` para recipes.

## Pacing & Narration

- **Hook** < 3s: gancho concreto, no introduction lenta.
- **Value-before-evidence**: promesa antes del demo.
- **Beats con timestamps**: cada beat tiene `data-at` (alinea con pose contract de
  `content-os-keyframes`).
- **Rhythm**: alterna tense/release. No beats identicos consecutivos.
- **Openings**: declarativa o interrogativa, nunca apologetica.
- **Number pronunciation**: numeros dichos, no leidos.
- **Storyboard = propuesta**: cada frame argumenta una idea.

Ver `references/narration-and-pacing.md`.

## Critical Constraints

- Brand tokens via referencia (no hardcode). Hereda `metodologia-brand-router`.
- No Google Fonts CDN / external font URLs / external assets (offline-first).
- No `Date.now()`/`Math.random()`/`new Date()` en composition (hereda `content-os-core`).
- No network (hereda render adapter hook).
- Stagger cap <= 0.5s, finite repeats (hereda `content-os-animation`).
- No CSS `transition:` en elementos animados (usa GSAP, hereda animation).
- No `transition:`/`repeat: -1`/relative `+=` (hereda keyframes).

## Stop rules

- Brand refs resueltos (brandRef/voiceRef/channelRef), hashes vigentes: STOP preflight.
- Story spine declarado (hook + beats + final), no lazy defaults: STOP planning.
- `creative-audit.mjs` PASS (brandRef presente, no externos, no lazy defaults): STOP.
- Sin brand resuelto, no marks `RENDERED_DRAFT`. Escala a `coverage_gap` si perfil
  ausente o hash stale.

## Done

Brand tokens aplicados via referencia, story spine con beats timestamped, composition
pattern elegido, `creative-audit.mjs` PASS, motion hereda seek-safe. `RENDERED_DRAFT` !=
`HUMAN_APPROVED` != `READY` != `PUBLISHED`. `VOICE_CANDIDATE` permite borrador interno;
bloquea `READY`, aprobacion humana y publicacion (hereda router).
