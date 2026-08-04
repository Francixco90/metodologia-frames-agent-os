# Registry Reconcile — Fase 3

> Audit post homólogo batches (Fases 2A–2D). Cross-cutting drift gate.
> Status: **PASS** · Date: 2026-08-04 · [CONFIG]

## Scope

Verificar integridad cross-cutting de ambos skill registries tras los homólogo
batches (HyperFrames 33 + Remotion 11 + Bento 3 + Scroll 3 = 50 nuevos + 1
legacy). Los validadores per-skill (`check-instagram-v2-skills.ts`,
`check-creation-v3-skills.ts`) cubren sus listas `skills[]` hardcoded, pero NO
cubren:

- Entries legacy fuera de las listas validators (p.ej. `remotion-video-production`
  v0.2.0 con per-skill receipt).
- Orphan dirs en `skills/` registrados en ningún registry.
- Duplicados cross-registry (mismo skill_id en v2 y v3).
- Unicidad global de `event_id` por registry.

## Gate

`scripts/reconcile-skill-registries.ts` — cableado en `pnpm verify:skills`
(tercer paso, tras v2 + v3 validators). Códigos RCN-001..011.

## Veredicto

| Check                                 | Resultado                              |
| ------------------------------------- | -------------------------------------- |
| RCN-001 cross-registry dupes          | 0                                      |
| RCN-003 SKILL.md on disk              | 51/51                                  |
| RCN-004 content_sha256 drift          | 0                                      |
| RCN-005 package_manifest_sha256 drift | 0                                      |
| RCN-006 lineage path resolved         | 51/51                                  |
| RCN-007/008 receipt hash binding      | 0 drift (shared v2 + per-skill legacy) |
| RCN-009 orphan skill dirs             | 0                                      |
| RCN-010 missing skill dirs            | 0                                      |
| RCN-011 event_id uniqueness           | v2 43/43 únicos · v3 165/165 únicos    |

**Totales:** 10 v2 entries + 41 v3 entries = 51 skills hash-bound. 0 drift.

## Notas

- `remotion-video-production` (v0.2.0, legacy, per-skill receipt
  `edfd2211…`) NO está en ningún validator `skills[]`; el gate reconcile
  cubre su hash binding + receipt hash.
- `metodologia-certificate-builder` usa entrada flow-style (indentación 6) en
  `skill-registry.yml`; el gate parsea via YAML (no grep), sin falsos negativos.
- Cableado en `verify:skills` → drift catch automático en cada PR que toque
  registries. Producer ≠ verifier ≠ Guardian.

## Receipt cascade (absorbida en este PR)

Cablear `reconcile-skill-registries.ts` en `verify:skills` muta `package.json`
→ cascada de receipt de dependencia:

- Nuevo `RCP-DEP-PRODUCTION-20260804-002.json` (supersedes `…001`, 0 vulns,
  39 deps, `packageJsonSha256` vigente).
- Bump `H03-LOCK-SUCCESSION-001.yml` `current.package_sha256` +
  `audit_receipt.{ref,sha256}`.

Fase 2D no mutó `package.json` (`@fal-ai/client` opcional/lazy en prose). La
mutación viene del cableado del gate en este PR → Fase 4 = 0 PRs separados.
Programa cerrado tras este reconcile.
