# Registry Contract — ground truth

8 reglas load-bearing para bloques reusables en Content OS.

## 1. Hash-bound

Cada bloque en el manifest tiene `sha256` (del block file UTF-8). Sin hash, no se
instala, no se wire. El auditor (`registry-audit.mjs`) falla closed.

## 2. Seek-safe

Todo bloque con GSAP timeline declarado `paused: true`, scrubbed a frame `t`
(hereda `content-os-animation`). No `repeat: -1`, no relative `+=`, no CSS
`transition:` en elementos animados. `seek_safe: true` en manifest.

## 3. Offline-first

No external assets, no network, no Google Fonts CDN, no external image/font URLs
en bloques (hereda `content-os-core`). Media resuelto via `content-os-media`
(offline cascade).

## 4. Deterministic

Mismo block + mismo `data-start` → mismo render. Sin
`Date.now()`/`Math.random()`/`new Date()`/`performance.now()`/`fetch`/
`setTimeout`/`setInterval` en block code (hereda core).

## 5. Block = sub-composition

Props dimensions, duration, timeline propias. Se incluye via
`data-composition-src` (path local) + `data-composition-id` (match internal ID) +
`data-start`/`data-duration`/`data-track-index`/`data-width`/`data-height`.

## 6. Component = snippet

Sin dimensions propias. Se pega markup + style + script en el host. Si expone
GSAP timeline integration, agregar calls al timeline host.

## 7. No network install

Instalar = copiar local + registrar hash. Sin CLI fetch, sin `curl` registry
remoto. El registry es local (manifest + dir).

## 8. RENDERED_DRAFT != HUMAN_APPROVED != READY != PUBLISHED

Bloque reusado produce `RENDERED_DRAFT`. `READY`/publicación requiere gates
humanos G13-G17 (manuales por diseño fail-closed).

## Example manifest entry (valid)

```json
{
  "id": "data-chart",
  "type": "block",
  "title": "Data Chart",
  "tags": ["data-viz", "social"],
  "dimensions": "1920x1080",
  "duration_s": 15,
  "files": ["registry/blocks/data-chart.html"],
  "sha256": "<64hex>",
  "seek_safe": true,
  "offline": true,
  "composition_id": "data-chart"
}
```

## Failure modes

| Síntoma                        | Causa                           | Fix                                  |
| ------------------------------ | ------------------------------- | ------------------------------------ |
| `missing-sha256`               | entry sin hash                  | computar sha256 + registrar          |
| `missing-seek-safe`            | block sin seek_safe:true        | validar paused + fromTo absolute     |
| `network-in-block`             | https URL en block/manifest     | congelar local, offline-first        |
| `not-offline`                  | offline != true                 | sin external assets, offline true    |
| `block-missing-dimensions`     | block sin dimensions            | declarar WxH                         |
| `block-missing-duration`       | block sin duration_s            | declarar duration                    |
| `component-with-dimensions`    | component con dimensions        | remover (components no tienen)       |
| `component-with-duration`      | component con duration_s        | remover (components heredan host)    |
| `missing-composition-id`       | block sin composition_id        | declarar (match data-composition-id) |
| `data-composition-id` mismatch | wire id != block composition_id | corregir wire o block id             |
