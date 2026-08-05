---
name: gstack-benchmark-models
description: This skill should be used when comparing skill prompt performance across different AI models, designing a cross-model benchmark methodology, or deciding which model best suits a given skill's execution scope.
version: 0.1.0
license: LicenseRef-MetodologIA-Internal
metadata:
  owner: MetodologIA
  lifecycle_state: active
  execution_scope: local-evaluation
  model_agnostic: true
---

# gstack-benchmark-models — Metodología de benchmark cross-model de skills

## Cuándo invocar esta skill

Invócala cuando se necesite comparar el desempeño de un mismo prompt de skill
ejecutado en distintos modelos de IA (p. ej. Claude, GPT, Gemini), diseñar una
metodología de benchmark reproducible, o decidir qué modelo conviene más al
alcance de ejecución de una skill dada. La skill produce la metodología, la
rúbrica de evaluación y el esquema de puntuación; no ejecuta llamadas a las
APIs de los modelos.

Es la pieza opuesta a una comparación basada en impresiones: en lugar de
"vibes", entrega un protocolo de paridad de prompt, una rúbrica de evaluación
explícita y un scoring comparable, de modo que la decisión sobre qué modelo
usar quede sustentada en evidencia auditable.

## Principio de la capability

La capability no ejecuta código, no invoca APIs de modelos, no realiza
llamadas de red y no muta el repositorio. Es una skill de **evaluación local**:
toma la descripción de la skill a comparar y produce un protocolo de benchmark
estructurado (prompt de paridad, rúbrica, esquema de puntuación, formato de
resultados). La ejecución material del benchmark —correr el prompt en cada
modelo, medir latencia, costo y calidad— requiere confirmación explícita del
usuario antes de arrancar.

### Las 5 dimensiones del benchmark

El protocolo compara modelos sobre cinco dimensiones observables:

1. **Latencia** — tiempo de respuesta por ejecución.
2. **Costo** — costo monetario por invocación (tarifa × tokens consumidos).
3. **Tokens** — tokens de entrada y salida efectivamente consumidos.
4. **Calidad** — score de calidad de la salida, evaluado con una rúbrica
   explícita o, opcionalmente, con un juez LLM como desempate.
5. **Idoneidad al alcance** — ajuste de la salida a las restricciones de
   ejecución de la skill (alcance local, fail-closed, sin red, sin mutación).

## Paridad de prompt — condición previa

Antes de comparar modelos se establece la paridad del prompt: el mismo input
se entrega a cada modelo, sin adaptaciones que introduzcan sesgo. Esto
incluye alinear system prompt, instrucciones, contexto y formato de salida
esperado. Cualquier diferencia entre modelos debe declararse y justificarse
en el protocolo; una diferencia no declarada invalida la comparación.

La paridad no significa ignorar las capacidades específicas de cada modelo:
si un modelo admite un parámetro que mejora la calidad sin alterar el prompt,
ese parámetro se documenta como condición de ejecución, no como ventaja
injusta. Lo que se estandariza es el input semántico, no la configuración
técnica opaca.

## Rúbrica de evaluación

La rúbrica define criterios explícitos y ponderados para el score de calidad.
Cada criterio se puntúa en una escala fija (0–10) con una descripción de qué
significa cada nivel. Los criterios típicos para una skill son:

- **Ajuste al objetivo** — la salida cumple el objetivo declarado de la skill.
- **Cumplimiento de restricciones** — respeta el alcance, fail-closed, sin
  red, sin mutación, sin secretos.
- **Calidad técnica** — corrección, precisión y profundidad del contenido.
- **Trazabilidad** — claims sustantivos con marca de evidencia; sin
  inferencias pulidas en ausencias.
- **Claridad** — prosa legible, estructura clara, sin ruido.

La rúbrica se publica con el protocolo; la puntuación sin rúbrica pública no
es auditable. Los criterios se adaptan a la skill bajo benchmark, pero la
estructura (criterio, escala, descripción) se mantiene.

## Esquema de puntuación

Cada modelo recibe un score por criterio y un score agregado. El score
agregado usa las ponderaciones declaradas en la rúbrica; sin ponderación
declarada, los criterios pesan igual. El resultado se registra en una tabla
comparable: modelo × dimensión × score.

El juez LLM (opcional) actúa como desempate de calidad. Su uso se declara en
el protocolo, su costo se estima antes de arrancar y se requiere confirmación
del usuario. El juez nunca reemplaza la rúbrica: la complementa cuando los
scores humanos no son viables.

## Interpretación de resultados

La interpretación nombra al modelo más rápido, al más barato, al de mayor
calidad y al de mejor idoneidad al alcance. El "mejor overall" es un juicio:
si hay juez, se pondera por calidad; sin juez, se declara el tradeoff que el
usuario debe resolver. Errores de auth, timeout o rate limit se reportan con
la ruta de remediación, sin abortar el lote.

## Límite de fail-closed

La skill **no arranca ninguna ejecución de benchmark sin confirmación
explícita del usuario**. El protocolo describe el plan de ejecución (prompt,
modelos, rúbrica, juez, costo estimado) y pide confirmación antes de proceder.
Si el usuario no confirma, no hay ejecución. La generación de la metodología
es local; la ejecución material del benchmark es la puerta que el usuario
debe abrir.

No hay ejecución automática de APIs, no hay llamadas de red, no hay mutación
del repositorio, no hay publicación. La salida es un protocolo de evaluación.
Una ausencia de confirmación se marca `coverage_gap`, no se sustituye por una
inferencia pulida.

Derivada de benchmark-models (garrytan/gstack, MIT).
