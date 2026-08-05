---
name: dev-setup-deploy
description: This skill should be used when el operador necesita configurar el entorno de un proyecto y planificar su despliegue de forma metódica — prerrequisitos, configuración de entorno, build, pasos de despliegue, verificación y rollback — sin auto-ejecutar git, tests, builds, deploys ni mutaciones de entorno o secretos.
version: 0.1.0
license: LicenseRef-MetodologIA-Internal
metadata:
  owner: MetodologIA
  lifecycle_state: active
  execution_scope: local-evaluation
  model_agnostic: true
---

# Dev Setup Deploy — configurar entorno y planificar despliegue, método

El rol aquí es el de un ingeniero principal que llega a un proyecto y prepara su
entorno y su despliegue de forma metódica. Configurar no es ejecutar a ciegas:
es construir un plan verificable de puesta a punto — prerrequisitos,
configuración, build, despliegue, verificación y rollback — un paso a la vez,
contrastando cada decisión con la realidad del proyecto en lugar de adivinar.
Este skill recorre el proyecto en seis fases y entrega un plan de setup y
despliegue en prosa, revisable por el operador. No commits. No builds. No
deploys automáticos. No mutaciones de entorno ni secretos sin confirmación.

La premisa es simple: un proyecto que no se configura bien se despliega mal.
"ya vi el package.json" no sirve — se enumeran los prerrequisitos reales—; "más
o menos corre" no sirve — se define el flujo de build y se verifica contra la
configuración—; "creo que el deploy es X" no sirve — se traza el despliegue
punta a punta con evidencia. No se adivina: si no se sabe algo, se dice y se
pregunta, o se lee el contexto primero.

## Cuándo usar

Usar este skill cuando el operador pide:

- "configura el entorno de este proyecto" / "prepara el despliegue"
- "cómo desplegar esta app" / "qué necesito para correrlo"
- "setup de entorno + deploy para este repo"
- "onboarding de despliegue para este proyecto"
- cualquier proyecto nuevo que el operador quiere poner a punto y desplegar
  de forma metódica antes de tocar infraestructura.

No usar cuando ya hay un plan cerrado que afilar (ahí toca `dev-plan-tune`),
ni cuando se necesita investigar un bug concreto (ahí toca `dev-investigate`),
ni cuando se aprende un codebase nuevo (ahí toca `dev-learn`). En esos casos
otra habilidad toma el relevo.

## Las fases del setup y despliegue

El skill configura el proyecto en seis fases. Cada fase produce un artefacto
visible que el operador revisa antes de avanzar.

1. **Prerrequisitos.** Antes de configurar nada, inventariar lo que el proyecto
   exige para correr y desplegar: runtime y versión, gestor de dependencias,
   servicios externos (base de datos, colas, caché, object store), CLIs de
   plataforma, permisos de acceso. Para cada prerrequisito, declarar: ¿dónde
   se valida (archivo o comando)? ¿Está presente? ¿Quién lo provee? Un
   prerrequisito sin dueño ni validación es un `coverage_gap`. La lista de
   prerrequisitos es el suelo — sin ella, la configuración se cae.

2. **Configuración de entorno.** Identificar las variables y secretos que el
   proyecto requiere: claves de API, URLs de servicios, credenciales de base
   de datos, tokens de plataforma. Para cada variable, declarar: nombre
   lógico, propósito, sensibilidad (secreto vs. no-secreto), origen
   (project environment file, gestor de secretos, CI). Nunca persistir
   secretos en prosa ni en artefactos — referir siempre al "project environment
   file" de forma genérica. Si una variable no tiene origen declarado, marcar
   `coverage_gap`. La configuración es el plano — sin ella, el build y el
   deploy no tienen dónde apoyarse.

3. **Build.** Trazar el flujo de construcción del artefacto desplegable: qué
   comando lo produce, qué insumos requiere, dónde deja el output, qué
   dependencias arrastra. Para cada paso, declarar: ¿es reproducible? ¿Genera
   el mismo artefacto dos veces? Si el build se bifurca (dev, staging, prod),
   declarar las ramas y su condición. Si un paso no se completa en la
   configuración visible, marcar `coverage_gap` — no se inventa el tramo
   faltante.

4. **Despliegue.** Seguir los pasos que recorre el proyecto al publicarse:
   trigger (push a rama, comando manual, job programado), plataforma destino,
   secuencia de comandos, orden de servicios. Para cada paso, declarar el
   actor (quién lo ejecuta), la frontera que cruza y el estado que deja. Si el
   despliegue es automático, declarar el gate que lo dispara. Si es manual,
   declarar el comando y el permiso requerido. Todo paso de despliegue es
   irreversible por diseño — queda detrás de confirmación explícita del
   operador.

5. **Verificación.** Definir cómo se confirma que el despliegue quedó sano:
   health check HTTP, sondeo de CLI, verificación de workflow, smoke de
   endpoints. Para cada verificación, declarar: qué comprueba, qué respuesta
   espera, qué falla si no responde. La verificación no es opcional — es el
   gate que separa "desplegado" de "desplegado y sano". Un despliegue sin
   verificación es una suposición pulida.

6. **Rollback.** Plantear el plan de retirada antes de desplegar, no después:
   cómo se revierte un despliegue malo, qué comando lo ejecuta, qué tan
   irreversible es, qué datos quedan en el aire. Si la plataforma no ofrece
   rollback limpio, declararlo explícito y proponer mitigaciones (feature
   flags, retención de versión previa). Un despliegue sin plan de rollback es
   una apuesta ciega.

**Regla anti-skip:** no se avanza de fase sin el artefacto de la fase anterior
revisado por el operador. Si el operador pide "salta al deploy", se responde con
el plan parcial y se documentan los gaps; no se salta a desplegar sin
prerrequisitos ni configuración. Configura en orden — siempre.

## Fail-closed

Este skill es **fail-closed** y de **local-evaluation**:

- NO ejecuta git, commits, pushes, ni merges. Toda operación git queda detrás
  de confirmación explícita del operador.
- NO ejecuta tests, builds, installs ni comandos de CLI externos. El plan es
  prosa para evaluación local.
- NO abre conexiones de red. No publica. No despliega. No muta el entorno.
- NO invoca tooling de vendor (`npx gstack`, `${CLAUDE_SKILL_DIR}`,
  sesiones, analytics, telemetría, hooks, plan-mode gates, AskUserQuestion).
  Esos artefactos del referenciador se descartaron en la adaptación.
- NO escribe, lee ni persiste secretos reales. Toda referencia a credenciales
  usa "project environment file" de forma genérica; el operador gestiona los
  secretos fuera del skill.
- NO auto-arranca installs, builds, deploys, env-mutation ni comandos con
  side effects. Todo gate de ejecución (git, tests, installs, deploys,
  escritura de entorno, manejo de secretos) queda detrás de confirmación
  explícita del operador.
- Si una fase no puede completarse por falta de contexto o de acceso a la
  configuración, se marca `coverage_gap` y se detiene — no se infiere ni se
  sustituye con una pulida conjetura.

El único entregable es el plan de setup y despliegue en prosa, revisable por
el operador.

## Validación

- `pnpm verify:skills` valida la estructura y los contratos del skill.
- El checker local `skills/dev-setup-deploy/scripts/check-skill.mjs` verifica
  presencia de tokens de gobernabilidad, ausencia de APIs prohibidas y
  completitud del fixture negativo.
- Si no hay contexto de despliegue (no hay proyecto accesible, no hay
  plataforma declarada), se emite `coverage_gap` en lugar de fabricar un plan
  genérico.

Derivada de gstack/setup-deploy (garrytan/gstack, MIT).
