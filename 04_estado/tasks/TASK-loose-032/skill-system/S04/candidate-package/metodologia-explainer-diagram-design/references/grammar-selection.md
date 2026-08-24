# Selección de gramática narrativa

La autoridad es la relación entre conceptos del `method-content-model-v1`, no el acrónimo, la
simetría disponible ni una preferencia estética. Conserva la dirección explícita del usuario si
es compatible con las fuentes; si cambia el significado, detente.

## Matriz de decisión

| Gramática       | Seleccionar cuando                                                    | No seleccionar cuando                                  |
| --------------- | --------------------------------------------------------------------- | ------------------------------------------------------- |
| `flow`          | Predominan `sequence` o `enables` y existe un orden causal legible.   | Los conceptos son lentes interdependientes sin inicio.  |
| `convergence`   | Varias entradas autorizadas producen un resultado común observable.   | No existe un destino común sustentado.                  |
| `cycle`         | Las fuentes declaran retorno o una relación `cycle` explícita.        | La repetición es solo ornamental.                       |
| `radial-lenses` | Dimensiones pares examinan un centro común y ninguna gobierna orden.  | Hay dependencia causal fuerte o una secuencia obligada. |
| `traceability`  | La historia enlaza fuente, decisión, acción, evidencia y resultado.   | Faltan IDs o autoridad para reconstruir la cadena.      |

PASA puede usar `flow` cuando sus relaciones sean causales. PIVOTE puede usar `radial-lenses`
cuando sus dimensiones sean interdependientes. Esos ejemplos no sustituyen la inspección de
relaciones.

## Desempate

1. Prioriza la relación material que cambiaría la interpretación si se dibujara mal.
2. Usa `flow` solo si puede identificarse inicio, dirección y resultado.
3. Usa `radial-lenses` solo si todos los nodos conservan igual jerarquía semántica.
4. Usa `cycle` únicamente con retorno explícito.
5. Si dos gramáticas siguen siendo igualmente válidas, solicita la decisión editorial; no mezcles
   gramáticas dentro del mismo contrato.

## Contrato visual

- El contenedor existe antes de la primera entrada.
- Todos los nodos se asientan antes de dibujar conexiones.
- El primer edge empieza al menos seis frames después del último `settle_frame` global.
- `components_settled_frame` no precede al último settle.
- `connectors_complete_frame` no precede al último edge ni a componentes asentados.
- `closing_frame` ocurre después de conectores completos y dentro de `total_frames`.
- Cada nodo permanece dentro de la safe zone; no usar elipsis, clipping ni fuente menor de 24 px.
- El texto en pantalla nombra conceptos o relaciones; no debe transcribir la narración completa.

## Fallback

Cuando no pueda demostrarse gramática, orden o fit, devuelve un bloqueo con el dato faltante.
Storyboard textual es fallback de planificación, no prueba de que el diagrama o renderer pasaron.
