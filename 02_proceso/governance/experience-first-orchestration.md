# Experience-first orchestration

Convierte conversación normal en workflow gobernado. `AGENTS.md` manda; los
adapters no lo duplican. Journey: `../workflows/experience/service-blueprint.yml`;
ejecución: `scripting-and-tool-use.md`. [METODOLOGIA][CONFIG]

## Promesa operativa

**Frames ContentOS · por MetodologIA** recibe, comprende y orienta antes de exponer
maquinaria. El usuario no necesita conocer rutas, skills, gates ni IDs.

- Un saludo ofrece `Crear · Mejorar · Planear · Explorar` y no escribe.
- Un pedido claro omite el menú y confirma el resultado.
- Solo se preguntan gaps que cambian ruta, evidencia, entregable o autorización;
  máximo tres por ronda.
- Texto libre prevalece sobre menús. `/menu` orienta y `/ruta` explica sin escribir.
- Todo trabajo de contenido o carrera comienza con brief Markdown canónico; HTML
  es su proyección determinista.
- Todo bloqueo preserva lo válido y ofrece una acción.

## Orden obligatorio de decisión

1. **Recibir:** distinguir saludo, comando, acción, reanudación o ambigüedad.
2. **Comprender:** resumir resultado, fuentes, límites y efectos; separar supuestos.
3. **Enrutar:** resolver una ruta mediante First-Turn Gateway y registry.
4. **Auto-primar:** cargar ruta, paso, template, skill y fuentes necesarias.
5. **Contratar:** construir WorkflowPlan y WorkOrder con read/write set, actor,
   tools, budget, aceptación y stop rule.
6. **Materializar:** invocar handler, verificar archivos/hashes y emitir receipt;
   declarar una skill no es ejecutarla.
7. **Revisar:** mostrar candidate, gaps y siguiente acción.
8. **Detener:** respetar el gate manual. Producción, merge, distribución y
   publicación son decisiones distintas.

Saltar una etapa produce `UNKNOWN/BLOCKED`; la narrativa no la completa. [CONFIG]

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

El registry R0–R10 más R3-LOOSE es la autoridad semántica; disponibilidad documental no implica
handler productivo. [CONFIG]

| Ruta          | Uso                                 | Estado Experience                                       |
| ------------- | ----------------------------------- | ------------------------------------------------------- |
| R0            | ambigüedad o capacidad no resoluble | productivo, fail-closed                                 |
| R1            | crear proyecto                      | plan read-only hasta `PJ_SCAFFOLD_APPROVED`             |
| R2            | continuar proyecto                  | lista candidatos, nunca elige; `PJ_RESUME_CONFIRMED`    |
| R3 / R3-LOOSE | crear tarea                         | plan read-only hasta `TK_CONTRACT_APPROVED`             |
| R4            | reanudar candidate                  | productivo solo con lineage hash-bound                  |
| R5            | eval/ablation                       | plan read-only hasta `EV_RUN_APPROVED`                  |
| R6            | contenido P00–P09                   | productivo hasta `EXP_BRIEF_APPROVED` / gate de dominio |
| R7            | Career C00–C09                      | productivo hasta `EXP_BRIEF_APPROVED` / gate de dominio |
| R8            | extensiones locales                 | productivo hasta `LX_BRIEF_APPROVED`                    |
| R9            | mantenimiento del harness           | productivo hasta `HM_CHANGE_APPROVED`                   |
| R10           | NotebookLM OS                       | plan-first hasta el gate NLM específico                 |

Una ruta sin handler puede orientar, no ejecutar. Nunca inventa un pipeline ni un
sustituto para ocultar el `coverage_gap`.

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

El brief exige intake suficiente. El siguiente paso recomienda; no autoriza.

## Contexto y continuidad

- No cargar `CONTEXT.md`, `PROJECT.md`, `TASK.md` ni estado privado en un saludo.
- Cargar contexto privado solo si ruta y sesión lo autorizan.
- Reanudar exige `candidate_id`, state root, lineage, artefacto y receipt regulares,
  contenidos por `realpath` y con hash vigente.
- Cero o varias coincidencias bloquean; nunca elegir por similitud débil.
- Un cambio estructural crea successor y preserva el candidate anterior.

## Presentación y hospitalidad

- Primera frase: resultado o identidad; nunca explicar el arnés.
- Una acción primaria y máximo dos alternativas contextuales.
- Texto libre prevalece siempre. Ghost menus solo viven en conversación; nunca se
  insertan en briefs, entregables o evidencia.
- Ocultar IDs, routes y gates salvo `/ruta` o necesidad operativa.
- Tras un hito: qué quedó listo, recomendación y punto de parada.
- Ante fallo: causa, trabajo preservado, evidencia necesaria y una reparación.
- Un fallback textual es equivalente en significado, pero no se presenta como
  GenUI material sin adapter y launch probe `PASS`.
- “Wow” es propósito, evidencia, accesibilidad y claridad; sin ornamento innecesario.

## Scripting y tool use

- Recibir prompts por stdin o JSON validado; no interpolarlos en shell.
- Invocar executable y argv explícitos, con `shell: false` y `--` cuando aplique.
- Operar read-only/dry-run por defecto; dry-run no crea receipts, estado ni cachés.
- Contener inputs y outputs por `realpath`, ownership y write set pre/post.
- Escribir de forma atómica y calcular hashes al releer el output material.
- Validar effect class y gate antes de cada acción; timeout, parcial o `UNKNOWN`
  bloquean. El contrato completo está en `scripting-and-tool-use.md`.

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
