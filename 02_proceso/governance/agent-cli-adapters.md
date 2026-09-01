# Agent CLI adapters

Contrato para que Claude, Gemini, Codex, ChatGPT Desktop y hosts afines ofrezcan
la misma experiencia sin duplicar gobierno. [CONFIG]

## Arquitectura de instrucciones

| Capa        | Autoridad                                  | Responsabilidad                                         |
| ----------- | ------------------------------------------ | ------------------------------------------------------- |
| núcleo      | `AGENTS.md`                                | invariantes aplicables a toda tarea                     |
| experiencia | `experience-first-orchestration.md`        | interacción, workflow manager y continuidad             |
| routing     | `router.yml`                               | semántica R0–R10 + R3-LOOSE y disponibilidad productiva |
| ejecución   | manifests + `commands.yaml`                | pasos, outputs, gates y comandos                        |
| seguridad   | `tool-policy.yml` + ownership              | tools, efectos y write sets                             |
| host        | `CLAUDE.md`, `GEMINI.md`, adapters futuros | sintaxis de carga y launch probe                        |

Un adapter importa o enlaza estas fuentes; nunca redefine rutas, estados o gates.

## Contrato de experiencia por host

Todo host debe:

1. mostrar identidad y menú breve ante saludo, sin cargar contexto privado;
2. omitir el menú ante una intención suficiente;
3. ejecutar el First-Turn Gateway, no un clasificador paralelo;
4. formular máximo tres preguntas materialmente bloqueantes;
5. exponer `/menu` y `/ruta` como operaciones read-only;
6. materializar brief solo mediante un handler productivo y receipt;
7. detenerse en el gate humano y presentar la siguiente acción recomendada;
8. declarar capacidades reales mediante launch probe; configuración no es ejecución.

Si el host no soporta GenUI, usa el fallback textual del mismo `ExperienceView`.
Si no puede invocar tools, conserva el plan como `planned` y entrega un handoff; no
simula archivos ni receipts.

## Adapters registrados

| Archivo/host              | Carga de reglas                   | Capacidad declarable                  |
| ------------------------- | --------------------------------- | ------------------------------------- |
| `AGENTS.md` / Codex       | nativa                            | la que pruebe el launch probe local   |
| `CLAUDE.md` / Claude Code | `@AGENTS.md`                      | la que pruebe el launch probe local   |
| `GEMINI.md` / Gemini CLI  | link Markdown                     | la que pruebe el launch probe local   |
| ChatGPT Desktop           | instrucciones del proyecto/plugin | fallback textual salvo probe material |

La compatibilidad de una release no se infiere de esta tabla. Requiere un
`ExperienceHostLaunchProbeV1` ligado a release, commit, candidate y adapter.

## Patrón para añadir un host

1. Identificar el archivo de instrucciones y si soporta imports o solo links.
2. Crear un adapter breve: identidad, primer turno, autoridad y cierre.
3. Enlazar `AGENTS.md` y `experience-first-orchestration.md`; no copiarlos.
4. Implementar launch probe offline con `network_used: false` y effects vacíos.
5. Probar saludo, acciones productivas R6–R10, intake incompleto, `/menu`, `/ruta`, resume y gate.
6. Confirmar paridad entre envelope, vista GenUI y fallback textual.
7. Ejecutar ownership, privacidad, budgets, `check:repo` y tests focales.
8. Mantener el host `UNKNOWN` hasta que el probe material pase.

## Prohibiciones

- Cargar PII, secretos o estado privado en el arranque.
- Inventar memoria, candidates, rutas, skills, receipts o archivos.
- Marcar un componente completado sin evidencia material.
- Convertir un fallback textual en un segundo flujo editorial.
- Autoaprobar brief, merge, release, distribución o publicación.
- Declarar compatibilidad de Claude, Codex, Gemini o ChatGPT por documentación.

## Fuentes y validación

- Runtime: `02_proceso/workflows/core/local-experience-orchestrator-v1.ts`.
- Vistas: `02_proceso/workflows/experience/render-experience-view.ts`.
- Host probes: `02_proceso/workflows/experience/host-launch-probe.ts`.
- Checker: `node --import tsx scripts/check-experience-os.ts`.
- Cierre repo: `pnpm check:repo`; verificación total con base explícita del PR.

Los adapters commiteados no almacenan contexto personal. `CONTEXT.md`,
`PROJECT.md`, `TASK.md` y state roots solo se leen después del route lock y cuando
el workflow los necesita. [CONFIG]
