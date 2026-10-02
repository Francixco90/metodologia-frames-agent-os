---
name: edu-workbook
description: This skill should be used when el usuario solicita workbook, laboratorio o práctica guiada. Genera HTML dinámico offline con evidencia y revisión humana.
version: 1.1.0
license: MIT
metadata:
  owner: MetodologIA
  lifecycle_state: active
  execution_scope: local-draft-generation
  model_agnostic: true
---

# Workbook, laboratorio o práctica guiada

Organiza rutas en clase y profundización. Cada prompt incluye contexto editable, instrucciones, resultado, evidencia y punto de parada; nunca promete comandos no comprobados. [METODOLOGIA]

## Procedimiento

1. Recibe lenguaje normal, esquema o anexos. Conserva un brief Markdown canónico con audiencia, objetivo, fuentes, restricciones y aceptación; máximo tres preguntas bloqueantes.
2. Separa hechos, hipótesis y recomendaciones. Usa [METODOLOGIA], [PEDAGOGIA], [NEUROCIENCIA], [INFERENCIA] o [SUPUESTO] cuando corresponda; una etiqueta no sustituye evidencia. No inventes cifras ni afirmaciones científicas.
3. Revisa [el golden de este formato](examples/input.json) y prepara `input.json` con [schema.md](references/schema.md). Idiomas explícitos y contenido completo. Para autoría nueva usa `authoringPolicy.origin=new`: comercial hasta 8 slides, académico hasta 13, portada y tapa incluidas. Otra extensión requiere `maxSlides` y `explicitBrief`. No recortes entradas históricas ni ejercicios.
4. Muestra el argumento y los títulos para revisión cuando el brief no los haya autorizado. La edición es `white-label`; sus fuentes y claims no se mezclan con otras marcas.
5. Ejecuta desde la carpeta de la skill, escribiendo en un directorio nuevo fuera del paquete:

```sh
python3 engine/runtime.py check --kind workbook --edition white-label --input input.json --out salida
python3 engine/runtime.py plan --kind workbook --edition white-label --input input.json --out salida
python3 engine/runtime.py build --kind workbook --edition white-label --input input.json --out salida
```

6. Valida resultados materiales y hashes. Ejecuta `python3 scripts/check.py` para la integridad del paquete; los checks estáticos no acreditan UI, clipboard o movimiento. La revisión de navegador debe comprobar las acciones de [acceptance.md](references/acceptance.md).
7. Entrega HTML, Markdown, receipt y gaps. Estado máximo `RENDERED_DRAFT`; aprobación humana y publicación son decisiones separadas.

## Marca y autonomía

Usa el perfil neutral o una configuración explícita de marca con colores que pasen contraste. No incorpora logos ficticios ni identidad de MetodologIA en la pieza.
Cada paquete contiene su propio motor generado desde la fuente canónica. Python stdlib; sin servicios externos, assets remotos ni otros skills obligatorios. El banco público de assets es opcional y solo admite releases verificadas por checksum. [METODOLOGIA]
Incluye 32 iconos y 16 escenas locales, fuentes con avisos propios y un golden ejecutable. Consulta el catálogo local antes de elegir una escena: una referencia ausente bloquea. El banco opcional amplía a 256 iconos y 160 escenas; el HTML final embebe las piezas seleccionadas y no consulta la red. Código y arte propios MIT; fuentes OFL. [METODOLOGIA]

## Compatibilidad y límites

El motor es una implementación original, inspirada en capacidades observadas, sin reutilizar código ni assets restringidos. `frames-aula-v1` no es compatible directamente con `aula/module.json` o DCD `storyboard.json`: migra explícitamente mediante [migration.md](references/migration.md), revisa la pérdida reportada y no sobrescribas el original. Office es opcional; cualquier adaptador o plantilla ausente se declara `coverage_gap`, nunca se entrega un archivo ficticio. [METODOLOGIA]

En Frames ContentOS, `frames:assist` continúa desde el brief y la especificación aprobados mediante WorkOrder hash-bound, renderer y receipt; `frames:aula` admite ejecución contratada. En Frames OS, usa `frames start aula --request "PEDIDO"` (o `deck.immersive` para un deck comercial) y `frames next RUN`: el motor resuelve formato/edición y exige sus gates nativos de dirección, fuentes/especificación y aceptación. Cada comando pertenece a su host; las aprobaciones reales las emite la persona. Trainer mantiene su evaluación separada en cada host y nunca es fallback automático. Ver [runtime.md](references/runtime.md). [METODOLOGIA]

El CLI Python es portable y autónomo; su salida RENDERED_DRAFT no acredita gates de un run de Frames ni autoriza publicación.
