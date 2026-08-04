# Blocks and components — wiring + install

Dos tipos de bloques reusables en el registry local Frames ContentOS.

## Blocks (sub-compositions)

Standalone: propias dimensions, duration, timeline. Se incluyen via
`data-composition-src` en una composition host.

### Install local (no network)

1. Leer `registry/registry.jsonl` (manifest local) — filtrar por `type: block`,
   `tags`.
2. Copiar `registry/blocks/<name>.html` al proyecto (`compositions/<name>.html` o
   path declarado en project config).
3. Registrar hash (`sha256` del block file) en el manifest del proyecto.
4. Wirear via `data-composition-src` en el host.

No hay CLI fetch, no hay `curl` registry remoto. El registry es local.

### Wiring

```html
<div
  data-composition-id="data-chart"
  data-composition-src="compositions/data-chart.html"
  data-start="2"
  data-duration="15"
  data-track-index="1"
  data-width="1920"
  data-height="1080"
></div>
```

Atributos:

| Atributo               | Descripción                                           |
| ---------------------- | ----------------------------------------------------- |
| `data-composition-src` | path local al block HTML file                         |
| `data-composition-id`  | debe matchear el block's internal composition ID      |
| `data-start`           | cuando el block aparece en el host timeline (seconds) |
| `data-duration`        | cuanto dura el block                                  |
| `data-width/height`    | canvas dimensions del block                           |
| `data-track-index`     | layer ordering (mayor = frente)                       |

**Match obligatorio**: `data-composition-id` debe matchear el
`composition_id` declarado en el manifest entry. Sin match, no se renderiza.

## Components (effect snippets)

Sin dimensions propias. Se pegan en el HTML host: markup + style + script.

### Install local

1. Leer `registry/registry.jsonl` — filtrar por `type: component`.
2. Copiar `registry/components/<name>.html` al proyecto
   (`compositions/components/<name>.html`).
3. Registrar hash en el manifest del proyecto.

### Wiring (paste)

1. Leer el archivo instalado (`compositions/components/<name>.html`).
2. Copiar los HTML elements en el `<div data-composition-id="...">` host.
3. Copiar el `<style>` block en los styles del host.
4. Copiar cualquier `<script>` content en el script del host (antes del timeline
   code).
5. Si el componente expone GSAP timeline integration (ver comment block en el
   snippet), agregar esas calls al timeline host.

## Install locations

| Tipo      | Default dir                           |
| --------- | ------------------------------------- |
| block     | `compositions/<name>.html`            |
| component | `compositions/components/<name>.html` |

Paths configurables en el project config (no en la composition). Sin network.

## Discovery

Leer `registry/registry.jsonl` (manifest local). Filtrar por `type`, `tags`. No
hay `hyperframes catalog` con network — el registry es local, hash-bound. Para
listar:

```bash
node skills/content-os-registry/scripts/registry-audit.mjs registry/registry.jsonl --out <dir>
```

El auditor valida hashes, seek_safe, offline, dimensions por tipo. Sin auditor
PASS, no se instala.
