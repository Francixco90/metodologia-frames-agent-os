---
name: dev-document-release
description: This skill should be used when el operador pide redactar o sincronizar la documentación de un release — notas de versión, changelog, README/ARCHITECTURE/CONTRIBUTING/CLAUDE.md alineados con lo que se envió, mapa de cobertura Diataxis, drift de diagramas y limpieza de TODOS — dejando los artefactos en prosa lista para revisión, sin auto-commits, auto-tags, auto-publish ni auto-release.
version: 0.3.0
license: LicenseRef-MetodologIA-Internal
metadata:
  owner: MetodologIA
  lifecycle_state: active
  execution_scope: local-evaluation
  model_agnostic: true
---

# Dev Document Release — redactar la documentación de un release ya enviado

Derivada de document-release (garrytan/gstack, MIT).

El rol aquí es el de un ingeniero de documentación que recibe un release ya
enviado (código commiteado, PR existe o está por existir) y produce la
documentación que lo acompaña: notas de versión, changelog, README,
ARCHITECTURE, CONTRIBUTING y CLAUDE.md alineados con lo que realmente se
envió. El entregable es prosa y ediciones propuestas, revisable por el
operador. No commits. No tags. No publicaciones. No ejecución automática.

## Cuándo usar

Usar este skill cuando el operador pide:

- "redacta las notas de versión" / "escribe el changelog del release"
- "sincroniza la documentación con lo que se envió" / "update docs after ship"
- "documenta qué cambió" / "post-ship docs"
- "revisa la cobertura de documentación antes de mergear el PR"
- cualquier release ya enviado cuyo operador quiere la documentación alineada
  antes de cerrar el PR.

No usar cuando el release aún no existe (ahí toca especarlo y enviarlo
primero), ni cuando lo que se necesita es investigar un bug o validar
calidad. En esos casos otra habilidad toma el relevo.

## Las dimensiones del redactado

El skill redacta la documentación del release a lo largo de ocho dimensiones.
Cada dimensión produce un artefacto visible que el operador revisa antes de
avanzar.

1. **Auditoría del diff.** Revisar qué se envió: archivos cambiados, commits
   incluidos, superficie pública nueva o modificada. Clasificar los cambios
   en categorías relevantes para la documentación: nuevas capacidades,
   comportamiento modificado, funcionalidad eliminada, infraestructura.
   Emitir un breve recuento: "N archivos cambiados en M commits, K archivos
   de documentación por revisar." Sin diff no hay redactado — se pide el
   contexto o se marca `coverage_gap`.

2. **Mapa de cobertura (blast-radius).** Antes de tocar ningún archivo,
   construir un mapa de cobertura de lo que se envió versus lo que está
   documentado, inspirado en el marco Diataxis (referencia / cómo / tutorial
   / explicación) aplicado como lente de auditoría, no como generador. Para
   cada elemento de superficie pública nueva o modificada (funciones,
   comandos, flags, endpoints, skills, variables de entorno, feature flags)
   evaluar: ¿tiene referencia? ¿tiene cómo? ¿tiene tutorial? ¿tiene
   explicación? Los ítems con cobertura cero son **vacíos críticos** —
   marcarlos para la dimensión 3. Los ítems con solo referencia son **vacíos
   comunes** — notarlos para el cuerpo del PR. El mapa informa, nunca
   genera: no se autogeneran páginas faltantes, solo se señalan los vacíos.

3. **Actualización de docs por archivo.** Auditar cada archivo de
   documentación (README, ARCHITECTURE, CONTRIBUTING, CLAUDE.md, tabs y listas)
   contra lo que se envió. Aplicar correcciones factuales directamente:
   rutas, conteos, números de versión, referencias cruzadas estancadas,
   ítems nuevos en tablas y listas. Para cambios narrativos o subjetivos
   (filosofía, seguridad, eliminaciones, reescrituras grandes) detenerse y
   proponer la edición al operador. Toda edición lleva un resumen de una
   línea: qué cambió y por qué. La capacidad de descubrimiento importa: todo
   archivo de documentación debe ser alcanzable desde el README o el CLAUDE.md
   del proyecto.

4. **Pulido de voz del changelog.** El changelog se pule en wording, no se
   reemplaza ni se regenera. Nunca se sobreescribe, elimina ni reemplaza
   una entrada existente — solo se ajusta la redacción. Una entrada de
   changelog se evalúa con un test de venta: ¿un lector externo entiende qué
   gana o qué deja de perder al actualizar? Si la entrada dice "varios
   fixes", se precisa; si dice "mejoras", se concreta; si dice "refactor",
   se ata al impacto observable. No se inventa impacto que el diff no respalda.

5. **Detección de drift de diagramas.** Si ARCHITECTURE.md u otro documento
   contiene diagramas ASCII o bloques Mermaid, extraer los nombres de
   entidades (módulos, servicios, flujos de datos) y cruzarlos contra el
   diff. Marcar cualquier entidad renombrada, dividida, eliminada o movida.
   El drift de diagramas es advisory: se señala en el cuerpo del PR, no se
   autoedita el arte ASCII o los bloques Mermaid — requieren juicio humano.

6. **Limpieza de TODOS.** Revisar los marcadores TODOS del código y de la
   documentación. Marcar como completos los que el release resuelve, y
   proponer al operador los nuevos que conviene añadir. No se eliminan
   TODOS sin confirmación — se proponen.

7. **Bump de VERSION.** Si existe un archivo VERSION o equivalente, verificar
   si el alcance del release lo cubre. Nunca se bumpa en silencio: siempre
   se pregunta al operador. Incluso si ya se bumpó, se valida que alcance
   para todo el scope de cambios. Un bump parcial es un `coverage_gap`.

8. **Deuda de documentación en el cuerpo del PR.** Consolidar los vacíos del
   mapa de cobertura, el drift de diagramas y los TODOS pendientes en un
   resumen de deuda de documentación para el cuerpo del PR. La deuda se
   señala, no se paga en automático: el operador decide qué tapar antes de
   mergear y qué dejar para un follow-up.

**Regla anti-skip:** no se publica, mergea, taggea ni libera sin confirmación
explícita del operador. Si el operador pide "publica ya", se entrega la
documentación redactada primero; si la rechaza, se documenta la decisión y
se marca `coverage_gap`. Documenta antes de liberar — siempre.

## Gobierno documental transversal

Antes de proponer o ejecutar cualquier `CREATE`, `EXPAND`, `EXTEND`, `CORRECT`,
`MIGRATE` o `DEPRECATE`, exigir un `DocumentationImpactPlanV1` completo. No declarar el
release documental terminado sin `DocumentationClosureReceiptV1` ligado al candidate y
evidencia del gate `DOCS_TRANSVERSAL_COMPLETE`; esta skill no autoaprueba ese gate.
Aplicar el contrato de [gobierno documental](references/documentation-governance.md).

## Fail-closed

Este skill es **fail-closed** y de **local-evaluation**:

- NO ejecuta git, commits, pushes, merges, tags ni releases. Toda operación
  git y de publicación queda detrás de confirmación explícita del operador.
- NO abre conexiones de red. No publica. No despliega. No libera.
- NO invoca tooling de vendor (`npx gstack`, `${CLAUDE_PLUGIN_ROOT}`,
  sesiones, analytics, telemetría, mockup generators, auto git/test/commit/
  deploy/publish). Esos artefactos del referenciador se descartaron en la
  adaptación.
- NO autocompleta el bump de VERSION ni autocomitea el changelog. Todo gate
  de versión, commit, tag y release queda detrás de confirmación explícita
  del operador.
- NO autogenera páginas de documentación faltantes. El mapa de cobertura
  informa los vacíos; no los rellene con prosa fabricada.
- Si una dimensión no puede completarse por falta de diff o de contexto, se
  marca `coverage_gap` y se detiene — no se infiere ni se sustituye con una
  pulida conjetura.

El único entregable es la documentación del release en prosa y ediciones
propuestas, revisable por el operador.

## Validación

- `pnpm verify:skills` valida la estructura y los contratos del skill.
- El checker local `skills/dev-document-release/scripts/check-skill.mjs`
  verifica presencia de tokens de gobernabilidad, ausencia de APIs prohibidas
  y completitud del fixture negativo.
