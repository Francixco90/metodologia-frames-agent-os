# Contributing a new block or component

Autorar un NUEVO item de registry (caption style, VFX block, transition, lower
third, o component reusable) y shippearlo como PR upstream — no instalar uno
existente.

## Workflow: idea → scaffold → build → validate → hash → register → PR

### 1. Idea

Define: tipo (block | component), nombre kebab-case, tags, dimensions (block
only), duration_s (block only), composition_id (block only). Describe qué hace
y por qué es reusable.

### 2. Scaffold

Crea archivos locales:

- `registry/blocks/<name>.html` (block) o `registry/components/<name>.html`
  (component).
- El HTML incluye: `data-composition-id="<name>"` (block), GSAP timeline
  `paused: true` registrado en `window.__timelines[<name>]`, seek-safe (scrubbed
  a frame `t`).

### 3. Build

Sigue los contratos heredados:

- `content-os-core`: HTML composition contract, no `Date.now()`/`Math.random()`/
  `new Date()`/`fetch`/`setTimeout`/`setInterval`/`performance.now()`.
- `content-os-animation`: GSAP seek-safe (paused, fromTo absolute, finite repeats,
  stagger cap ≤0.5s, no relative `+=`, no `repeat: -1`).
- `content-os-keyframes`: pose contract (endpoint-only, identity-break, fake-3d,
  end-on-black, reset-to-rest, unseekable).
- `content-os-creative`: brand tokens via `metodologia-brand-router` (no
  hardcodes), offline-first fonts/assets.
- `content-os-media`: media resuelto via cascade offline (no external assets).

### 4. Validate

```bash
node skills/content-os-keyframes/scripts/pose-lint.mjs registry/blocks/<name>.html
node skills/content-os-animation/scripts/animation-map.mjs registry/blocks/<name>.html
node skills/content-os-registry/scripts/registry-audit.mjs registry/registry.jsonl --out <dir> --strict
```

Todos PASS. Sin PASS, no se registra.

### 5. Hash

Computa `sha256` del block file (UTF-8):

```bash
node -e "const c=require('crypto');console.log(c.createHash('sha256').update(require('fs').readFileSync('registry/blocks/<name>.html','utf8')).digest('hex'))"
```

### 6. Register

Append entry a `registry/registry.jsonl`:

```json
{
  "id": "<name>",
  "type": "block",
  "title": "...",
  "description": "...",
  "tags": ["..."],
  "dimensions": "1920x1080",
  "duration_s": 15,
  "files": ["registry/blocks/<name>.html"],
  "sha256": "<64hex>",
  "seek_safe": true,
  "offline": true,
  "composition_id": "<name>"
}
```

### 7. PR

Commit Conventional Commits + `[CÓDIGO]`. PR a `Francixco90`. CI verde
(`verify:skills` + `check:repo` + `typecheck` + `lint` + `test` + `format:check`).
Merge requiere aprobación humana explícita.

## Templates

### Block minimal

```html
<!doctype html>
<html lang="es">
  <head>
    <meta charset="utf-8" />
    <style>
      :root {
        --block-surface: #0b0d12;
        --block-foreground: #f5f7fa;
      }
      body {
        margin: 0;
        background: var(--block-surface);
      }
      .stage {
        width: 1920px;
        height: 1080px;
        position: relative;
      }
      .label {
        font:
          700 64px system-ui,
          sans-serif;
        color: var(--block-foreground);
      }
    </style>
    <script src="gsap/dist/gsap.min.js"></script>
  </head>
  <body>
    <div class="stage" data-composition-id="data-chart">
      <div class="label">Content OS</div>
    </div>
    <script>
      gsap.timeline({paused: true, id: 'data-chart'});
      window.__timelines = window.__timelines || {};
      window.__timelines['data-chart'] = gsap.timeline({paused: true});
      window.__timelines['data-chart'].fromTo(
        '.label',
        {autoAlpha: 0, y: 20},
        {autoAlpha: 1, y: 0, duration: 0.5},
        0,
      );
    </script>
  </body>
</html>
```

### Component minimal

Sin `data-composition-id`, sin dimensions. Paste markup + style + script en host.

## Reglas

- Sin network en build/validate/hash/register (offline-first).
- Sin `Date.now()`/`Math.random()`/`fetch`/`setTimeout` (hereda core).
- `seek_safe: true` obligatorio para blocks con timeline.
- `offline: true` obligatorio (no external assets/Google Fonts CDN).
- `sha256` obligatorio (hash-bound).
- `composition_id` obligatorio para blocks (matchea `data-composition-id`).
