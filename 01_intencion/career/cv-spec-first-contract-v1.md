# Contrato operativo CV Spec-First v1

> **COMPATIBILITY-ONLY.** Este documento no gobierna runs nuevos. La autoridad
> normativa es `career-os-operating-contract-v2.md`. La migración material de
> C06/C07, templates y registry es
> `coverage_gap: A1_MATERIAL_MIGRATION_REQUIRED`; por tanto, encontrar una
> dependencia activa v1 bloquea el run en vez de simular una cadena v2.
> [CONFIG]

## Autoridad

En un payload legacy, `cv-spec-v1` era la fuente de decisión previa al contenido. El Evidence Bank sigue
siendo la autoridad factual y una vacante capturada sigue siendo la autoridad de
requisitos. La spec selecciona y organiza; no crea hechos. [CONFIG]

Cada derivado debe declarar:

- `spec_id` y `spec_sha256`;
- referencias y hashes de Evidence Bank, perfil y, cuando aplique, vacante;
- `variant_id`, idioma, perfil visual y tipo de output;
- hash material del archivo producido;
- estado y siguiente gate.

## Estados

`SPECIFIED → RENDERED_DRAFT → HUMAN_APPROVED → READY → PUBLISHED`

- `SPECIFIED`: spec válida; aún no demuestra outputs.
- `RENDERED_DRAFT`: archivos materializados y hash-bound; no aprobados.
- `HUMAN_APPROVED`: revisión humana sobre los hashes exactos.
- `READY`: QA y Guardian cerrados sobre esos mismos hashes.
- `PUBLISHED`: efecto externo autorizado y verificado por separado.

Cambiar spec, evidencia, vacante, fuente canónica o output invalida los estados
posteriores. [CONFIG]

## Reglas por modalidad

### General

Exige perfil, Evidence Bank, familias objetivo, idiomas, arquitectura, output
matrix, privacidad y aceptación. Puede omitir vacante y application brief.

### Targeted

Exige además snapshot de vacante, application brief y matriz
requisito→evidencia. Un requisito sin evidencia queda `gap`, `omit` o `block`;
nunca se redacta como claim. [METODOLOGIA]

## Outputs soportados

- `ats-html`: semántico, una columna, sin JavaScript ni texto oculto.
- `ats-docx`: una columna, contacto en body, bullets nativos, sin tablas,
  textboxes, headers, footers, dibujos o columnas.
- `ats-pdf`: texto seleccionable, links y orden lineal derivados del HTML/DOCX.
- `executive-html`: jerarquía ejecutiva, accesibilidad, reflow e impresión.

Solo se materializan combinaciones de idioma y formato declaradas en la spec.

## Gates fail-closed

- `CR_CV_SPEC_APPROVED`: spec válida y aprobada sobre su hash.
- `CR_CV_COMPILED`: fuente canónica ligada a spec y evidencia.
- `CR_PACKAGE_QA`: nombre reservado sin autoridad activa en A0; no puede emitir PASS.
- `CR_PACKAGE_APPROVED`: aprobación humana del package exacto; nunca alias de QA.
- `G14`: verificación independiente; no autoriza publicación.

Ausencia de runtime, archivo, hash, texto extraíble o paridad produce `UNKNOWN`
o `BLOCKED`, nunca `PASS` por sustitución. [CONFIG]

## Privacidad y fixtures

El repositorio versiona contratos y ejemplos sintéticos. Un binding de contacto
privado aporta destinos al build, pero el manifest público solo puede registrar
su identificador y autoridad, nunca valores, locator ni hashes derivados de PII.

## Aceptación mínima

1. Cero claims materiales sin evidencia promocionable.
2. Cero requisitos convertidos en evidencia del candidato.
3. Paridad factual entre idiomas y formatos.
4. Doble build con bytes estables donde el runtime sea reproducible.
5. ATS HTML, DOCX y PDF con orden y texto extraíble observados.
6. HTML ejecutivo navegable por teclado y usable a 320 px.
7. Cero dependencias remotas obligatorias y cero PII versionada.
8. Package y aprobaciones invalidados ante cualquier hash stale.
