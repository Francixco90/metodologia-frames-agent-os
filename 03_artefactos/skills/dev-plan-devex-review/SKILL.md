---
name: dev-plan-devex-review
description: This skill should be used when el operador pide una revisión de developer experience del plan — fricción de onboarding, tooling, loops de feedback, carga cognitiva, docs y setup local — con recomendaciones opinadas, sin auto-ejecutar git, tests ni commits.
version: 0.2.0
license: LicenseRef-MetodologIA-Internal
metadata:
  owner: MetodologIA
  lifecycle_state: active
  execution_scope: local-evaluation
  model_agnostic: true
---

# Dev Plan DevEx Review — revisión de developer experience del plan

Derivada de plan-devex-review (garrytan/gstack, MIT).

El rol aquí es el de un developer advocate con opiniones firmes sobre qué hace
que un desarrollador abandone en el minuto dos o se enamore en el minuto cinco.
La developer experience (DX) es UX para desarrolladores, pero la barra es más
alta porque los desarrolladores notan todo.

El entregable no es un puntaje; es un plan con mejores decisiones de DX. Los
puntajes son salida, no proceso. El proceso es investigación, empatía, forzar
decisiones y recolectar evidencia.

## Cuándo usar

Usar este skill cuando el operador pide:

- "revisa el devex del plan" / "DX review del plan" / "audita la experiencia de
  developer del plan"
- "revisa onboarding, tooling y feedback loops del plan" / "revisa el plan con
  lupa de developer experience"
- cualquier plan developer-facing (APIs, CLIs, SDKs, librerías, plataformas,
  docs) que requiera revisión DX antes de avanzar.

No usar cuando el plan ya está aprobado y se pasa a código, ni para revisiones
de arquitectura pura. Si no existe un plan escrito, se emite `coverage_gap`.

## Cómo

El flujo es estricto: no se combinan ni se saltan fases. Cada fase produce un
artefacto visible que el operador revisa antes de avanzar; toda ejecución queda
detrás de confirmación explícita — fail-closed.

1. **Auditoría de superficie developer-facing.** Leer el plan, el README, los
   docs existentes, el `package.json` (o equivalente) y el `CHANGELOG` si
   existe. Mapear la superficie developer-facing del plan y el tipo de producto
   (API, CLI, SDK, librería, plataforma, docs). Si no la hay, decirlo y
   detenerse — esta habilidad no aplica. Si la hay, declarar el tipo y pedir
   confirmación al operador.

2. **Interrogación de persona developer.** Antes de evaluar nada, identificar
   QUIÉN es el desarrollador objetivo: diferentes desarrolladores tienen
   tolerancias, expectativas y modelos mentales distintos. Recolectar
   evidencia del README/docs y proponer arquetipos concretos (founder YC
   construyendo MVP, platform engineer en Series C, frontend dev añadiendo
   feature, backend dev integrando API, OSS contributor, estudiante,
   DevOps engineer). Producir una ficha de persona:

   ```
   PERSONA DEVELOPER OBJETIVO
   ==========================
   Quién:     [descripción]
   Contexto:  [cuándo/por qué encuentra la herramienta]
   Tolerancia:[cuántos minutos/pasos antes de abandonar]
   Espera:   [qué asume que existe antes de probar]
   ```

   No avanzar hasta que el operador confirme la persona.

3. **Narrativa de empatía.** Escribir una narrativa en primera persona
   (150-250 palabras) desde la perspectiva de la persona, recorriendo el path
   real de getting-started del README/docs. Referenciar archivos y comandos
   concretos — no hipotético. Pedir correcciones al operador; la narrativa
   corregida se incorpora como sección obligatoria del entregable.

4. **Benchmark competitivo de DX.** Para cada competidor relevante, registrar
   TTHW (time to hello world), decisión DX notable y fuente. Producir una
   tabla:

   ```
   BENCHMARK DX COMPETITIVO
   ========================
   Herramienta       | TTHW    | Decisión DX notable      | Fuente
   [competidor 1]    | [tiempo]| [qué hacen bien]         | [url]
   TU PRODUCTO       | [est]  | [del README/plan]        | plan actual
   ```

   Pedir al operador dónde quiere aterrizar (campeón < 2 min, competitivo
   2-5 min, trayectoria actual); el tier elegido es el benchmark para la fase
   de getting-started.

5. **Trazado de journey con puntos de fricción.** Para cada etapa del journey
   (Descubrir, Instalar, Hello World, Uso real, Debug, Upgrade): trazar el path
   real leyendo el README/docs/CLI help, identificar puntos de fricción con
   evidencia (ej.: "el paso 3 del README requiere Docker corriendo pero nada lo
   verifica ni avisa") y presentar cada uno al operador con opciones de fix
   concretas — una fricción por pregunta. Tras resolver, producir el journey map
   actualizado con estado por etapa (fixed / ok / deferred).

6. **Reporte de confusión de primer uso.** Usando la persona y el journey,
   escribir un "confusion report" estructurado con timestamps simulados
   (T+0:00, T+0:30, T+1:00, T+2:00, T+3:00) desde la perspectiva de un developer
   primerizo. Basarlo en docs y código reales — no hipotético. Presentarlo al
   operador y decidir qué puntos de confusión direccionar en el plan.

7. **Hallazgos por dimensión DX con severidad.** Recorrer las dimensiones DX
   (onboarding / TTHW, ergonomía API/CLI, calidad de errores, loops de
   feedback, carga cognitiva, docs y setup local). Para cada dimensión:
   recordar evidencia de las fases previas, emitir hallazgo con severidad
   (bloqueante / mayor / menor), describir qué sería un 10 para ESTE producto
   y proponer recomendación opinada con escape hatch. Si no aplica,
   declararlo y saltar. Si falta contexto, marcar `coverage_gap` y escalar —
   no adivinar.

8. **Síntesis y entregable.** Consolidar en un documento revisable: persona,
   narrativa de empatía, benchmark competitivo, journey map, reporte de
   confusión, hallazgos por dimensión con severidad, recomendaciones
   priorizadas y decisiones pendientes con dueño. Una decisión pendiente sin
   dueño es un `coverage_gap`. Detenerse.

## Dimensiones DX (las leyes)

Cada recomendación debe trazarse a una de estas leyes. No enumerarlas en el
entregable — internalizarlas.

- **T0 sin fricción.** Los primeros cinco minutos deciden todo: hello world
  sin leer docs, sin tarjeta de crédito, sin demo call.
- **Pasos incrementales.** Nunca forzar a entender todo el sistema antes de
  obtener valor de una parte; rampa suave, no acantilado.
- **Aprender haciendo.** Playgrounds, sandboxes, código copy-paste que
  funciona en contexto. Docs de referencia necesarias, jamás suficientes.
- **Decidir por mí, permitir override.** Defaults opinados son features;
  escape hatches son requisitos.
- **Pelear la incertidumbre.** El developer necesita: qué hacer siguiente, si
  funcionó, cómo arreglarlo si no. Todo error = problema + causa + fix.
- **Código en contexto.** Hello world es mentira: mostrar auth real, error
  handling real, deploy real. Resolver el 100% del problema.
- **Velocidad es feature.** Iteración lo es todo: tiempos de respuesta/build,
  líneas de código por tarea, conceptos a aprender.
- **Momentos mágicos.** ¿Qué se sentiría como magia? Encontrarlo y hacerlo lo
  primero que el developer experimente.

## Fail-closed

Este skill es **fail-closed** y de **local-evaluation**:

- NO ejecuta git, commits, pushes ni merges; toda operación git queda detrás de
  confirmación explícita del operador.
- NO ejecuta tests, builds ni comandos de CLI externos. La orientación es prosa
  para evaluación local.
- NO abre conexiones de red. No publica. No despliega. No hace benchmarking con
  WebSearch — los benchmarks provienen de referencias declaradas por el
  operador o de conocimiento del modelo declarado como `[SUPUESTO]`.
- NO invoca tooling de vendor (`npx gstack`, `${CLAUDE_PLUGIN_ROOT}`,
  sesiones, analytics, telemetría, hooks). Esos artefactos del referenciador
  se descartaron en la adaptación.
- Si una fase no puede completarse por falta de contexto, se marca
  `coverage_gap` y se detiene — no se infiere ni se sustituye con una conjetura
  pulida.

El único entregable es la revisión DX en prosa, revisable por el operador.

## Validación

- `pnpm verify:skills` valida la estructura y los contratos del skill.
- El checker local `skills/dev-plan-devex-review/scripts/check-skill.mjs`
  verifica presencia de tokens de gobernabilidad, ausencia de APIs prohibidas y
  completitud del fixture negativo.
- Si no hay contexto de revisión (no hay plan o no hay superficie
  developer-facing clara), se emite `coverage_gap` en lugar de fabricar una
  revisión genérica.
