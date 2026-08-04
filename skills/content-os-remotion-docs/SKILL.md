---
name: content-os-remotion-docs
description: This skill should be used when the user asks to "search Remotion docs", "look up Remotion API", "find current Remotion documentation", "Remotion docs as markdown", "Remotion Algolia search", or "is this Remotion API current". Discover and read current Remotion documentation at authoring time via the Algolia docs search index and the .md suffix on docs URLs. Sits beside `remotion-video-production` (MetodologIA canonical). Clean-room prose from the Remotion publisher reference (source-available, Remotion AG). Doc search is authoring-time only, never a render-path operation. Output stays RENDERED_DRAFT; production gates G13-G17 manual. Unclear → content-os-remotion-best-practices.
version: 0.1.0
license: LicenseRef-MetodologIA-Internal
compatibility: Requires exact H-03 toolchain pins (Remotion 4.0.494, React 19). Sits beside `remotion-video-production`. Doc search is authoring-time; the render path is unaffected. No runtime dependency added.
metadata:
  owner: MetodologIA
  lifecycle_state: active
  execution_scope: local-evaluation
  model_agnostic: true
---

# Remotion Docs — discover and read current documentation

Derivada de `remotion-docs` (`remotion/remotion-publisher`, source-available
Remotion AG). Locally-authored clean-room prose adaptation for the Frames ContentOS
toolchain. Vendor reference: `skills/vendor/remotion-publisher/remotion-docs/SKILL.md`
(read-only). Sits beside `remotion-video-production` (MetodologIA canonical).

This skill handles **authoring-time** documentation discovery. It does not scaffold
(`content-os-remotion-create`), author markup (`content-os-remotion-markup`), or render
(`content-os-remotion-render`). Doc search is never part of the render path.

## Authoring-time only

The Remotion docs site exposes a search index (Algolia) and a Markdown suffix on every
docs URL. Use them to look up the **current** API at authoring time rather than relying on
memorized knowledge, which may lag the pinned toolchain.

The pinned toolchain is Remotion 4.0.494 / React 19.2.7 (see `package.json`). The vendor
docs may reflect a newer version (e.g. 4.0.505) — cross-check any API against the pinned
version before adopting it. If a docs API is absent in the pinned version, do not use it.

## Search the docs index

Query the docs search index for relevant pages. Each hit carries a `url` pointing to the
documentation page. Pick the most relevant URL(s) and fetch the Markdown source.

## Fetch a page as Markdown

Append `.md` to any Remotion docs URL to retrieve its Markdown source (token-efficient):
`https://www.remotion.dev/docs/<slug>.md`. Read the current documentation and implement
against it, reconciled to the pinned toolchain version.

## Workflow

1. Search the docs index for the concept or API needed.
2. Pick the most relevant URL(s).
3. Fetch each URL with the `.md` suffix.
4. Reconcile the documented API to the pinned toolchain (4.0.494) before adopting.
5. Implement against current docs, not memorized API knowledge.

## Determinism contract

Doc search is authoring-time and out of the render path. The render path is unchanged:
`useCurrentFrame()` + `interpolate()` only. No `fetch`, `Math.random`, `Date.now`,
`new Date`, `setTimeout`, `setInterval` in the render path. Fetching docs at authoring time
is fine; fetching docs **inside a composition** at render time is forbidden. A render is
`RENDERED_DRAFT`; production gates G13-G17 manual.

## Preflight

1. Confirm exact toolchain pins (Remotion 4.0.494, React 19).
2. Confirm the Remotion license verdict (`H03-LIC-REMOTION-001.yml`).
3. Confirm doc search happens at authoring time, not in the render path.
4. Stop on: doc-fetch inside a composition, adopting an API absent in the pinned version,
   production request without human gate approval.

## Stop rules

Reject doc-fetch inside a composition (network in render path), `Math.random`, `Date.now`,
`new Date`, `fetch`, `setTimeout`, `setInterval` in the render path, adopting an API absent
in the pinned toolchain version, unpinned remote assets, and production / publish requests.
Remotion stays `local_evaluation` until the license verdict and G13-G17 gates resolve.

## Verificación

```bash
node skills/content-os-remotion-docs/scripts/check-skill.mjs
pnpm typecheck
pnpm verify:skills
```

Conservar `remotion-video-production`, VS-001, H-01, H-02, n8n y `Root.tsx`
byte-idénticos.

## Referencias

- `skills/remotion-video-production/SKILL.md` — MetodologIA canonical Remotion skill (authority sibling).
- `skills/vendor/remotion-publisher/remotion-docs/SKILL.md` — vendor reference (read-only, source-available Remotion AG).
- `receipts/dependency-audits/H03-LIC-REMOTION-001.yml` — Remotion license verdict + source-available-publisher addendum.
