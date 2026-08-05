---
name: content-os-remotion-saas
description: This skill should be used when the user asks to "build an app with Remotion", "Remotion SaaS", "Remotion video editor app", "Remotion render form / endpoint", "Remotion cloud rendering", or "Remotion Studio as an app". Build an app around Remotion: a form hooked up to a render, a video editor UI, or a cloud-render pipeline. Sits beside `remotion-video-production` (MetodologIA canonical). Clean-room prose from the Remotion publisher reference (source-available, Remotion AG). Output stays RENDERED_DRAFT; production gates G13-G17 manual. Unclear → content-os-remotion-best-practices.
version: 0.1.0
license: LicenseRef-MetodologIA-Internal
compatibility: Requires exact H-03 toolchain pins (Remotion 4.0.494, React 19). Sits beside `remotion-video-production`. App/edge layer is out of render path; render stays deterministic. No runtime dependency added.
metadata:
  owner: MetodologIA
  lifecycle_state: active
  execution_scope: local-evaluation
  model_agnostic: true
---

# Remotion SaaS — build an app around Remotion

Derivada de `remotion-saas` (`remotion/remotion-publisher`, source-available
Remotion AG). Locally-authored clean-room prose adaptation for the Frames ContentOS
toolchain. Vendor reference: `skills/vendor/remotion-publisher/remotion-saas/SKILL.md`
(read-only). Sits beside `remotion-video-production` (MetodologIA canonical).

One can build apps with Remotion — a simple form hooked up to a render, or a complex
video editor. This skill covers the app shell around Remotion; it does not author
composition markup (`content-os-remotion-markup`) or render locally
(`content-os-remotion-render`).

## App shapes

- **Form → render** — a form collects inputs; on submit, a composition renders with those
  inputs as props. The render is deterministic given the props.
- **Video editor UI** — a Studio-like editor that edits composition props / keyframes; the
  render is still frame-driven and deterministic.
- **Cloud render pipeline** — an endpoint enqueues a render job; the render runs on a
  worker with the exact toolchain pins.

## Separation of concerns

- **App / edge layer** — UI, forms, auth, queues, the vendor's SaaS SDK. This layer may use
  network, events, `Date.now()` for timestamps, etc.
- **Render path** — the composition itself. Only `useCurrentFrame()` + `interpolate()` +
  the props the app layer passed in. No network, no DOM events, no temporal APIs.

The render path is `local_capability_only`; the app/edge layer is out of scope of the
determinism contract but must pass deterministic props to the render.

## Determinism contract

Same props + frame ⇒ same pixel output, at any concurrency. The app layer may be
non-deterministic (user input, network); the render path must not be. A render is
`RENDERED_DRAFT`; production gates G13-G17 manual. Cloud rendering does NOT grant
`HUMAN_APPROVED`, `READY`, or `PUBLISHED`.

## License for SaaS / commercial

A SaaS that renders Remotion for paying customers may require the Remotion Company
License — confirm the license verdict for the target use case
(`receipts/dependency-audits/H03-LIC-REMOTION-001.yml`). Do NOT assume the Free License
covers commercial SaaS rendering. Stop if the license verdict is unresolved for the use
case.

## Remote media + auth

Remote media in the render path is opt-in auth-gated fail-closed. App-layer credentials
never reach the render path; pass only the resolved first-party version-pinned asset
references as props.

## Preflight

1. Confirm exact toolchain pins (Remotion 4.0.494, React 19).
2. Confirm the Remotion license verdict for the SaaS / commercial use case
   (`H03-LIC-REMOTION-001.yml`).
3. Confirm the app/edge layer passes deterministic props; render path stays pure.
4. Stop on: network/credentials in render path, unpinned assets, ambiguous license,
   production request without human gate approval.

## Stop rules

Reject `Math.random`, `Date.now`, `new Date`, `fetch`, `setTimeout`, `setInterval` in the
render path (app layer is out of scope), credentials/PII in render path, unpinned remote
assets, an unresolved Company License verdict for commercial rendering, and production /
publish requests. Remotion stays `local_evaluation` until the license verdict and G13-G17
gates resolve.

## Verificación

```bash
node skills/content-os-remotion-saas/scripts/check-skill.mjs
pnpm typecheck
pnpm verify:skills
```

Conservar `remotion-video-production`, VS-001, H-01, H-02, n8n y `Root.tsx`
byte-idénticos.

## Referencias

- `skills/remotion-video-production/SKILL.md` — MetodologIA canonical Remotion skill (authority sibling).
- `skills/vendor/remotion-publisher/remotion-saas/SKILL.md` — vendor reference (read-only, source-available Remotion AG).
- `receipts/dependency-audits/H03-LIC-REMOTION-001.yml` — Remotion license verdict + source-available-publisher addendum.
