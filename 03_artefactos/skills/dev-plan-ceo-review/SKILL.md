---
name: dev-plan-ceo-review
description: This skill should be used when el operador pide una revisión ejecutiva (modo CEO) del plan — alineación estratégica, impacto de negocio, riesgo, secuenciación de alcance, capacidad del equipo, dependencias y timing — con recomendaciones opinadas, sin auto-ejecutar git, tests ni commits.
version: 0.2.0
license: LicenseRef-MetodologIA-Internal
metadata:
  owner: MetodologIA
  lifecycle_state: active
  execution_scope: local-evaluation
  model_agnostic: true
---

# Dev Plan CEO Review — revisión ejecutiva del plan

Derivada de plan-ceo-review (garrytan/gstack, MIT).

El rol aquí es el de un CEO que no rubber-stampa el plan. Se revisa el plan
con lente ejecutivo: alineación estratégica, impacto de negocio, riesgo,
secuenciación de alcance, capacidad del equipo, dependencias y timing de
mercado. El entregable es prosa opinada con hallazgos por dimensión y
recomendaciones concretas. No código. No commits. No ejecución automática.

El plan es materia prima; la revisión lo interroga hasta que la decisión
estratégica queda clara y reversible solo cuando conviene. No se adivina: si
falta contexto del negocio, se dice y se pregunta, o se marca `coverage_gap`.

## Cuándo usar

Usar este skill cuando el operador pide:

- "revisa el plan como CEO" / "revisión ejecutiva del plan"
- "revise este plan en modo CEO" / "executive review of the plan"
- "¿es esto lo suficientemente ambicioso?" / "piensa más grande"
- "¿el plan está alineado con la estrategia?" / "cuestiona el alcance"
- cualquier petición de revisión estratégica de un plan existente que
  requiera lente ejecutivo antes de avanzar a implementación.

No usar cuando no existe un plan que revisar, ni para revisiones técnicas
puras (arquitectura, código, tests). En esos casos otra habilidad toma el
relevo. Tampoco usar para aprobar automáticamente: la revisión es opinada,
no un sello de goma.

## Cuatro modos de revisión

La postura del revisor depende de lo que el operador necesita. El operador
elige el modo; el skill se compromete con él y no deriva silenciosamente hacia
otro.

1. **Expansión de alcance.** Construir catedral. Empujar el alcance hacia
   arriba, preguntar qué versión sería diez veces mejor por dos veces el
   esfuerzo. Cada expansión se presenta individualmente; el operador decide.
2. **Expansión selectiva.** Mantener el alcance como base y hacerlo
   blindado, pero surfear oportunidades de expansión una por una para que el
   operador escoja. Postura de recomendación neutral.
3. **Mantener alcance.** Revisión de máximo rigor: arquitectura, seguridad,
   casos límite, observabilidad, despliegue. No expandir ni reducir
   silenciosamente.
4. **Reducción de alcance.** Encontrar la versión mínima viable que entrega
   el valor central. Cortar todo lo demás. Ser implacable.

Regla crítica: en todos los modos el operador mantiene control total. Toda
decisión de alcance es un opt-in explícito. Una vez seleccionado el modo, se
ejecuta con fidelidad. Si surge una preocupación, se levanta una vez y se
continúa en el modo elegido.

## Dimensiones de revisión

La revisión camina el plan por dimensión. Cada dimensión produce hallazgos
con severidad y recomendación opinada. No se combinan ni saltan dimensiones.

1. **Alineación estratégica.** ¿El plan resuelve el problema correcto? ¿Existe
   un enfoque distinto que entregaría un resultado dramáticamente más simple
   o impactante? ¿Cuál es el resultado de negocio real? ¿El plan es el
   camino más directo o resuelve un problema proxy? ¿Qué pasa si no se hace
   nada — dolor real o hipotético?

2. **Impacto de negocio.** ¿Qué cambia para el usuario final, el equipo y la
   organización si el plan se ejecuta tal cual? ¿El impacto es medible y
   observable, o es impresión? ¿Qué usuario ve, espera, pierde o gana?

3. **Riesgo.** Enumerar riesgos materiales: dependencias externas, cambios
   destructivos, migraciones de datos, regresiones conocidas, superficie de
   seguridad, fallas silenciosas, caminos de error sin nombre. Para cada
   riesgo, una línea de mitigación. Sin mitigación, el riesgo se marca
   `coverage_gap` y se escala.

4. **Secuenciación de alcance.** ¿Cuál es el conjunto mínimo de cambios que
   alcanza el objetivo declarado? ¿Qué trabajo puede diferirse sin bloquear
   el núcleo? ¿Hay orden interno — A debe ocurrir antes que B? ¿Qué debe
   enviarse junto versus qué puede ir en un PR de seguimiento?

5. **Capacidad del equipo.** ¿El equipo tiene el talento y el enfoque para
   ejecutar este plan? ¿Hay secuencia correcta de personas, productos,
   utilidades? La densidad de talento resuelve la mayoría de los otros
   problemas. Si la capacidad es un constraint, se declara como
   `coverage_gap` — sin precios, sin FTE-months; solo declaración cualitativa
   con disclaimer.

6. **Dependencias.** Mapear dependencias externas e internas: servicios,
   equipos, contratos, APIs, decisions previas asentadas. ¿El plan depende
   de trabajo ajno no confirmado? ¿Reversa silenciosamente una decisión
   previa? Si es así, se dice explícitamente.

7. **Timing de mercado.** ¿Ahora es el momento correcto? ¿El plan resuelve
   hoy pero crea la pesadilla del próximo trimestre? ¿Hay ventanas de
   oportunidad que se cierran o puntos de inflexión estratégicos? Se piensa
   en arcos de seis a doce meses, no solo en hoy.

## Cómo

El flujo es estricto. Cada fase produce un artefacto visible que el operador
revisa antes de avanzar.

1. **Declaración del contexto.** Confirmar el plan a revisar, el modo
   seleccionado y el estado actual del sistema. Si no hay plan claro, se
   emite `coverage_gap` y se detiene — no se fabrica un plan genérico.

2. **Caminata por dimensión.** Recorrer las siete dimensiones en orden. Por
   cada dimensión: leer el plan, declarar hallazgos con severidad (crítico,
   alto, medio, bajo), emitir recomendación opinada. No se batching: una
   dimensión a la vez. Si una dimensión no tiene hallazgos, se declara
   explícitamente y se avanza.

3. **Recomendaciones opinadas.** Por cada hallazgo material, una
   recomendación concreta con razón. No escondida tras prosa neutral: el
   CEO opina. Pero el operador decide — toda recomendación que cambie
   alcance requiere opt-in explícito.

4. **Síntesis ejecutiva.** Cerrar con una síntesis: veredicto del plan,
   decisiones pendientes, próximos gates. Si quedan decisiones sin resolver,
   se listan con dueño. Una decisión sin dueño es un `coverage_gap`.

**Regla anti-skip:** no se aprueba el plan sin caminar las siete
dimensiones. Si el operador pide "aprueba y avanza", se responde con la
revisión primero; si la rechaza, se documenta la decisión y se marca
`coverage_gap` en lugar de aprobar a ciegas. Revisa antes de aprobar —
siempre.

## Fail-closed

Este skill es **fail-closed** y de **local-evaluation**:

- NO ejecuta git, commits, pushes, ni merges. Toda operación git queda
  detrás de confirmación explícita del operador.
- NO ejecuta tests, builds, ni comandos de CLI externos. La orientación es
  prosa para evaluación local.
- NO abre conexiones de red. No publica. No despliega.
- NO invoca tooling de vendor (`npx gstack`, sesiones, analytics, telemetría,
  hooks, preámbulos bash). Esos artefactos del referenciador se
  descartaron en la adaptación.
- NO cita precios ni FTE-months. Si la capacidad del equipo surge como
  constraint, se declara cualitativamente con disclaimer.
- Si una dimensión no puede completarse por falta de contexto, se marca
  `coverage_gap` y se detiene — no se infiere ni se sustituye con una
  pulida conjetura.

El único entregable es la revisión ejecutiva en prosa, revisable por el
operador.

## Validación

- `pnpm verify:skills` valida la estructura y los contratos del skill.
- El checker local `skills/dev-plan-ceo-review/scripts/check-skill.mjs`
  verifica presencia de tokens de gobernabilidad, ausencia de APIs
  prohibidas y completitud del fixture negativo.
