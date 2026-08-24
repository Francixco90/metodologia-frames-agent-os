# S01 — Discovery report

## Evidencia observada

- `diagram-contract-v2` ya es la autoridad estructural para gramática, nodos, conectores y poses. [CÓDIGO]
- `data-visual-composition` transforma datos verificados en geometría SVG; no decide cómo representar un método narrativo. [DOC]
- `remotion-video-production` compone y verifica renders deterministas; delegarle la selección semántica mezclaría dirección y ejecución. [DOC]
- El task autoriza una skill candidata y fixtures locales, pero no registry, lifecycle, promoción ni media final. [CONFIG]

## Hueco de capacidad

Falta una decisión repetible que traduzca relaciones como secuencia, interdependencia, convergencia, ciclo o trazabilidad a una de las gramáticas canónicas. También falta una envoltura ejecutable de solo lectura que valide y canonicalice el contrato antes de entregarlo al workflow. [INFERENCIA]

## Prueba de componente mínimo

1. Una instrucción aislada no aporta fixtures, validación ejecutable ni errores estables.
2. Una referencia describe criterios, pero no produce bytes deterministas.
3. Un tool genérico puede validar forma, pero no debe decidir la semántica visual.
4. Una única skill especializada sí necesita juicio contextual; sus scripts de validación y compilación permanecen tools internos, no skills adicionales.

## Límites

- La skill y sus scripts tienen techo E1: leen, deciden y emiten por stdout; no escriben, renderizan ni publican. [CONFIG]
- El workflow conserva la responsabilidad de materializar el archivo dentro de un write set autorizado.
- El renderer consume `diagram-contract-v2` y conserva `LayoutGuard` como oráculo de overflow real.
- El verificador canónico de Video OS prevalece ante cualquier divergencia; drift produce `coverage_gap` y bloqueo.

## Resultado

Crear `metodologia-explainer-diagram-design` como una sola skill estrecha. No ampliar General Video, `data-visual-composition` ni `remotion-video-production`. [METODOLOGIA]
