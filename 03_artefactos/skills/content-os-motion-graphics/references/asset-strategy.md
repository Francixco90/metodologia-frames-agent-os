# Asset Strategy — Motion Graphics

Reference for Step 1 (plan asset_needs) + Step 2 (source). Asset-first: decide
asset strategy + source real material BEFORE designing the shot.

## The search decision (Step 1)

| Category needs assets? | source_type | asset_needs                 | Step 2      |
| ---------------------- | ----------- | --------------------------- | ----------- |
| kinetic-type           | form        | `[]`                        | skip        |
| stat                   | form        | `[]`                        | skip        |
| charts                 | form        | `[]` (data is content)      | skip        |
| logo-reveal            | form        | `[]` (user logo supplied)   | skip        |
| lower-thirds           | form        | `[]`                        | skip        |
| maps                   | form        | `[]` (or basemap if needed) | skip or run |
| webpage                | search      | `[web query]`               | run         |
| news                   | search      | `[news query]`              | run         |
| tweet                  | search      | `[tweet query]`             | run         |
| asset-fusion           | search      | `[image query]`             | run         |

- **Form categories**: user supplies the content (line, stat, data, logo, name).
  `asset_needs: []`. Skip Step 2.
- **Search-driven**: resolve real material via `content-os-media` search.
  Two-pole queries (broad + specific). Category confirmed by content type
  returned.

## Source (Step 2) — conditional

If `asset_needs` non-empty, resolve via `content-os-media`:

- Search / generate / fetch → frozen project-local paths.
- `assets/index.md` ledger: `{id, kind, source, path, sha256, rights}`.
- Search remote opt-in auth-gated; fail-closed without creds.

### Degrade gracefully

If a search/provider is unavailable:

1. Fall back to asset-free variant of the category (note in `context.log`).
2. E.g. `webpage` → asset-free webpage mock; `asset-fusion` → `charts` fallback.
3. Do NOT fabricate assets (no synthetic "imagine the image looks like...").
4. If no asset-free fallback viable: STOP, mark `coverage_gap`.

### Provenance + rights

- Every resolved asset has `sha256` + `source` + `rights` in `assets/index.md`.
- No asset without provenance. No hotlinking (frozen project-local paths).
- Render-path offline-first: assets staged locally before build (Step 4).

## Asset-free design (form categories)

For `kinetic-type`, `stat`, `charts`, `logo-reveal`, `lower-thirds`: design on
brand tokens (`content-os-creative` preset) + catalog blocks alone. No external
assets. Pure code/text. This is the default, fastest path.

## Optional music bed

Motion-graphics is unnarrated, but a music bed is optional via
`content-os-media` (background, no VO). `vo_mode: silent` regardless. If music
unavailable: silent (no music). No TTS, no SCRIPT.
