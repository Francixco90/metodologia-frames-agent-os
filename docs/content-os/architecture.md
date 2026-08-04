# Content OS — architecture

> Define Content OS: el OS agéntico creativo evoluciona a **dual paradigm**
> (Remotion + HTML+GSAP) con media **offline-default + remote-opt-in**. Esta
> arquitectura gobierna las skills `content-os-*` de Fases 2-4. Fase 1 del
> programa Content OS.
>
> **Alcance multi-vendor (2026-08-04)**: el programa se expandió beyond Fase 0.
> 4 publishers vendored reference-only (48 HyperFrames, 11 Remotion, 3 Bento,
> 3 Scroll). 26 homólogos H-03 hash-bound en
> `registries/skills/creation-v3-skill-registry.yml` (17 originales, 9 Fase 2A
> batches 1-3). Ver `roadmap.md` para el estado del programa multi-vendor
> (Fases 2A-2D, Fase 3-4 reconcile). [DOC]

## 1. Dual paradigm

Dos runtimes coexistentes. El router despacha por intent; no acopla.

| runtime                  | modelo                                               | determinismo                                              | uso                                                                          |
| ------------------------ | ---------------------------------------------------- | --------------------------------------------------------- | ---------------------------------------------------------------------------- |
| **Remotion** (existente) | React frame-driven, frame clock, offline             | frame clock absoluto, sin wall-clock                      | renders gobernados client-facing, data-viz, certificates, scroll experiences |
| **HTML+GSAP** (nuevo)    | composiciones HTML + `data-*` timing + GSAP seekable | GSAP scrubbed a frame `t`, media playback framework-owned | workflows source→video (PR/text/website→video), motion graphics, explainer   |

`content-os-remotion-bridge` (Fase 4) hace la interop explícita y SSIM-graded
(Remotion→HTML y HTML→Remotion). El bridge es opt-in; ningún workflow lo requiere
por defecto.

## 2. Runtime HTML→MP4 — decisión

HyperFrames renderiza HTML→MP4 driviendo un headless browser por frame time,
screenshot, pipe a FFmpeg `image2pipe`. El upstream `@hyperframes/engine` usa
**Puppeteer** (`puppeteer` + `puppeteer-core` ^25.2.1).

El proyecto pinner **Playwright 1.61.1** (ya usado en
`renderers/static-social/scripts/render-carousel.ts` para screenshots de carousel).

### Opciones evaluadas

- **Option A — vendor engine source + port Puppeteer→Playwright.** Copiar
  `packages/engine/` y portear las llamadas Puppeteer a Playwright. Mantengo
  offline-pinning, sin dep-audit cascade. Costo: porteo moderado (Puppeteer y
  Playwright APIs difieren en screenshot/evaluate/CDP).
- **Option B — npm dep `@hyperframes/engine`.** Trae Puppeteer + descarga Chromium
  propio (~170MB). Duplica browser engine, rompe offline-pinning, muta
  `package.json` (cascade `RCP-DEP-PRODUCTION`). Rechazada.
- **Option C — vendor engine source, keep Puppeteer.** Aísla engine con Puppeteer
  opcional. Honesta con upstream pero añade un segundo browser engine al repo.
  Rechazada por superficie de deps.
- **Option D — adapter local Playwright, engine upstream como referencia.**
  Construir un adapter HTML→MP4 thin sobre el Playwright pinneado. El algoritmo
  (seek GSAP a `t` vía `page.evaluate`, `page.screenshot`, pipe FFmpeg) se
  reimplementa localmente; `packages/engine/` upstream queda como referencia
  auditable (no ejecutada). Sin mutar `package.json`. Reusa el patrón de
  `render-carousel.ts`.

### Decisión: **Option D**

- Reusa Playwright pinneado (offline, ya instalado, ya usado).
- Sin mutar `package.json` → sin cascade `RCP-DEP-PRODUCTION`.
- Fail-closed + offline-first preservados.
- `content-os-core` (Fase 2a) incluye el render adapter. Engine upstream es
  referencia documental en `docs/hyperframes/architecture.md`.

El adapter vive en `skills/content-os-core/scripts/render-html.mjs` (o `.ts`).
Contrato: input composición HTML + frame range + fps → frames PNG → FFmpeg → MP4.
Determinismo: GSAP scrubbed, sin `Date.now()`/`Math.random()` en composition, sin
network en render path.

## 3. Media model — dual offline + remote opt-in

| concern       | offline (default)                     | remote (opt-in, auth-gated)                      |
| ------------- | ------------------------------------- | ------------------------------------------------ |
| TTS           | Piper / Coqui local engines           | HeyGen TTS (vía adapter `media-use`, auth-gated) |
| transcription | whisper.cpp local                     | OpenAI Whisper API (opt-in)                      |
| bg-removal    | ffmpeg local                          | providers remotos (opt-in)                       |
| media resolve | file local + framework-owned playback | URL fetch (auth-gated, offline fallback)         |

`content-os-media` (Fase 2e) implementa la resolve cascade. Reglas:

- **Fail-closed sin credenciales**: los adapters remotos error (no degradan) sin
  auth. Pattern `npx … auth status`.
- **Offline por defecto**: el render path default no toca network.
- **Opt-in por proyecto**: un proyecto declara explícitamente qué adapters
  remotos habilita; sin declaración, solo offline.
- Los placeholders del vendor (`media-use` fixtures, token ficticio `at_test`) NO
  se reusan; el adapter local usa su propio contrato de credenciales.

## 4. Intent router

`content-os-router` (Fase 2g) extiende el router Capa A (cabina, en `CLAUDE.md`)
con rutas source→video. No reemplaza el router de cabina; añade un despachador de
intents de contenido:

```
intent(text → video)        → content-os-faceless-explainer
intent(pr → video)          → content-os-pr-to-video
intent(url → video)         → content-os-website-to-video  (Fase 3, nombre final TBD)
intent(launch → video)      → content-os-product-launch-video
intent(short motion)        → content-os-motion-graphics
intent(captions overlay)    → content-os-embedded-captions
intent(deck navigable)      → content-os-slideshow
intent(general)             → content-os-general-video
```

Cada workflow es orchestrador (steps gated), delega design/motion a capability
skills (Fase 2) y media a `content-os-media`. Output `RENDERED_DRAFT` (no
`READY`/`PUBLISHED` sin gates humanos G13-G17).

## 5. Determinism contract (adaptado de HyperFrames)

Hereda de HyperFrames + añade fail-closed local:

- GSAP seekable (scrub a frame `t`, no wall-clock).
- Media playback framework-owned (start/stop determinístico por clip).
- Sin `Date.now()` / `Math.random()` en composition code.
- Sin network en render path default.
- **fail-closed**: remote adapters error sin credenciales (no degradan).
- **hash-bound**: cada skill `content-os-*` registrada con `content_sha256` +
  `package_manifest_sha256` + 4 lifecycle events append-only.
- **offline-first media**: default local; remote es opt-in por proyecto.
- **RENDERED_DRAFT != FINAL != HUMAN_APPROVED != READY != PUBLISHED**.

## 6. Registration contract (por skill nueva)

Cada `content-os-*` sigue el contrato load-bearing (Fase 0 plan):

1. Elegir registry: `creation-v3-skill-registry.yml` (H-03 slim) para skills
   HTML+GSAP puras; `skill-registry.yml` (v2 full) para las que tocan brand
   (`content-os-creative`) o reusan shared license `LicenseRef-MetodologIA-Internal`.
2. `skills/<id>/` con `SKILL.md` (frontmatter, ≤1200 palabras, sin paths
   absolutos), `LINEAGE.yml` (`content_origin: locally_authored_adaptation`,
   `external_fragments_reused: false`, `publication_authority: false`,
   `authority_refs[]` resolving), `fixtures/positive/` + `fixtures/negative/`
   (v2) o checker local (creation-v3).
3. Hashes inline: `content_sha256 = sha256(SKILL.md)`,
   `package_manifest_sha256 = sha256` del ledger sorted `<hash>  <relpath>`.
4. Registry entry + 4 lifecycle events (`null→candidate→quarantined→evaluated→active`).
5. Wire validator hardcoded (`scripts/check-instagram-v2-skills.ts` o
   `check-creation-v3-skills.ts`). v2: + `applies_to.package_refs` en
   `skills/instagram-v2-content-license-receipt.yml`.
6. `registries/skills/README.md` counts a mano.
7. `pnpm verify:skills` verde (chained).
8. Si muta `package.json`: regen `RCP-DEP-PRODUCTION`. Option D evita esto
   (Playwright ya pinneado, sin runtime deps nuevas en Fase 2).

## 7. Lo que Content OS NO es

- No reemplaza Remotion. Coexisten.
- No ejecuta vendors. `skills/vendor/**` es reference-only (4 publishers: 48
  HyperFrames + 11 Remotion + 3 Bento + 3 Scroll).
- No publica. n8n dry-run, gates G13-G17 manuales.
- No mezcla marcas. MetodologIA es la única identidad visible.
