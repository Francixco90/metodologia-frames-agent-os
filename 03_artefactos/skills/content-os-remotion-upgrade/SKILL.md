---
name: content-os-remotion-upgrade
description: This skill should be used when the user asks to "upgrade Remotion", "bump Remotion version", "update Remotion packages", "Remotion Mediabunny compatibility", "co-ordinate Remotion versions", or "remotion upgrade / npx remotion upgrade". Upgrade Remotion and related packages with coordinated versions and Mediabunny compatibility, routed through the dependency-receipt cascade. Sits beside `remotion-video-production` (MetodologIA canonical). Clean-room prose from the Remotion publisher reference (source-available, Remotion AG). Toolchain mutation is gated; output stays RENDERED_DRAFT; production gates G13-G17 manual. Unclear → content-os-remotion-best-practices.
version: 0.1.0
license: LicenseRef-MetodologIA-Internal
compatibility: Requires exact H-03 toolchain pins (Remotion 4.0.494, React 19). Sits beside `remotion-video-production`. A toolchain mutation must route through the dependency-receipt cascade and human gates. No runtime dependency added by this skill.
metadata:
  owner: MetodologIA
  lifecycle_state: active
  execution_scope: local-evaluation
  model_agnostic: true
---

# Remotion Upgrade — coordinated package upgrade

Derivada de `remotion-upgrade` (`remotion/remotion-publisher`, source-available
Remotion AG). Locally-authored clean-room prose adaptation for the Frames ContentOS
toolchain. Vendor reference: `skills/vendor/remotion-publisher/remotion-upgrade/SKILL.md`
(read-only). Sits beside `remotion-video-production` (MetodologIA canonical).

This skill documents the **coordinated upgrade** of Remotion and related packages. A
toolchain mutation is a governed event: it must route through the dependency-receipt
cascade (`H03-LOCK-SUCCESSION-001.yml`, `RCP-DEP-PRODUCTION-<date>-001.json`) and the
manual production gates G13-G17. It does not author compositions or render.

## Coordination rules

1. Inspect the project manifests and lockfile to identify the package manager and
   workspaces. Preserve unrelated changes.
2. If `@remotion/cli` is locally available, prefer `npx remotion upgrade` (it also updates
   project-local Remotion skills). Otherwise upgrade manually.
3. Manual upgrade: resolve the latest stable Remotion version with `npm view remotion
version`; upgrade **every** `remotion` and `@remotion/*` dependency to that **exact**
   version. Never mix Remotion versions. Preserve dependency sections and workspace /
   catalog conventions.
4. Read the current Mediabunny compatibility page and upgrade every installed
   `mediabunny` / `@mediabunny/*` package to the documented compatible version.
5. Update the lockfile with the project package manager.

## Receipt cascade (required)

Any `package.json` / lockfile mutation must regenerate the dependency production receipt
(`RCP-DEP-PRODUCTION-<date>-001.json`) and bump `H03-LOCK-SUCCESSION-001.yml`. If the
upgrade introduces a new external dependency, add the corresponding `H03-LIC-*.yml`
license verdict. The mutation is not complete until the cascade is regenerated and the
diff is reviewed. Without the cascade, the upgrade is **blocked**.

## Version sanity

All Remotion packages must use one version; all installed Mediabunny packages must use
the compatible version. If `@remotion/cli` is available, run `npx remotion versions` as
an additional check. The Remotion releases changelog may summarize relevant changes.

## Determinism contract

The upgrade itself is an authoring-time, off-render event. The render path contract is
unchanged after the upgrade: `useCurrentFrame()` + `interpolate()` only, no network, no
temporal APIs. No `Math.random`, `Date.now`, `new Date`, `fetch`, `setTimeout`,
`setInterval` in the render path. A render is `RENDERED_DRAFT`; production gates G13-G17
manual. An upgrade does NOT grant `HUMAN_APPROVED`, `READY`, or `PUBLISHED`.

## Preflight

1. Confirm exact toolchain pins (Remotion 4.0.494, React 19) as the **current** baseline.
2. Confirm the Remotion license verdict (`H03-LIC-REMOTION-001.yml`).
3. Confirm the dependency-receipt cascade is regenerated after the mutation.
4. Stop on: mixed Remotion versions, incompatible Mediabunny, a mutation without the
   receipt cascade, a production request without human gate approval.

## Stop rules

Reject mixed Remotion versions, an upgrade without regenerating the receipt cascade
(`RCP-DEP-PRODUCTION` + `H03-LOCK-SUCCESSION-001`), incompatible Mediabunny versions,
`Math.random`/`Date.now`/`fetch`/`setTimeout`/`setInterval` in the render path, unpinned
remote assets, and production / publish requests. Remotion stays `local_evaluation`
until the license verdict and G13-G17 gates resolve.

## Verificación

```bash
node skills/content-os-remotion-upgrade/scripts/check-skill.mjs
pnpm typecheck
pnpm verify:skills
```

Conservar `remotion-video-production`, VS-001, H-01, H-02, n8n y `Root.tsx`
byte-idénticos.

## Referencias

- `skills/remotion-video-production/SKILL.md` — MetodologIA canonical Remotion skill (authority sibling).
- `skills/vendor/remotion-publisher/remotion-upgrade/SKILL.md` — vendor reference (read-only, source-available Remotion AG).
- `receipts/dependency-audits/H03-LIC-REMOTION-001.yml` — Remotion license verdict + source-available-publisher addendum.
- `receipts/dependency-audits/H03-LOCK-SUCCESSION-001.yml` — dependency lock-succession receipt (must bump on mutation).
