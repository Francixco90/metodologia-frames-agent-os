---
name: white-label-dynamic-commercial-decks
description: This skill should be used when el usuario solicita deck dinámico, prospección, defensa, keynote o webinar. Genera HTML dinámico offline con evidencia y revisión humana.
version: 1.0.3
license: MIT
metadata:
  owner: MetodologIA
  lifecycle_state: active
  execution_scope: local-draft-generation
  model_agnostic: true
---

# Deck dinámico, prospección, defensa, keynote o webinar

Confirma audiencia, problema, decisión buscada y hechos. Redacta títulos que narren el argumento al leerse seguidos; una escena explica cada idea, cifras estáticas con fuente y límites. Diferencia presentador y audiencia. [METODOLOGIA]

## Procedimiento

1. Recibe lenguaje normal, esquema o anexos. Conserva un brief Markdown canónico con audiencia, objetivo, fuentes, restricciones y aceptación; máximo tres preguntas bloqueantes.
2. Separa hechos, hipótesis y recomendaciones. Usa [METODOLOGIA], [PEDAGOGIA], [NEUROCIENCIA], [INFERENCIA] o [SUPUESTO] cuando corresponda; una etiqueta no sustituye evidencia. No inventes cifras ni afirmaciones científicas.
3. Prepara `input.json` con el contrato de [schema.md](references/schema.md). Idiomas explícitos y contenido completo; no traduzcas silenciosamente con fallback. Conserva el contenido al cambiar idioma.
4. Muestra el argumento y los títulos para revisión cuando el brief no los haya autorizado. La edición es `white-label`; sus fuentes y claims no se mezclan con otras marcas.
5. Ejecuta desde la carpeta de la skill, escribiendo en un directorio nuevo fuera del paquete:

```sh
python3 engine/runtime.py check --kind dynamic-commercial-decks --edition white-label --input input.json --out salida
python3 engine/runtime.py plan --kind dynamic-commercial-decks --edition white-label --input input.json --out salida
python3 engine/runtime.py build --kind dynamic-commercial-decks --edition white-label --input input.json --out salida
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

## Flujo de deck: dos decisiones

Usa `python3 engine/deck-workflow.py intake WORK --input intake.json --type TIPO --mode comercial|tecnico --edition white-label`. Revisa audiencia, problema, decisión y tres pilares achieves/proof fuera del modo simple. Registra `approve WORK --gate intake --by ACTOR` solo después del sí humano. Prepara `spec WORK --input input.json`, muestra títulos, hechos, escenas y salidas; registra `approve WORK --gate spec --by ACTOR` después de la segunda decisión. `build WORK --out NUEVO` rechaza aprobaciones ausentes o stale. No pregunta por el modelo; el tipo explícito prevalece. [METODOLOGIA]

La arcada técnica recorre AS-IS, TO-BE, estrategia, migración, evolución y decisiones. Tablas, tabs, acordeones y detalles ayudan a profundizar sin saturar. El catálogo incluye cinco escenas originales, no las 137 de Amaris. `outputs` permite seleccionar desktop/mobile/audience/mobile-audience/markdown; si se omite, conserva las cinco salidas del contrato inicial. Office: `python3 engine/export_office.py --help`, con plantilla explícita y dependencias opcionales. [METODOLOGIA]
