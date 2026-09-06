# Operaciones, fuentes, receipts y readback

Versión: `v1.0`
Estado: `ACTIVE_CONTROL`

## Qué acciones requieren gate

Redactar un borrador local o responder una pregunta no requiere gate externo. Crear/configurar el notebook e importar fuentes requiere `NLM_PLAN_APPROVED`. Generar un artefacto de Studio requiere `NLM_STUDIO_GENERATION_APPROVED`. Compartir y eliminar usan autorizaciones separadas. [METODOLOGIA]

## Catálogo estable de Markdown

| `source_id`            | Fuente                                          | Autoridad         |
| ---------------------- | ----------------------------------------------- | ----------------- |
| `NLS-KB-00-SYSTEM`     | `00-control--system-prompt--v1.1`               | CONTROL           |
| `NLS-KB-01-AUTHORITY`  | `01-control--authority-routing-and-gates--v1.0` | CONTROL           |
| `NLS-KB-10-METHOD`     | `10-canon--metodologia-operating-method--v1.0`  | CANON             |
| `NLS-KB-11-CURRICULUM` | `11-canon--formation-curriculum-map--v1.0`      | CANON             |
| `NLS-KB-12-CONTENT`    | `12-canon--content-studio--v1.0`                | CANON             |
| `NLS-KB-13-AGENTIC`    | `13-canon--agentic-sovereignty--v1.0`           | CANON             |
| `NLS-KB-15-VOICE`      | `15-reference--written-tone-and-style--v1.0`    | REFERENCE         |
| `NLS-KB-20-EVIDENCE`   | `20-evidence--claims-and-gaps--v1.0`            | EVIDENCE          |
| `NLS-KB-30-TEMPLATES`  | `30-templates--briefs-and-checklists--v1.0`     | TEMPLATE          |
| `NLS-KB-40-GALLERY`    | `40-reference--pdf-gallery-guide--v1.0`         | REFERENCE         |
| `NLS-KB-50-ASSETS`     | `50-assets--manifest-and-usage--v1.0`           | ASSET CONTROL     |
| `NLS-KB-60-OPERATIONS` | este archivo                                    | OPERATION CONTROL |

## Catálogo estable de PDF

Los PDF usan los IDs de `drive-editions.csv`: `NFC-DRV-S01`, `S03`, `S04`, `S05`, `S06`, `S07`, `S08`, `S09`, `S10`, `S11`, `S12`, `S13`, `S14A`, `S14B`, `S15`, `S16` y los transversales `NFC-DRV-T20` a `T25`. Cada ID resuelve título, versión, hash, páginas y archivo local. [METODOLOGIA]

## Catálogo estable de imágenes

Las ocho imágenes usan `ART-01-HUMAN-AI-PHONE`, `ART-02-CONTENT-FUNNEL`, `ART-03-IDEA-LIGHTBULB`, `ART-04-CONTENT-ORCHESTRATION`, `ART-05-SUMMIT`, `ART-06-PURPOSE-PORTAL`, `ART-07-STRATEGY-GEARS` y `ART-08-NEXT-STEP`. [METODOLOGIA]

## Receipt mínimo de mutación

- operation_id;
- timestamp y actor;
- notebook privado objetivo;
- gate utilizado;
- targets resueltos;
- hashes o identity digests;
- resultado por operación;
- readback externo;
- gaps y siguiente gate.

## Readback

Después de crear, configurar o importar:

1. volver a leer el notebook;
2. comprobar título, privacidad y conteo;
3. confirmar que cada fuente declarada existe una sola vez;
4. registrar IDs privados únicamente en el receipt local no versionado;
5. ejecutar consultas con subconjuntos explícitos;
6. dejar sharing y publicación bloqueados.

## Idempotencia

Antes de reanudar, compara título, hash y recibo. Si el contenido ya existe, no lo agregues otra vez. Si el título coincide pero el hash cambia, registra una versión sucesora. [METODOLOGIA]

## Estados operativos

`DRAFT` → `RENDERED_DRAFT` → `VERIFIED_DRAFT` → `HUMAN_APPROVED` → `READY` → `PUBLISHED`.

Cada transición requiere su propia evidencia. Una fuente procesada no es un artefacto aprobado y un artefacto visible no es una entrega. [METODOLOGIA]
