# Auditoría de migración desde notebooks de origen

Versión: `v1.0`
Fecha de corte: `2026-08-25`
Estado: `VERIFIED_PARTIAL`

Esta auditoría compara el notebook nuevo con `Contenido con Branding [MetodologIA]` y `Empoderamiento en (Gen)IA y Método`. No modifica los notebooks de origen. [METODOLOGIA]

## Catálogo de esta extensión

| `source_id`             | Fuente                                               | Autoridad          |
| ----------------------- | ---------------------------------------------------- | ------------------ |
| `NLS-KB-14-VOICE-CANON` | `14-canon--brand-voice-and-editorial-rhetoric--v1.0` | CANON              |
| `NLS-KB-16-HOOKS`       | `16-canon--hooks-punchlines-and-ctas--v1.0`          | CANON              |
| `NLS-KB-17-VISUAL`      | `17-canon--neo-swiss-clean-soft-explainer--v1.0`     | CANON              |
| `NLS-KB-18-PROMPTS`     | `18-templates--copy-and-visual-prompt-library--v1.0` | TEMPLATE           |
| `NLS-KB-61-MIGRATION`   | este archivo                                         | OPERATION EVIDENCE |

## Alcance y límite de lectura

Los notebooks de origen tenían 291 y 300 fuentes en sus últimos readbacks conocidos. Las consultas amplias y los inventarios vivos agotaron el tiempo de respuesta durante esta auditoría. Por tanto, no se afirma paridad exhaustiva fuente por fuente. Se usaron inventarios curados, receipts, prompts y fuentes locales verificables; el resto queda como `coverage_gap`. [METODOLOGIA]

## Capacidades demostradas en el origen de branding

Una depuración verificable documentó fuentes separadas para:

- Brand Voice;
- protocolo de contenido técnico;
- prompt de logo;
- orquestador estético;
- Golden Reference Add-on;
- Bundle;
- Single Service;
- SPEC ejecutivos y referencias editoriales.

Los tres últimos nombres identifican familias visuales, pero sus masters, hashes, derechos y equivalencia con los ocho `ART-*` del notebook nuevo no quedaron resueltos. [METODOLOGIA]

## Mapa de migración

| Capacidad de origen             | Destino consolidado                                          | Estado                       |
| ------------------------------- | ------------------------------------------------------------ | ---------------------------- |
| voz y tono                      | `14-canon--brand-voice-and-editorial-rhetoric--v1.0`         | `MIGRATED_AND_EXPANDED`      |
| hooks, cierres y CTAs           | `16-canon--hooks-punchlines-and-ctas--v1.0`                  | `ADDED_CAPABILITY`           |
| orquestación estética           | `17-canon--neo-swiss-clean-soft-explainer--v1.0`             | `MIGRATED_AND_OWNER_DEFINED` |
| prompts editoriales y visuales  | `18-templates--copy-and-visual-prompt-library--v1.0`         | `MIGRATED_AND_EXPANDED`      |
| prompt/reglas de logo           | `50-assets--manifest-and-usage--v1.0` + plantilla de activos | `MIGRATED_WITH_GUARDRAIL`    |
| formación Masterclass/Playbooks | 43 PDF + Markdown canónico                                   | `MIGRATED`                   |
| galería artística               | `ART-01` a `ART-08`                                          | `MIGRATED_AS_REFERENCE`      |
| Golden Reference Add-on         | master no resuelto                                           | `COVERAGE_GAP`               |
| Bundle                          | master no resuelto                                           | `COVERAGE_GAP`               |
| Single Service                  | master no resuelto                                           | `COVERAGE_GAP`               |

## Conflictos resueltos

1. **Estética:** la definición explícita de Javier de `Neo-Swiss Clean and Soft Explainer` prevalece sobre variantes históricas oscuras, inmersivas o contextuales. [METODOLOGIA]
2. **Arquitectura:** un perfil candidato desaconsejaba `arquitecto/arquitectura`; el canon actual los permite para diseño real de sistemas y métodos, no como metáfora vacía. [METODOLOGIA]
3. **Autoridad de PDF:** los PDF inspiran lenguaje editorial y arte; el Markdown consolidado gobierna conceptos, reglas y producción.
4. **Assets:** un título coincidente no demuestra identidad. Se requiere master, hash, procedencia, derecho y uso permitido.

## Capacidades añadidas

- separación explícita entre hook, punchline y CTA;
- adaptación de voz por canal;
- roles semánticos de color y tipografía;
- negative prompt visual;
- aplicación de logo y retratos en postproducción con guardrails;
- checklist de accesibilidad y legibilidad;
- compilación de lenguaje natural a briefs específicos;
- prueba de descarga y relectura antes de declarar calidad.

## Criterio de cierre

La migración de definiciones queda `VERIFIED_PARTIAL`. Para promoverla a `VERIFIED`, se deben resolver los masters de Golden Reference Add-on, Bundle y Single Service, comprobar sus derechos y hashes, y repetir un inventario selectivo de los notebooks de origen sin timeout. Hasta entonces, no se importan sustitutos ni se declara paridad total. [METODOLOGIA]
