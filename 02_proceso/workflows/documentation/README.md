---
title: Documentation as Code
type: operating_guide
status: candidate
owner: RT-04 Architecture
audience: [operator, maintainer]
---

# Documentación como parte del producto

Esta superficie convierte los workflows ejecutables de Frames en documentación que una persona puede comprender y un operador puede verificar. El YAML canónico sigue mandando; Markdown, HTML, diagramas e inventarios son proyecciones reproducibles.

## Qué genera

- Una referencia Markdown para P00–P09 y C00–C09.
- Un diagrama Mermaid y una alternativa textual por workflow.
- Un portal HTML offline con Design System MetodologIA.
- Un SVG accesible por workflow, sin JavaScript, red ni telemetría.
- Manifests de contenido y cobertura para validación automática.

## Cómo actualizarlo

1. Edita el `workflow.yml` autorizado; no edites directamente los outputs generados.
2. Genera: `node --import tsx 02_proceso/workflows/documentation/generate.ts --write`.
3. Comprueba drift: `node --import tsx 02_proceso/workflows/documentation/generate.ts`.
4. Ejecuta typecheck, lint y los gates del cambio.
5. Congela el candidate antes de RT-09.

## Definition of Done transversal

Toda creación, ampliación, extensión, corrección, migración o deprecación debe declarar un `DocumentationImpactPlanV1`. Cada superficie se marca `REQUIRED` o `NOT_APPLICABLE`; esta última exige un reason code específico.

El cambio solo puede superar `DOCS_TRANSVERSAL_COMPLETE` cuando su fuente, referencia, portal, diagramas, índices y pruebas aplicables estén sincronizados y exista un `DocumentationClosureReceiptV1` ligado por hash al candidate. Los outputs generados nunca son la fuente editorial.

## Límites

Este generador documenta las 20 rutas canónicas presentes. L00–L05 y M00–M06 aparecerán automáticamente cuando existan como workflows ejecutables y se incorporen a los roots declarados; no se inventan desde el plan. Un workflow sin pasos, secuencia o referencias resolubles debe bloquear el cierre documental.
