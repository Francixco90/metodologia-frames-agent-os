# Retrospectiva CV Spec-First

## Resultado

El Career OS ya separaba evidencia, posicionamiento, vacante y QA, pero C06
convertía el brief directamente en documentos. La mejora decisiva es introducir
una especificación de CV aprobable y hash-bound antes de redactar o renderizar.
[METODOLOGIA]

La cadena resultante es:

`Evidence Bank → CV Spec → Canonical CV → Variants → Verify → Review → Promote`

## Aprendizajes que se convierten en sistema

1. **La spec es autoridad, no una nota de trabajo.** Define audiencia, objetivo,
   evidencia permitida, arquitectura, idiomas, outputs y aceptación. Todo derivado
   porta `spec_id` y `spec_sha256`. [METODOLOGIA]
2. **La evidencia limita la personalización.** Un requisito de vacante nunca se
   convierte por sí solo en capacidad del candidato. Los gaps se califican, omiten
   o bloquean. [METODOLOGIA]
3. **Los formatos son proyecciones.** El contenido canónico no se corrige dentro
   del DOCX, PDF o HTML final. Una corrección vuelve a la spec o al modelo canónico
   y recompila el paquete. [METODOLOGIA]
4. **ATS no es un porcentaje inventado.** Se reportan estructura, orden de lectura,
   texto extraíble, links, ausencia de objetos frágiles y paridad observada. Una
   puntuación solo existe cuando proviene de una herramienta identificada.
   [METODOLOGIA]
5. **Materializar no equivale a aprobar.** `RENDERED_DRAFT`, `HUMAN_APPROVED`,
   `READY` y `PUBLISHED` son estados distintos. Un hash stale invalida la
   aprobación, no la hereda. [CONFIG]
6. **Privacidad por construcción.** Git contiene schemas, scripts y fixtures
   sintéticos. Contacto, CV reales, vacantes capturadas y outputs con PII viven en
   estado privado autorizado. [CONFIG]

## Mejoras por superficie

### Workflow

- Incorporar `CR_CV_SPEC_APPROVED` antes de compilar contenido.
- Mantener rutas general y targeted; la segunda exige snapshot de vacante y
  matriz requisito→evidencia.
- Tratar cualquier cambio material como una nueva revisión de spec.

### Skill

- Hacer que `evidence-first-cv` orqueste spec, fuente canónica y variantes.
- Hacer que `candidate-evidence-reconciler` preserve contradicciones y confianza.
- Hacer que `career-application-orchestrator` bloquee C06 sin spec aprobada.

### Assets y scripts

- Reutilizar plantillas ATS de una columna y ejecutivo accesible.
- Generar DOCX con estructura lineal, bullets nativos y contacto en el cuerpo.
- Ejecutar verificadores deterministas en vez de depender de inspección manual
  para hashes, orden, XML, paridad y privacidad.

## Límites y trade-offs

- Un paquete puede soportar ES/EN y cuatro formatos sin obligar a producirlos
  todos en cada corrida; la matriz de outputs de la spec decide. [INFERENCIA]
- La reproducibilidad tipográfica entre Word y LibreOffice no es absoluta. El
  contrato fija estructura y semántica; diferencias de rasterización se reportan
  como `UNKNOWN` cuando no existe el runtime declarado. [SUPUESTO]
- La verificación estructural mejora compatibilidad ATS, pero no predice el
  comportamiento de todos los proveedores propietarios. [INFERENCIA]

## Criterio de éxito

El sistema es más efectivo cuando una spec aprobada recompila el mismo paquete,
los claims conservan su evidencia, cualquier drift queda bloqueado, los formatos
se pueden inspeccionar de forma independiente y ningún dato privado entra en Git.
