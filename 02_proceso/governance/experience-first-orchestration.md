# Experience-first orchestration

Fuente canónica para convertir una conversación normal en un workflow gobernado.
`AGENTS.md` fija los invariantes; los adapters de host aplican esta política sin
copiarla. [CONFIG]

## Promesa operativa

**Frames ContentOS · por MetodologIA** recibe, comprende, orienta y recién después
expone la maquinaria. El usuario no necesita conocer rutas, skills, gates ni IDs.

- Un saludo ofrece `Crear · Mejorar · Planear · Explorar` y no escribe.
- Un pedido claro omite el menú y confirma brevemente el resultado entendido.
- Solo se preguntan gaps que cambian ruta, evidencia, entregable o autorización;
  máximo tres por ronda.
- Texto libre prevalece sobre menús. `/menu` orienta y `/ruta` explica sin escribir.
- Todo trabajo de contenido o carrera comienza con brief Markdown canónico; HTML
  es su proyección determinista.
- Todo bloqueo preserva lo válido y ofrece una acción concreta para continuar.

## Orden obligatorio de decisión

1. **Recibir:** normalizar el pedido y distinguir saludo, comando, acción,
   reanudación o ambigüedad.
2. **Comprender:** resumir resultado, audiencia, fuentes, restricciones y efectos;
   separar hechos, supuestos y gaps.
3. **Enrutar:** ejecutar el First-Turn Gateway y resolver una sola ruta del registry.
4. **Auto-primar:** cargar únicamente ruta, workflow, paso activo, template, skill
   primaria y fuentes necesarias.
5. **Contratar:** construir WorkflowPlan y WorkOrder con read/write set, actor,
   tools, budget, aceptación y stop rule.
6. **Materializar:** invocar el handler registrado, verificar archivos y hashes y
   emitir receipt; declarar una skill no equivale a ejecutarla.
7. **Revisar:** mostrar brief/candidate, gaps y siguiente acción en lenguaje humano.
8. **Detener:** respetar el gate manual. Producción, merge, distribución y
   publicación son decisiones distintas.

Saltar una etapa produce `UNKNOWN/BLOCKED`; nunca se completa retrospectivamente
con narrativa. [CONFIG]

## Clases de interacción

| Clase                   | Respuesta visible                      | Runtime                      | Escritura               |
| ----------------------- | -------------------------------------- | ---------------------------- | ----------------------- |
| `ASSIST_ONLY`           | identidad + cuatro entradas            | vista `WelcomeCard`          | ninguna                 |
| `ACTIONABLE` suficiente | entendimiento + brief + recomendación  | ruta → workflow → WorkOrder  | local y allowlisted     |
| `ACTIONABLE` incompleta | hasta tres preguntas                   | preview en memoria           | ninguna                 |
| `RESUME_CANDIDATE`      | último hito + acción recomendada       | lineage y hashes verificados | ninguna hasta confirmar |
| `AMBIGUOUS`             | recomendación + hasta dos alternativas | candidatos con reason codes  | ninguna                 |
| `/menu`                 | menú breve                             | vista gobernada              | ninguna                 |
| `/ruta`                 | ruta, workflow, skills y gates         | inspección gobernada         | ninguna                 |

## Estado productivo del routing

El registry R0–R7 es la autoridad semántica; disponibilidad documental no implica
handler productivo. [CONFIG]

| Ruta          | Uso                                 | Estado Experience                                       |
| ------------- | ----------------------------------- | ------------------------------------------------------- |
| R0            | ambigüedad o capacidad no resoluble | productivo, fail-closed                                 |
| R1            | crear proyecto                      | `coverage_gap`: handler no integrado                    |
| R2            | continuar proyecto                  | `coverage_gap`: lista sin elección arbitraria           |
| R3 / R3-LOOSE | crear tarea                         | `coverage_gap`: handler no integrado                    |
| R4            | reanudar candidate                  | productivo solo con lineage hash-bound                  |
| R5            | eval/ablation                       | `coverage_gap`: ejecución aislada no integrada          |
| R6            | contenido P00–P09                   | productivo hasta `EXP_BRIEF_APPROVED` / gate de dominio |
| R7            | Career C00–C09                      | productivo hasta `EXP_BRIEF_APPROVED` / gate de dominio |

Una ruta sin handler registrado puede orientar, pero no afirmar ejecución. No se
inventa un pipeline ni se sustituye por un comando parecido.

## Workflow manager

Para cada pedido accionable, el manager debe resolver:

- `IntentEnvelope`: resultado, inputs, fuentes, sensibilidad y efectos.
- `RouteDecision`: ruta, reason codes, workflow y siguiente gate.
- `WorkflowPlan`: solo pasos necesarios, dependencias, outputs y stop rules.
- `AutoPrime`: contexto mínimo del paso activo; no cargar todos los workflows.
- `WorkOrder`: owner, actor, read/write set, tools, budget y aceptación.
- `SkillBinding`: una primary skill; adicionales solo por capacidad distinta o
  separación producer–verifier.
- `SkillInvocationReceipt`: identidad, WorkOrder, artefactos y hashes releídos.
- `ExperienceView`: estado, recomendación, hasta dos alternativas y fallback textual.

El brief se materializa únicamente cuando el intake es suficiente. El siguiente
paso es una recomendación, no autorización para ejecutarlo.

## Contexto y continuidad

- No cargar `CONTEXT.md`, `PROJECT.md`, `TASK.md` ni estado privado en un saludo.
- Cargar contexto privado solo si la ruta lo necesita y la sesión lo autoriza.
- Reanudar requiere `candidate_id` exacto, state root explícito y lineage, artefacto
  y receipt regulares, contenidos por `realpath` y con hash vigente.
- Cero o varias coincidencias bloquean; nunca elegir por similitud débil.
- Un cambio estructural crea successor y preserva el candidate anterior.

## Presentación y hospitalidad

- Primera frase: resultado entendido o identidad; nunca una explicación del arnés.
- Una acción primaria y máximo dos alternativas contextuales.
- IDs, routes y gates se ocultan salvo `/ruta`, debugging o necesidad operativa.
- Tras un hito: qué quedó listo, recomendación y punto de parada.
- Ante fallo: causa, trabajo preservado, evidencia necesaria y una reparación.
- “Wow” significa adecuado al propósito, verificable, accesible y claro; no más
  ornamento, texto o agentes de los necesarios.

## Autoridad, gates y evidencia

- `router.yml` decide ruta; manifests P00–P09/C00–C09 deciden pasos.
- `commands.yaml` resuelve gates; `tool-policy.yml` limita herramientas y efectos.
- `ownership-manifest.yml` resuelve un writer por path.
- Solo un receipt material permite decir `executed`; sin él, `planned`.
- `PASS` requiere outputs y evidencia existentes, regulares, contenidos y hash-bound.
- `UNKNOWN`, fuente insuficiente, ownership ambiguo o gate manual bloquean.
- `RENDERED_DRAFT`, `HUMAN_APPROVED`, `READY` y `PUBLISHED` nunca son sinónimos.

## Cierre mínimo

El handoff informa resultado, artefactos, validaciones, gaps, privacidad, efectos,
estado, rollback y siguiente gate. La verificación completa no concede merge,
release ni publicación. [CONFIG]
