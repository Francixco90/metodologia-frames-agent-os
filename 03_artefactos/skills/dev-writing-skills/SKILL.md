---
name: dev-writing-skills
description: This skill should be used when se crean nuevas skills, se editan skills existentes, o se verifica que las skills funcionan antes de su despliegue — cubre autoría, estructura, frontmatter, fixtures y validación de skills
version: 0.2.0
license: LicenseRef-MetodologIA-Internal
metadata:
  owner: MetodologIA
  lifecycle_state: active
  execution_scope: local-evaluation
  model_agnostic: true
---

Derivada de writing-skills (obra/superpowers, MIT).

# Dev Writing Skills — autoría y verificación de skills MetodologIA

El rol es autor que crea, edita o verifica skills MetodologIA antes de su
despliegue. Autoría no es redactar prosa bonita: es construir una referencia
reproducible — estructura, frontmatter, fixtures, checker, frontera de
ejecución — que un operador inspeccione y un agente cargue sin ambigüedad.
Este skill recorre la receta H-03 y entrega la guía en prosa, revisable por
el operador. No crea, no valida automáticamente, no publica.

Premisa: sin estructura es ruido, sin fixtures es opinión, sin checker es fe
ciega, sin frontera es riesgo. "Ya quedó" se verifica con el checker; "es
claro para mí" se prueba con fixtures positivo y negativo; "se parece al
referenciador" se declara en LINEAGE.yml y se reescribe en limpio. Si no se
sabe un campo, se pregunta o se lee el contrato — no se adivina.

## Cuándo usar

Usar cuando el operador pide crear, editar o verificar una skill MetodologIA
de forma metódica antes de publicar: "crea/edita esta skill", "arma los
fixtures", "escribe el checker local", "verifica que funciona antes de
desplegar". No usar para aprender un codebase nuevo (`dev-learn`) ni para
afinar un plan cerrado (`dev-plan-tune`).

## La receta H-03

Cinco recursos obligatorios, ninguno opcional, ninguno generado por defecto.
El autor los produce a mano y el checker local los verifica.

1. **SKILL.md.** Referencia principal: frontmatter, cuándo usar, cuerpo en
   prosa, errores comunes. Es lo que un agente carga — su prosa debe bastar
   para entenderla sin apoyos externos.
2. **LINEAGE.yml.** Contrato de derivación: `skill_id`, `version`,
   `lifecycle_state`, `execution_scope`, `content_origin`, `derivation_mode`,
   `authority_refs`, `external_fragments_reused`, `publication_authority`.
   Si proviene de un referenciador permisivo, se declara aquí, no en el
   cuerpo. Sin LINEAGE no hay procedencia verificable.
3. **Fixtures.** Dos casos YAML: positivo (flujo correcto) y negativo
   (violación que el checker rechaza). Prueban la intención, no son decorado.
4. **check-skill.mjs.** Checker local autocontenido en Node ESM. Lee los
   recursos obligatorios, escanea tokens de gobernabilidad y tokens propios,
   verifica que el fixture negativo tenga `violation:`, rechaza APIs y rutas
   absolutas prohibidas. Pasa solo si estructura, tokens y fronteras están en
   orden.
5. **runtime-boundary.yml.** Recibo de frontera de ejecución: declara red,
   confirmación del operador, auto-creación/auto-publicación. Por defecto:
   red prohibida, confirmación requerida, auto-creación y auto-publicación
   prohibidas. Fail-closed declarado, no asumido.

## Estructura

```
skills/
  <skill-id>/
    SKILL.md                              # referencia principal
    LINEAGE.yml                           # contrato de derivación
    fixtures/
      positive/<escenario>.yml            # flujo correcto
      negative/<violacion>.yml            # infracción rechazada
    scripts/check-skill.mjs              # checker local ESM
    receipts/runtime-boundary.yml         # frontera de ejecución
```

Espacio de nombres plano bajo `skills/`, kebab-case. No se anidan skills
dentro de skills. Los referenciadores permisivos se citan en `authority_refs`
del LINEAGE, no se copian al cuerpo (clean-room).

## Frontmatter

YAML con `name`, `description`, `version`, `license`, `metadata` (`owner`,
`lifecycle_state`, `execution_scope`, `model_agnostic`). Valores sin
comillas. `name`: solo letras, números, guiones. `description` empieza con
"This skill should be used when" y describe solo cuándo usar, no qué hace —
un agente que lee la descripción debe poder decidir si cargar la skill sin
leer el cuerpo; si resume el flujo, el agente sigue el resumen y se salta la
receta. `execution_scope: local-evaluation` (local, sin red ni side
effects), `model_agnostic: true` (independiente del proveedor),
`license: LicenseRef-MetodologIA-Internal`. El checker los escanea como
tokens de gobernabilidad — no son decorativos.

## Fixtures

YAML, no markdown: `.yml` porque los escalares plegados (`>`, `>-`) se rompen
al pasarlos por prettier dentro de markdown. Positivo: `case`, `context`,
`request` (`>-` o `>`), `expect` (lista verificable). Negativo: mismos campos
+ `violation` (plegado `>`) + `expect_reject` (lista de rechazos). El checker
verifica que el negativo tenga `violation:` — sin eso, la frontera fail-closed
no se prueba. El positivo muestra la receta aplicada; el negativo, la
infracción típica (publicar sin validar, auto-ejecutar, saltar fixtures) que
el checker y la frontera bloquean. Si faltan, la skill no está completa.

## Checker local

`scripts/check-skill.mjs`, autocontenido Node ESM, solo `node:fs` y
`node:path`. Lee los seis recursos obligatorios desde la raíz del repo, los
concatena, escanea tokens de gobernabilidad comunes (`This skill should be
used when`, `lifecycle_state: active`, `LicenseRef-MetodologIA-Internal`,
`Derivada de`, `fail-closed`, `coverage_gap`) y tokens propios. Verifica
`violation:` en el negativo. Rechaza APIs prohibidas (pseudoaleatorios, reloj
de pared, construcción de fechas, red, temporizadores) y rutas absolutas
(usuario, home). Al pasar: `PASS <skill-id>: <N> governed resources,
clean-room, fail-closed.`; al fallar, lanza error con código de contrato y
sale 1. No crea, no publica, no valida contra el registro central — eso es
del operador y del gate manual.

## Fail-closed y model-agnostic

**Fail-closed, local-evaluation**: no ejecuta git/commits/pushes/merges
(operación git tras confirmación explícita); no publica al registro central ni
externo (gate manual); no auto-crea skills (la receta se describe, el autor la
aplica); no auto-valida ni auto-promueve (el checker verifica forma;
`active → ready → published` es manual); no abre red, no descarga
referenciadores, no instala dependencias, no despliega; no invoca tooling de
vendor (hooks, telemetría, analytics, mockup generators — descartados en la
adaptación). Si una fase no puede completarse por falta de contexto o acceso al
contrato, se marca `coverage_gap` y se detiene — no se infiere ni se sustituye
con conjetura.

**Model-agnostic**: la receta no depende de un modelo. Prosa, frontmatter,
fixtures y checker son contratos que cualquier runtime compatible carga. No se
asume proveedor, versión de CLI ni plataforma.

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

- `pnpm verify:skills` valida estructura y contratos.
- `skills/dev-writing-skills/scripts/check-skill.mjs` verifica tokens de
  gobernabilidad, tokens propios, ausencia de APIs/rutas prohibidas y
  completitud del fixture negativo.
- Sin contexto de autoría (no hay skill-id, no hay receta aplicable), se
  emite `coverage_gap` en lugar de fabricar una skill genérica.
