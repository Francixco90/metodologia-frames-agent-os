---
name: dev-using-git-worktrees
description: This skill should be used when se necesita aislamiento del workspace antes de ejecutar planes de implementación o trabajar en features que requieren un espacio de trabajo aislado vía worktrees nativos o fallback git
version: 0.1.0
license: LicenseRef-MetodologIA-Internal
metadata:
  owner: MetodologIA
  lifecycle_state: active
  execution_scope: local-evaluation
  model_agnostic: true
---

Derivada de using-git-worktrees (obra/superpowers, MIT).

# Dev Using Git Worktrees — aislar el workspace antes de implementar

El rol aquí es el de un ingeniero que va a ejecutar un plan de implementación
o a trabajar en un feature que toca el árbol de trabajo, y necesita un espacio
aislado para no poner en riesgo la rama actual. Aislar no es decoración: es
evitar que los cambios en curso se mezclen con el trabajo nuevo, que se
comprometa la rama principal por accidente, o que un baseline roto convierta
cada fallo posterior en un misterio. Este skill describe cómo razonar sobre el
aislamiento, cómo detectar si ya existe, y cómo proponer crearlo — sin
auto-ejecutar git, worktree ni branch.

La premisa es simple: antes de crear nada, detecta si ya estás aislado. Luego
prefiere la herramienta nativa del entorno (un comando `EnterWorktree`, un
comando `/worktree`, una bandera `--worktree`). Solo si no existe, cae al
fallback manual de `git worktree add`. Nunca pelees contra el entorno — una
herramienta nativa que no se usa deja estado fantasma que el entorno no puede
gestionar.

## Cuándo usar

Usar este skill cuando el operador pide:

- "implementa este plan" / "ejecuta el feature X"
- "trabaja en una rama aislada" / "no toques la rama actual"
- "aisla el workspace antes de empezar"
- "crea un worktree para este cambio"
- cualquier feature o plan que requiera un espacio de trabajo aislado antes de
  modificar el árbol de trabajo.

No usar cuando el cambio es trivial y el operador no pide aislamiento, ni
cuando ya hay un worktree activo y visible en el contexto. En esos casos se
trabaja en el lugar y se omite la creación.

## Las fases del aislamiento

El skill razona el aislamiento en tres fases. Cada fase produce una decisión
visible que el operador confirma antes de avanzar.

1. **Detectar aislamiento existente.** Antes de crear nada, verificar si el
   workspace ya está aislado. Comparar el directorio git real con el
   directorio git común: si difieren (y no es un submodule), ya se está en un
   worktree vinculado — no se crea otro. Si son iguales, se está en un checkout
   normal. Reportar el estado al operador: rama actual, path del worktree si
   aplica, HEAD desacoplado si aplica. Sin detección, se corre el riesgo de
   crear un worktree dentro de un worktree o de pisar el aislamiento que el
   entorno ya gestionaba.

2. **Elegir mecanismo.** Si no hay aislamiento y el operador lo quiere, se
   elige el mecanismo por prioridad. Primero la herramienta nativa del
   entorno: si existe un comando tipo `EnterWorktree`, `WorktreeCreate`, un
   comando `/worktree` o una bandera `--worktree`, se usa esa — maneja
   ubicación del directorio, creación de la rama y limpieza automáticamente.
   Solo si no hay herramienta nativa se cae al fallback manual de
   `git worktree add` con una rama nueva. La elección se documenta: qué
   mecanismo se eligió y por qué.

3. **Preparar el workspace aislado.** Una vez creado el worktree (con
   confirmación del operador), se razona sobre el setup del proyecto y la
   verificación del baseline. El setup detecta el stack presente (Node, Rust,
   Python, Go) y propone el comando de instalación apropiado. El baseline
   ejecuta los tests del proyecto para confirmar que el workspace arranca
   limpio. Ambos pasos quedan detrás de confirmación explícita del operador —
   no se auto-arrancan installs ni tests. Si el baseline falla, se reportan
   los fallos y se pregunta al operador si procede o si investiga primero; no
   se avanza sobre un baseline roto sin consentimiento.

**Regla anti-skip:** no se salta la detección (Fase 1) por "obviamente no estoy
en un worktree". El aislamiento creado por el entorno y los submodules engañan
al ojo — solo los comandos de detección lo settle. Tampoco se salta la
verificación del baseline por "el workspace está fresco": un baseline sucio
hace que cada fallo posterior sea ambiguo.

## Fail-closed

Este skill es **fail-closed** y de **local-evaluation**:

- NO ejecuta `git worktree add`, `git branch`, `git worktree remove` ni
  ninguna operación git que mute el repositorio. Toda creación de worktree,
  rama o eliminación queda detrás de confirmación explícita del operador.
- NO auto-arranca installs, builds ni tests. El setup del proyecto y la
  verificación del baseline se proponen al operador y se ejecutan solo con
  confirmación.
- NO abre conexiones de red. No publica. No despliega.
- NO invoca tooling de vendor ni hooks automáticos del referenciador. Esos
  artefactos se descartaron en la adaptación.
- Si la detección no puede completarse por falta de acceso al repositorio o
  contexto, se marca `coverage_gap` y se detiene — no se infiere el estado ni
  se asume aislamiento sin evidencia.

El único entregable es el razonamiento del aislamiento en prosa — estado
detectado, mecanismo elegido, pasos propuestos — revisable por el operador.

## Errores comunes

| Excusa                                                              | Realidad                                                                                                                                                     |
| ------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| "Obviamente no estoy en un worktree — no hace falta detectar"       | Ejecutar la Fase 1. El aislamiento del entorno y los submodules engañan al ojo; los comandos de detección lo settle.                                         |
| "`git worktree add` es más rápido que buscar la herramienta nativa" | Una herramienta nativa owns la ubicación, la rama y la limpieza. Saltársela es el error número uno — crea estado fantasma que el entorno no puede gestionar. |
| "El directorio de worktrees seguramente ya está ignorado"           | Verificar con `git check-ignore`. Un directorio de worktree no ignorado compromete todo el árbol al repo.                                                    |
| "Cualquier nombre de directorio sirve"                              | Las instrucciones explícitas del operador vencen al directorio local existente, que vence al default `.worktrees/`.                                          |
| "El workspace está fresco — el baseline puede esperar"              | Un baseline sucio hace que cada fallo posterior sea ambiguo. Ejecutar los tests ahora; avanzar sobre fallos es decisión del operador.                        |
| "Crear el worktree no necesita confirmación"                        | Toda operación git que mute el repositorio (worktree, branch, remove) queda detrás de confirmación explícita del operador. Fail-closed.                      |

## Validación

- `pnpm verify:skills` valida la estructura y los contratos del skill.
- El checker local `skills/dev-using-git-worktrees/scripts/check-skill.mjs`
  verifica presencia de tokens de gobernabilidad, ausencia de APIs prohibidas
  y completitud del fixture negativo.
- Si no hay contexto de aislamiento (no hay repo accesible, no hay preferencia
  declarada), se emite `coverage_gap` en lugar de fabricar un setup genérico.
