# Nivel 0 · Ruta de Workshops

Expediente privado para materializar una ruta de cuatro etapas con Design System First:
idea, prototipo, aplicación y poder agéntico. Este bootstrap solo fija scope, ownership y estado;
no acredita fuentes, diseño seleccionado, build, revisión ni publicación. [DOC]

## Estado

- `current_state: PARTIAL_CONTROLLED`
- `governed_workflow_state: BLOCKED_BEFORE_SOURCE_LOCK`
- `technical_validation_state: IN_PROGRESS`
- `visible_state: NOT_RENDERED`
- `source_locked: false`
- `guardian_passed: false`
- `human_approved: false`
- `ready: false`
- `published: false`

`coverage_gap`: H01 aún debe seleccionar una de las dos direcciones de diseño comparables. Esa
decisión no sustituye source lock, validación de marca, QA independiente, Guardian, readiness ni
autorización de publicación. [CONFIG]

## Write sets

| Rol        | Rutas exclusivas                                                 |
| ---------- | ---------------------------------------------------------------- |
| `lead`     | `README.md`, `project.yml`, `receipts/**`                        |
| `sources`  | `source-bundle.yml`, `claims-ledger.yml`                         |
| `content`  | `content/curriculum/**`, `content/spec/**`, `content/locales/**` |
| `brand`    | `brand/design-directions/**`, `brand/design-lock.yml`            |
| `web`      | `web/compiler/**`, `web/output-manifests/**`                     |
| `qa`       | `quality/**`                                                     |
| `guardian` | `guardian/review/**`; revisión únicamente, sin remediación       |

Las rutas se interpretan bajo `projects/nivel-0-route/`. Un rol no puede escribir en el write set
de otro. Producer, QA, Guardian y H01 permanecen separados. [CONFIG]

## Secuencia autorizada

1. `sources` materializa bundle y claims con hashes, procedencia, derechos y autoridad.
2. El expediente permanece bloqueado hasta acreditar source lock.
3. `brand` conserva exactamente dos direcciones comparables; H01 selecciona una.
4. Solo después se materializa un `design-lock.yml` ligado a la selección y a las fuentes.
5. `content` produce curriculum/spec canónicos y locales derivados.
6. `web` compila localmente y registra output manifests; no despliega.
7. `qa` verifica estructura, marca, accesibilidad, responsive y reproducibilidad.
8. Guardian revisa evidencia sin corregir outputs. G15–G17 siguen manuales y fail-closed.

No existen conectores ni rutas de deploy autorizadas. `NOT_RENDERED != RENDERED_DRAFT !=
HUMAN_APPROVED != READY != PUBLISHED`. [CONFIG]
