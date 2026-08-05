---
name: dev-dispatching-parallel-agents
description: This skill should be used when el operador enfrenta dos o mas tareas independientes que pueden delegarse a sub-agentes en paralelo — descomponer el trabajo, aislar el contexto de cada agente, agregar resultados y decidir cuándo no paralelizar — sin auto-despachar ni auto-ejecutar mutaciones, commits ni dispatches.
version: 0.1.0
license: LicenseRef-MetodologIA-Internal
metadata:
  owner: MetodologIA
  lifecycle_state: active
  execution_scope: local-evaluation
  model_agnostic: true
---

# Dev Dispatching Parallel Agents — despachar sub-agentes en paralelo, método

El rol aquí es el de un ingeniero principal que enfrenta varias tareas
independientes y decide delegarlas a sub-agentes en paralelo. Despachar en
paralelo no es abrir hilos a ciegas: es descomponer el trabajo en dominios
independientes, construir para cada agente un contexto enfocado y auto-contenido,
verificar que los resultados no colisionen y agregarlos en un solo cierre. Este
skill recorre el despacho en cinco fases y entrega un plan de despacho en prosa,
revisable por el operador. No despacha. No ejecuta. No commitea.

La premisa es simple: investigar tres fallos independientes en secuencia
desperdicia tiempo. Si cada fallo vive en su propio dominio — su propio archivo,
su propio subsistema, su propio estado — puede trabajarse de forma concurrente
sin que un agente pise al otro. Pero "independiente" es una propiedad que se
verifica, no se asume: dos fallos que parecen separados pueden compartir causa
raíz, y dos agentes que editan el mismo archivo se pisan sin saberlo. El skill
declara la frontera de aislamiento antes de despachar y la re-verifica al
agregar.

## Cuándo usar

Usar este skill cuando el operador pide:

- "despacha estos tres bugs en paralelo" / "investiga estos fallos a la vez"
- "tengo N tareas independientes, repártelas entre sub-agentes"
- "paraleliza esta investigación por dominio"
- "dividir este lote de issues entre varios agentes"
- cualquier conjunto de tareas que el operador quiere delegar de forma
  concurrente a sub-agentes, siempre que el despacho no se auto-ejecute.

No usar cuando los fallos están relacionados (un fix puede resolver otros —
investigar juntos primero), cuando entender el problema requiere ver todo el
sistema a la vez, o cuando los agentes compartirían estado y se interferirían.
En esos casos no se paraleliza: se va secuencial o se rediseña la frontera.

## Las fases del despacho

El skill despacha en cinco fases. Cada fase produce un artefacto visible que el
operador revisa antes de avanzar.

1. **Identificar dominios independientes.** Agrupar las tareas por lo que está
   roto o por lo que hay que hacer — no por archivo, por dominio de problema.
   Para cada grupo, preguntar: ¿fixing este dominio afecta a otro? ¿Comparten
   estado, archivo o recurso? Si la respuesta es sí, no son independientes — se
   fusionan o se secuencian. Un dominio independiente es aquel que puede
   entenderse y resolverse sin contexto de los otros. Sin esta verificación, el
   "paralelo" es una ilusión que rompe cosas al integrar.

2. **Construir tareas enfocadas.** Cada agente recibe un prompt auto-contenido:
   alcance específico (un archivo, un subsistema, un flujo), objetivo claro
   (qué debe devolver), restricciones explícitas (qué no tocar), salida esperada
   (resumen de causa raíz y cambios, no "lo arreglé"). El agente no hereda el
   contexto ni el historial de la sesión — se construye exactamente lo que
   necesita. Un prompt vago ("arregla los tests") pierde al agente; un prompt sin
   restricciones deriva en refactor no pedido. El contexto que se ahorra aquí
   protege también al orquestador, que se queda con budget para coordinar.

3. **Verificar aislamiento.** Antes de despachar, declarar la frontera de cada
   agente: qué archivos puede tocar, qué recursos puede usar, qué comandos
   puede ejecutar. Si dos agentes tocarían el mismo archivo o recurso, no son
   independientes — se secuencian o se rediseña el reparto. El aislamiento no es
   una esperanza: es un contrato que se escribe y se revisa. Un agente sin
   frontera declarada es un riesgo de colisión silenciosa.

4. **Despachar en paralelo.** Aquí el skill produce el plan de despacho: una
   llamada por dominio, todas en el mismo turno, para que se ejecuten de forma
   concurrente. Múltiples despachos en un turno significan ejecución paralela;
   uno por turno significa secuencial. Pero — y esto es lo que separa al
   homólogo del referenciador — el despacho queda detrás de confirmación
   explícita del operador. El skill propone el plan; el operador lo autoriza.
   No se auto-despacha.

5. **Revisar y agregar.** Cuando los agentes devuelven, leer cada resumen,
   verificar que los cambios no colisionen entre dominios, correr la verificación
   completa (suite, build, validadores) e integrar. La agregación no es
   opcional: es el gate que separa "tres fixes sueltos" de "un sistema verde".
   Si los cambios colisionan, se resuelve el conflicto antes de cerrar. Un
   agente puede cometer errores sistemáticos — el spot-check no se salta.

**Regla anti-skip:** no se despacha sin el plan de las cuatro fases previas
revisado por el operador. Si el operador pide "despacha ya", se responde con el
plan de dominios, fronteras y prompts, y se documenta cualquier gap; no se
salta a despachar sin aislar ni sin autorización. Despacha en orden — siempre.

## Cuándo NO paralelizar

- **Fallos relacionados:** fixing uno puede resolver otros — investigar juntos
  primero, en un solo agente, antes de dividir.
- **Se necesita estado completo del sistema:** entender el problema requiere
  ver todo el sistema a la vez; un agente con contexto parcial no llega.
- **Debugging exploratorio:** aún no se sabe qué está roto — dividir a ciegas
  produce agentes perdidos.
- **Estado compartido:** los agentes interferirían (mismos archivos, mismos
  recursos, mismos locks) — secuenciar o rediseñar el reparto.

## Riesgos

- **Colisión silenciosa:** dos agentes editan el mismo archivo sin saberlo y se
  pisan. Mitigación: declarar fronteras de aislamiento y re-verificar al
  integrar.
- **Contexto diluido:** un prompt vago pierde al agente o lo deriva a refactor no
  pedido. Mitigación: prompt auto-contenido con alcance, objetivo,
  restricciones y salida esperada.
- **Falsa independencia:** dos dominios que parecen separados comparten causa
  raíz; despacharlos por separado duplica trabajo o genera fixes contradictorios.
  Mitigación: verificar independencia antes de dividir.
- **Agregación saltada:** tres fixes sueltos se asumen como "sistema verde" sin
  verificar la integración. Mitigación: la revisión y agregación son el gate
  final, no un paso opcional.

## Fail-closed

Este skill es **fail-closed** y de **local-evaluation**:

- NO despacha sub-agentes de forma automática. Todo dispatch queda detrás de
  confirmación explícita del operador.
- NO ejecuta git, commits, pushes ni merges. Toda operación git queda detrás de
  confirmación explícita del operador.
- NO ejecuta tests, builds, installs ni comandos de CLI externos con side
  effects. El plan de despacho es prosa para evaluación local.
- NO abre conexiones de red. No publica. No despliega.
- NO invoca tooling de vendor ni hooks de auto-arranque. Esos artefactos del
  referenciador se descartaron en la adaptación.
- NO delega mutaciones (edits, writes, commits) a sub-agentes sin gate del
  operador — un sub-agente que muta requiere el mismo fail-closed que el
  orquestador.
- Si una fase no puede completarse por falta de contexto o de acceso, se marca
  `coverage_gap` y se detiene — no se infiere ni se despacha a ciegas.

El único entregable es el plan de despacho en prosa, revisable por el operador.

## Validación

- `pnpm verify:skills` valida la estructura y los contratos del skill.
- El checker local `skills/dev-dispatching-parallel-agents/scripts/check-skill.mjs`
  verifica presencia de tokens de gobernabilidad, ausencia de APIs prohibidas y
  completitud del fixture negativo.
- Si no hay contexto de despacho (no hay tareas independientes declaradas, no
  hay dominios verificables), se emite `coverage_gap` en lugar de fabricar un
  plan genérico.

Derivada de superpowers/dispatching-parallel-agents (obra/superpowers, MIT).
