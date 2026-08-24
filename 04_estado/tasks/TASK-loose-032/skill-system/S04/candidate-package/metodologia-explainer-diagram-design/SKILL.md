---
name: metodologia-explainer-diagram-design
description: Diseña diagramas narrativos deterministas para videos que explican un método o framework y produce diagram-contract-v2. Úsala para decidir gramática, nodos, conexiones y poses; no para gráficos cuantitativos, SVG genérico, implementación Remotion o render.
metadata:
  owner: content
  candidate_state: UNREGISTERED_DRAFT
  gate_state: CANDIDATE_PENDING_GATE
  execution_scope: local-evaluation
---

# MetodologIA Explainer Diagram Design

Estado: `UNREGISTERED_DRAFT · CANDIDATE_PENDING_GATE`. Esta carpeta no acredita registry,
lifecycle, ejecución, aprobación ni promoción.

## Cuándo usarla

Úsala cuando una pieza `method-explainer` necesite traducir relaciones autorizadas entre conceptos
a una gramática visual y a un `diagram-contract-v2`. No la uses para elegir una estética por nombre,
crear charts con datos, escribir componentes React, renderizar media ni publicar.

## Entradas

- `method-content-model-v1` con conceptos, relaciones y autoridad verificables.
- `beat-budget-v1`, `explainer-video-spec-v1` y sus hashes canónicos.
- Safe zone, presupuesto tipográfico y restricciones narrativas aprobadas.
- Dirección explícita del usuario, cuando exista y sea compatible con las relaciones.

## Operación

1. Confirma que conceptos, relaciones, hashes, total de frames y safe zone están disponibles.
2. Lee [grammar-selection.md](references/grammar-selection.md) y elige la gramática desde las
   relaciones; el nombre PASA o PIVOTE es un ejemplo, no autoridad suficiente.
3. Diseña nodos dentro de safe zone, con máximo dos líneas y `font_px >= 24`.
4. Ordena la coreografía: contenedor, nodos, último `settle`, pausa mínima de seis frames,
   conectores y cierre.
5. Emite un único `diagram-contract-v2` candidato. No añadas explicaciones dentro del JSON.
6. Valida antes de entregar. El workflow, no esta skill, decide si materializa el resultado.

## Herramientas E1 read-only

Validar desde stdin o desde un path relativo contenido en el directorio activo:

```bash
node --import tsx scripts/validate-diagram-contract.ts [input.json|-]
```

Compilar únicamente desde stdin a JSON canónico por stdout:

```bash
node --import tsx scripts/compile-diagram-contract.ts
```

Ambos comandos reciben un envelope `diagram-contract-validation-input-v1` con
`total_frames`, hashes esperados y `diagram`. No escriben archivos, no aceptan red y nunca
conceden autoridad de render. `compile` rechaza cualquier argumento, incluido `--out`.

## Stop rules

Detente sin contrato ante fuente o hash ausente, relaciones ambiguas, IDs duplicados, endpoints
huérfanos, safe-zone inválida, frames fuera de duración, conectores prematuros o poses desordenadas.
No inventes causalidad, reduzcas tipografía, recortes texto ni repares el input silenciosamente.

El renderer conserva `LayoutGuard` como oráculo del fit tipográfico real. Un PASS estático no
equivale a render válido, `RENDERED_DRAFT`, aprobación humana ni publicación.
