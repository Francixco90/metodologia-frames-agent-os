---
name: edu-lean-coffee
description: This skill should be used when el usuario solicita Lean Coffee o conversación de cierre. Genera HTML dinámico offline con evidencia y revisión humana.
version: 1.0.3
license: MIT
metadata:
  owner: MetodologIA
  lifecycle_state: active
  execution_scope: local-draft-generation
  model_agnostic: true
---

# Lean coffee o conversación de cierre

Define preguntas, duración y revelado para facilitar discusión. El temporizador controla la conversación y no evalúa al participante. [METODOLOGIA]

## Procedimiento

1. Recibe lenguaje normal, esquema o anexos. Conserva un brief Markdown canónico con audiencia, objetivo, fuentes, restricciones y aceptación; máximo tres preguntas bloqueantes.
2. Separa hechos, hipótesis y recomendaciones. Usa [METODOLOGIA], [PEDAGOGIA], [NEUROCIENCIA], [INFERENCIA] o [SUPUESTO] cuando corresponda; una etiqueta no sustituye evidencia. No inventes cifras ni afirmaciones científicas.
3. Prepara `input.json` con el contrato de [schema.md](references/schema.md). Idiomas explícitos y contenido completo; no traduzcas silenciosamente con fallback. Conserva el contenido al cambiar idioma.
4. Muestra el argumento y los títulos para revisión cuando el brief no los haya autorizado. La edición es `white-label`; sus fuentes y claims no se mezclan con otras marcas.
5. Ejecuta desde la carpeta de la skill, escribiendo en un directorio nuevo fuera del paquete:

```sh
python3 engine/runtime.py check --kind lean-coffee --edition white-label --input input.json --out salida
python3 engine/runtime.py plan --kind lean-coffee --edition white-label --input input.json --out salida
python3 engine/runtime.py build --kind lean-coffee --edition white-label --input input.json --out salida
```

6. Valida resultados materiales y hashes. Ejecuta `python3 scripts/check.py` para la integridad del paquete; los checks estáticos no acreditan UI, clipboard o movimiento. La revisión de navegador debe comprobar las acciones de [acceptance.md](references/acceptance.md).
7. Entrega HTML, Markdown, receipt y gaps. Estado máximo `RENDERED_DRAFT`; aprobación humana y publicación son decisiones separadas.

## Marca y autonomía

Usa el perfil neutral o una configuración explícita de marca con colores que pasen contraste. No incorpora logos ficticios ni identidad de MetodologIA en la pieza.
Cada paquete contiene su propio motor generado desde la fuente canónica. Python stdlib; sin servicios externos, assets remotos ni otros skills obligatorios. El banco público de assets es opcional y solo admite releases verificadas por checksum. [METODOLOGIA]

## Compatibilidad y límites

El motor es una implementación original, inspirada en capacidades observadas, sin reutilizar código ni assets restringidos. `frames-aula-v1` no es compatible directamente con `aula/module.json` o DCD `storyboard.json`: migra explícitamente mediante [migration.md](references/migration.md), revisa la pérdida reportada y no sobrescribas el original. Office es opcional; cualquier adaptador o plantilla ausente se declara `coverage_gap`, nunca se entrega un archivo ficticio. [METODOLOGIA]

En Frames ContentOS, `frames:assist` continúa desde el brief y la especificación aprobados mediante WorkOrder hash-bound, renderer y receipt; `frames:aula` admite ejecución contratada. En Frames OS, usa `frames start aula --request "PEDIDO"` (o `deck.immersive` para un deck comercial) y `frames next RUN`: el motor resuelve formato/edición y exige sus gates nativos de dirección, fuentes/especificación y aceptación. Cada comando pertenece a su host; las aprobaciones reales las emite la persona. Trainer mantiene su evaluación separada en cada host y nunca es fallback automático. Ver [runtime.md](references/runtime.md). [METODOLOGIA]

El CLI Python es portable y autónomo; su salida RENDERED_DRAFT no acredita gates de un run de Frames ni autoriza publicación.
