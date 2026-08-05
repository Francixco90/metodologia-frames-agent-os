---
name: dev-writing-skills
description: This skill should be used when se crean nuevas skills, se editan skills existentes, o se verifica que las skills funcionan antes de su despliegue — cubre autoría, estructura, frontmatter, fixtures y validación de skills
version: 0.1.0
license: LicenseRef-MetodologIA-Internal
metadata:
  owner: MetodologIA
  lifecycle_state: active
  execution_scope: local-evaluation
  model_agnostic: true
---

Derivada de writing-skills (obra/superpowers, MIT).

# Dev Writing Skills — autoría y verificación de skills MetodologIA

El rol aquí es el de un autor que crea, edita o verifica skills MetodologIA
antes de su despliegue. Autoría no es redactar prosa bonita: es construir una
referencia reproducible — estructura, frontmatter, fixtures, checker, frontera
de ejecución — que un operador pueda inspeccionar y un agente pueda cargar sin
ambigüedad. Este skill recorre la receta H-03 (SKILL.md + LINEAGE.yml +
fixtures + check-skill.mjs + runtime-boundary.yml) y entrega la guía de
autoría en prosa, revisable por el operador. No crea skills
automáticamente. No valida automática. No publica.

La premisa es simple: una skill sin estructura es ruido, una skill sin
fixtures es opinión, una skill sin checker es fe ciega, una skill sin frontera
de ejecución es un riesgo. "Ya quedó" no sirve — se verifica con el checker
local—; "es claro para mí" no sirve — se escriben fixtures positivo y negativo
que prueben la intención—; "se parece al referenciador" no sirve — se
declaró la derivación en LINEAGE.yml y se reescribió la prosa en limpio. No se
adivina: si no se sabe un campo, se dice y se pregunta, o se lee el contrato
primero.

## Cuándo usar

Usar este skill cuando el operador pide:

- "crea una skill nueva" / "escribe una skill"
- "edita esta skill existente" / "ajusta el frontmatter"
- "verifica que esta skill funciona antes de desplegar"
- "arma los fixtures de esta skill" / "escribe el checker local"
- cualquier autoría, edición o verificación de skills MetodologIA que el
  operador quiere hacer de forma metódica antes de publicar.

No usar cuando se necesita aprender un codebase nuevo (ahí toca `dev-learn`),
ni cuando se necesita afinar un plan cerrado (ahí toca `dev-plan-tune`). En
esos casos otra habilidad toma el relevo.

## La receta H-03

Toda skill MetodologIA se autoría con cinco recursos obligatorios. Ninguno
es opcional; ninguno se genera por defecto. El autor los produce a mano, en
prosa, y el checker local los verifica.

1. **SKILL.md.** La referencia principal. Contiene frontmatter, descripción
   de cuándo usar, cuerpo en prosa y sección de errores comunes. Es lo que un
   agente carga al ejecutar la skill — su prosa debe bastar para entenderla sin
   apoyos externos.

2. **LINEAGE.yml.** El contrato de derivación. Declara `skill_id`, `version`,
   `lifecycle_state`, `execution_scope`, `content_origin`,
   `derivation_mode`, `authority_refs`, `external_fragments_reused` y
   `publication_authority`. Si la skill proviene de un referenciador
   permisivo, se declara aquí — no en el cuerpo. Sin LINEAGE, la skill no
   tiene procedencia verificable.

3. **Fixtures.** Dos casos de prueba en YAML: uno positivo (flujo correcto) y
   uno negativo (violación que el checker rechaza). Los fixtures no son
   decorado: prueban la intención de la skill. El positivo muestra la receta
   aplicada; el negativo muestra la infracción que la frontera fail-closed
   bloquea.

4. **check-skill.mjs.** Un checker local, autocontenido, en Node ESM. Lee los
   recursos obligatorios, escanea tokens de gobernabilidad y tokens propios
   de la skill, verifica que el fixture negativo tenga `violation:` y rechaza
   APIs y rutas absolutas prohibidas. Es el gate automático de la skill —
   pasa solo si la estructura, los tokens y las fronteras están en orden.

5. **runtime-boundary.yml.** El recibo de frontera de ejecución. Declara si
   la skill puede abrir red, si requiere confirmación del operador y si
   puede auto-crear o auto-publicar skills. Por defecto: red prohibida,
   confirmación requerida, auto-creación y auto-publicación prohibidas. Es el
   fail-closed declarado, no asumido.

## Estructura de una skill

```
skills/
  <skill-id>/
    SKILL.md                              # referencia principal (obligatorio)
    LINEAGE.yml                           # contrato de derivación (obligatorio)
    fixtures/
      positive/<escenario>.yml            # flujo correcto (obligatorio)
      negative/<violacion>.yml            # infracción rechazada (obligatorio)
    scripts/check-skill.mjs              # checker local ESM (obligatorio)
    receipts/runtime-boundary.yml         # frontera de ejecución (obligatorio)
```

Espacio de nombres plano: todas las skills viven bajo `skills/` con un
identificador en kebab-case. No se anidan skills dentro de skills. No se
mezclan referenciadores externos en el árbol de MetodologIA — los referenciadores
permisivos se citan en `authority_refs` del LINEAGE, no se copian al cuerpo.

## Frontmatter

El frontmatter de SKILL.md es YAML con los campos obligatorios: `name`,
`description`, `version`, `license` y `metadata` (con `owner`,
`lifecycle_state`, `execution_scope`, `model_agnostic`). Los valores van sin
comillas. El `name` usa solo letras, números y guiones — sin paréntesis ni
espacios. La `description` empieza con "This skill should be used when" y
describe solo cuándo usar la skill, no lo que hace — un agente que lee la
descripción debe poder decidir si cargar la skill sin leer el cuerpo. Si la
descripción resume el flujo, el agente puede seguir el resumen en lugar del
cuerpo y saltarse la receta.

`execution_scope: local-evaluation` declara que la skill se evalúa en local,
sin red ni side effects. `model_agnostic: true` declara que la skill no
depende de un modelo específico — la prosa y los contratos bastan para
cualquier runtime compatible. `license: LicenseRef-MetodologIA-Internal`
declara la licencia interna de MetodologIA. Estos campos no son decorativos:
el checker los escanea como tokens de gobernabilidad.

## Fixtures positivo y negativo

Los fixtures son YAML, no markdown. Se usan `.yml` porque los escalares
plegados (`>` y `>-`) que la receta necesita se rompen al pasarlos por
prettier dentro de markdown. El fixture positivo declara `case`, `context`,
`request` (con `>-` o `>` según convenga) y `expect` (lista de resultados
verificables). El fixture negativo declara los mismos campos más `violation`
(escalar plegado `>`) y `expect_reject` (lista de rechazos esperados). El
checker local verifica que el negativo tenga `violation:` — sin eso, la
frontera fail-closed no se prueba.

El positivo muestra la receta aplicada correctamente: el autor recorre las
fases, produce los recursos, respeta la frontera. El negativo muestra la
infracción típica — publicar sin validar, auto-ejecutar, saltar fixtures —
que el checker y la frontera bloquean. Ambos son parte de la skill, no
anexos: si faltan, la skill no está completa.

## Checkers locales

El checker local es `scripts/check-skill.mjs`, autocontenido en Node ESM.
No importa librerías externas — solo `node:fs` y `node:path`. Lee los seis
recursos obligatorios desde la raíz del repo, los concatena, escanea tokens
de gobernabilidad comunes (`This skill should be used when`,
`lifecycle_state: active`, `LicenseRef-MetodologIA-Internal`, `Derivada de`,
`fail-closed`, `coverage_gap`) y tokens propios de la skill. Verifica que el
fixture negativo contenga `violation:`. Rechaza APIs prohibidas (números
pseudoaleatorios, reloj de pared, construcción de fechas, llamadas de red,
temporizadores) y rutas absolutas prohibidas (de usuario o home). Al pasar,
imprime
`PASS <skill-id>: <N> governed resources, clean-room, fail-closed.`; al
fallar, lanza un error con código de contrato y sale con código 1.

El checker no crea la skill, no la publica, no la valida contra el registro
central — eso queda en manos del operador y del gate manual. El checker solo
verifica que la skill esté bien formada y respete la frontera fail-closed.

## Fail-closed y model-agnostic

Este skill es **fail-closed** y de **local-evaluation**:

- NO ejecuta git, commits, pushes, ni merges. Toda operación git queda
  detrás de confirmación explícita del operador.
- NO publica skills al registro central ni a ningún registry externo. La
  publicación es un gate manual por diseño.
- NO auto-crea skills: la receta se describe, no se ejecuta. El autor la
  aplica a mano.
- NO auto-valida ni auto-promueve skills. El checker local verifica forma;
  la promoción de estado (`active` → `ready` → `published`) es manual.
- NO abre conexiones de red. No descarga referenciadores. No instala
  dependencias. No despliega.
- NO invoca tooling de vendor (hooks, telemetría, analytics, sesiones,
  mockup generators). Esos artefactos del referenciador se descartaron en la
  adaptación.
- Si una fase de autoría no puede completarse por falta de contexto o de
  acceso al contrato, se marca `coverage_gap` y se detiene — no se infiere
  ni se sustituye con una conjetura pulida.

Es **model-agnostic**: la receta no depende de un modelo específico. La
prosa, el frontmatter, los fixtures y el checker son contratos que cualquier
runtime compatible puede cargar. No se asume un proveedor, una versión de CLI
ni una plataforma concreta.

## Errores comunes

| Error                                        | Realidad                                        | Corrección                                                    |
| -------------------------------------------- | ----------------------------------------------- | ------------------------------------------------------------- |
| Descripción resume el flujo de la skill      | El agente sigue el resumen y se salta el cuerpo | La descripción declara solo cuándo usar, no qué hace          |
| Falta LINEAGE.yml                            | La skill no tiene procedencia verificable       | Se declara derivación, authority_refs y publication_authority |
| Fixtures en markdown (.md)                   | Prettier rompe los escalares plegados           | Se usan .yml para positive y negative                         |
| Fixture negativo sin `violation:`            | La frontera fail-closed no se prueba            | Se escribe `violation: >` con la infracción típica            |
| Checker importa librerías externas           | Deja de ser autocontenido y reproducible        | Solo `node:fs` y `node:path`                                  |
| Checker usa reloj de pared o llamadas de red | Introduce no-determinismo o red                 | Se rechazan APIs prohibidas                                   |
| Rutas absolutas del autor en el cuerpo       | Filtran locators privados                       | Se usan rutas relativas al repo                               |
| Auto-publicar sin gate manual                | Rompe fail-closed y publication_authority=false | La publicación queda tras confirmación del operador           |
| Saltar fixtures "porque es simple"           | Una skill sin pruebas es fe ciega               | Se escriben positive y negative siempre                       |
| Mezclar referenciador en el cuerpo           | Contamina la derivación clean-room              | El referenciador se cita en LINEAGE, no en SKILL.md           |

## Validación

- `pnpm verify:skills` valida la estructura y los contratos del skill.
- El checker local `skills/dev-writing-skills/scripts/check-skill.mjs`
  verifica presencia de tokens de gobernabilidad, tokens propios de la
  skill, ausencia de APIs y rutas prohibidas, y completitud del fixture
  negativo.
- Si no hay contexto de autoría (no hay skill-id declarado, no hay receta
  aplicable), se emite `coverage_gap` en lugar de fabricar una skill
  genérica.
