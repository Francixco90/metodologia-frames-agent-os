---
name: content-os-registry
description: This skill should be used when the user asks to "discover a reusable Content OS block", "install a registry block locally", "wire a block into a composition via data-composition-src", "paste an effect component snippet", "contribute a new block to the local registry", or "audit a registry manifest for missing hashes or unseekable blocks".
version: 0.1.0
license: LicenseRef-MetodologIA-Internal
compatibility: Requires the content-os-core HTML composition contract, content-os-animation seek-safe rules, and content-os-keyframes pose contract. Registry blocks are hash-bound, offline-first, seek-safe, deterministic. No network, no external assets.
metadata:
  owner: MetodologIA
  lifecycle_state: active
  execution_scope: local-evaluation
---

# Content OS Registry

Registry de **bloques reusables** para composiciones Content OS: sub-compositions
(blocks) + effect snippets (components). Adaptado de `hyperframes-registry`
(vendoreado Fase 0, Apache 2.0, reference-only) al arquitectura local hash-bound +
offline-first + seek-safe.

Diferencia con el vendor: no hay CLI `hyperframes add` con network fetch. El
registry es un **manifest local** (`registry/registry.jsonl`) + directorio
`registry/blocks/` + `registry/components/`. Cada bloque es hash-bound (sha256),
seek-safe (GSAP `paused: true`, scrubbed), offline-first (no external assets, no
network), deterministic. Instalar = copiar local + registrar hash.

- **Blocks** — sub-compositions standalone (propias dimensions, duration, timeline).
  Se incluyen via `data-composition-src` en una composition host.
- **Components** — effect snippets (sin dimensions propias). Se pegan en el HTML
  host (markup + style + script).

Para motion-craft ver `content-os-animation`. Para pose contract ver
`content-os-keyframes`. Para brand tokens ver `content-os-creative`. Esta skill es
la capa de **reusabilidad** encima del contrato técnico.

## Preflight (siempre)

1. Leer `schemas/registry-block-v1.schema.json` — cada entry registra `id`, `type`
   (`block`|`component`), `title`, `tags`, `dimensions` (blocks only), `duration_s`
   (blocks only), `files[]`, `sha256`, `seek_safe`, `offline`.
2. Verificar `registry/registry.jsonl` vigente (hashes resueltos contra
   `registry/blocks/` + `registry/components/`).
3. Para wiring un block, confirmar `data-composition-id` matchea el block's
   internal ID y `data-composition-src` apunta a archivo local.
4. Correr `scripts/registry-audit.mjs <manifest>` antes de wire. Falla closed si
   un bloque sin sha256, sin seek_safe, o con network/external assets.

## Default: discover + install local

```bash
node <SKILL_DIR>/scripts/registry-audit.mjs registry/registry.jsonl --out <dir>
```

Discovery: leer `registry/registry.jsonl` (manifest local, no network). Filtrar por
`type`, `tags`. Instalar = copiar `registry/blocks/<name>.html` (o
`registry/components/<name>.html`) al proyecto + registrar hash en el manifest
del proyecto (no network, no CLI fetch).

## Routing

| Topic                                                      | Carga                                 |
| ---------------------------------------------------------- | ------------------------------------- |
| Discover blocks/components (local manifest, no network)    | scripts/registry-audit.mjs + examples |
| Install block local (copy + register hash)                 | references/blocks-and-components.md   |
| Wire block via data-composition-src                        | references/blocks-and-components.md   |
| Paste effect component snippet                             | references/blocks-and-components.md   |
| Contribute new block/component (scaffold→validate→hash→PR) | references/contributing.md            |
| Audit registry manifest (missing-sha256, unseekable)       | scripts/registry-audit.mjs            |
| Registry block schema                                      | schemas/registry-block-v1.schema.json |

## Registry Contract (ground truth)

1. **Hash-bound.** Cada bloque en el manifest tiene `sha256` (SKILL.md + files[]).
   Sin hash, no se instala, no se wire. El auditor falla closed.
2. **Seek-safe.** Todo bloque con GSAP timeline declarado `paused: true`,
   scrubbed a frame `t` (hereda `content-os-animation`). No `repeat: -1`, no
   relative `+=`, no `transition:` en elementos animados. `seek_safe: true` en
   manifest.
3. **Offline-first.** No external assets, no network, no Google Fonts CDN, no
   external image/font URLs en bloques (hereda `content-os-core`). Media resuelto
   via `content-os-media` (offline cascade).
4. **Deterministic.** Mismo block + mismo `data-start` → mismo render. Sin
   `Date.now()`/`Math.random()`/`new Date()`/`performance.now()`/`fetch`/
   `setTimeout`/`setInterval` en block code (hereda core).
5. **Block = sub-composition.** Props dimensions, duration, timeline propias. Se
   incluye via `data-composition-src` (path local) + `data-composition-id` (match
   internal ID) + `data-start`/`data-duration`/`data-track-index`/`data-width`/
   `data-height`.
6. **Component = snippet.** Sin dimensions propias. Se pega markup + style +
   script en el host. Si expone GSAP timeline integration, agregar calls al
   timeline host.
7. **No network install.** Instalar = copiar local + registrar hash. Sin CLI
   fetch, sin `curl` registry remoto. El registry es local (manifest + dir).
8. **RENDERED_DRAFT != HUMAN_APPROVED != READY != PUBLISHED.** Bloque reusado
   produce `RENDERED_DRAFT`. `READY`/publicación requiere gates humanos G13-G17.

## Block vs Component

| Aspecto       | Block                         | Component                         |
| ------------- | ----------------------------- | --------------------------------- |
| Dimensions    | propias (data-width/height)   | ninguna                           |
| Duration      | propia (duration_s)           | hereda host                       |
| Timeline      | propia (paused, seek-safe)    | integrada al host timeline        |
| Wiring        | `data-composition-src`        | paste markup + style + script     |
| Install dir   | `registry/blocks/<name>.html` | `registry/components/<name>.html` |
| Manifest type | `block`                       | `component`                       |

Ver `references/blocks-and-components.md` para wiring completo.

## Wiring blocks

```html
<div
  data-composition-id="data-chart"
  data-composition-src="registry/blocks/data-chart.html"
  data-start="2"
  data-duration="15"
  data-track-index="1"
  data-width="1920"
  data-height="1080"
></div>
```

Atributos:

- `data-composition-src` — path local al block HTML.
- `data-composition-id` — debe matchear el block's internal ID.
- `data-start` — cuando el block aparece en el host timeline (seconds).
- `data-duration` — cuanto dura el block.
- `data-width`/`data-height` — canvas dimensions del block.
- `data-track-index` — layer ordering (mayor = frente).

## Critical Constraints

- No `Date.now()`/`Math.random()`/`new Date()`/`performance.now()` en blocks
  (hereda `content-os-core`).
- No `fetch`/`setTimeout`/`setInterval` en block code (hereda core).
- No external assets / network / Google Fonts CDN en blocks (offline-first).
- No `repeat: -1` / relative `+=` / CSS `transition:` en elementos animados
  (hereda `content-os-animation` + `content-os-keyframes`).
- Sin `sha256` en manifest entry, no se instala ni wire.
- `seek_safe: true` obligatorio para blocks con timeline GSAP.
- `data-composition-id` debe matchear block internal ID.

## Stop rules

- Registry manifest auditable (`registry-audit.mjs` PASS), hashes vigentes, todos
  seek_safe + offline: STOP discover.
- Block copiado local + hash registrado + `data-composition-id` match: STOP wire.
- Component snippet pasteado + timeline integration calls agregados: STOP wire.
- Sin sha256 o sin seek_safe: STOP, no instales.

## Done

Block/component descubierto en manifest local, instalado (copy + hash register),
wireado (`data-composition-src` block o paste component), `registry-audit.mjs`
PASS, seek-safe + offline-first + deterministic heredados. `RENDERED_DRAFT` !=
`HUMAN_APPROVED`. `READY`/publicación bloquea gates humanos G13-G17 (manuales por
diseño).
