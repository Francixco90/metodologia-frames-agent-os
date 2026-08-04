# Skill registry index

Dos registros `skill-foundry` append-only (`mutation_policy: append-only-*`): `events` inmutables, `entries` vista current. [CONFIG]

| Artefacto                                         | Entries                                                   | Validator                      |
| ------------------------------------------------- | --------------------------------------------------------- | ------------------------------ |
| `skill-registry.yml`                              | 7 (1 quarantined)                                         | `check-instagram-v2-skills.ts` |
| `creation-v3-skill-registry.yml`                  | 15                                                        | `check-creation-v3-skills.ts`  |
| `skills/instagram-v2-content-license-receipt.yml` | 5 `package_refs`                                          | `check-instagram-v2-skills.ts` |
| `lifecycle-contract.yml`                          | estados candidate→quarantined→evaluated→active→deprecated | ninguno                        |

`pnpm verify:skills` encadena los dos checks. Solo 5 V2 + 15 H03 estan hash-validados; v1 `remotion-video-production` y `stitch` no. [CÓDIGO]

## v1 ↔ v2 LINEAGE

Cross-ref en cada `LINEAGE.y*ml`: `extends_skill` (predecesor), `supersedes_skill` (reemplazo). Ej: `remotion-video-production-v2` declara `extends_skill: remotion-video-production@0.1.0`, `supersedes_skill: null`. [DOC]
