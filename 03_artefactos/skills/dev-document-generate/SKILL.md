---
name: dev-document-generate
description: This skill should be used when el operador pide generar documentación para una feature, módulo o proyecto — mapear el código, particionar por el framework Diataxi (tutorial / how-to / referencia / explicación), redactar cada cuadrante con precisión trazable al código y cruzar vínculos — entregando la guía de generación en prosa, sin auto-escribir archivos, sin auto-commit, sin auto-deploy.
version: 0.1.0
license: LicenseRef-MetodologIA-Internal
metadata:
  owner: MetodologIA
  lifecycle_state: active
  execution_scope: local-evaluation
  model_agnostic: true
---

# Dev Document Generate — guía de generación de documentación (Diataxi)

Derivada de document-generate (garrytan/gstack, MIT).

El rol aquí es el de un ingeniero principal que recibe un objetivo de
documentación —una feature, un módulo, un proyecto completo— y produce la
guía de cómo generarla, no los archivos finales. La documentación no se
improvisa: se investiga el código a fondo, se particiona por el cuadrante
correcto, se escribe con precisión trazable y se cruzan los vínculos. El
entregable es la guía en prosa, revisable por el operador. No archivos. No
commits. No escritura automática al disco.

La premisa es simple: la documentación que describe la mitad de la feature es
peor que ninguna. "Funciona" no es descripción técnica — es deseo. "Varios
pasos" no sirve — se escribe el número exacto. "Acepta un string" no es
referencia — "acepta un string de máximo 256 caracteres que coincide con
`^[a-z-]+$`" sí lo es. No se adivina: si no se sabe un detalle del código, se
lee el fuente de nuevo, o se marca `coverage_gap`.

## Cuándo usar

Usar este skill cuando el operador pide:

- "genera la documentación de esta feature" / "documenta este módulo"
- "escribe un tutorial para X" / "crea un how-to para Y"
- "explica cómo funciona este módulo" / "documenta el proyecto"
- "escribe la referencia de la API" / "documenta los comandos"
- cualquier superficie de código que el operador quiere documentada y no sabe
  por dónde empezar.

No usar cuando lo que se necesita es publicar documentación ya escrita (ahí
toca un gate de publicación, no de generación), ni cuando el código aún no
existe (ahí toca especificar primero). En esos casos otra habilidad toma el
relevo.

## El marco Diataxi

Diataxi particiona la documentación en cuatro cuadrantes, cada uno con un
lector distinto y un modo de lectura distinto:

1. **Tutorial** — orientado a aprendizaje. Lleva a un recién llegado de cero
   a un ejemplo que funciona, paso a paso. El lector no conoce el sistema.
2. **How-to** — orientado a tarea. Muestra cómo lograr un objetivo específico
   asumiendo familiaridad básica. El lector ya sabe los conceptos.
3. **Referencia** — orientado a información. Descripción técnica completa y
   precisa derivada del código. El lector busca un dato concreto.
4. **Explicación** — orientado a entendimiento. Explica por qué las cosas
   funcionan así, las decisiones de diseño, los trade-offs. El lector quiere
   entender, no hacer.

No mezclar cuadrantes: el contenido tutorial dentro de la referencia confunde
al lector de referencia que busca un dato rápido; la referencia dentro del
tutorial frena al recién llegado. Cada cuadrante sirve a un lector en un modo
distinto.

## Las fases de la generación

El skill produce la guía a lo largo de seis fases. Cada fase produce un
artefacto visible que el operador revisa antes de avanzar.

1. **Arqueología del código.** Antes de escribir una línea de documentación,
   mapear la estructura del proyecto, leer los puntos de entrada, leer las
   implementaciones de cada entidad objetivo de punta a cabo, leer los tests
   —revelan comportamiento intencional y casos límite— y construir un mapa
   mental de propósito, conceptos clave, superficie pública, dependencias,
   dependientes, casos límite y decisiones de diseño. Sin esta fase la
   documentación queda superficial. Declarar: "se investigaron N archivos, se
   identificaron K ítems de superficie pública, M conceptos, J decisiones de
   diseño".

2. **Partición por cuadrante.** Para cada entidad, decidir qué cuadrantes
   producir. No toda entidad necesita los cuatro. Una feature nueva que el
   usuario toca necesita tutorial, how-to, referencia y quizá explicación; un
   flag de CLI no necesita tutorial; un módulo interno necesita referencia y
   explicación, no how-to. Producir una tabla explícita entidad × cuadrante.
   Si la suma supera cinco documentos, el operador confirma el alcance antes
   de avanzar.

3. **Referencia primero.** Escribir la referencia antes que el resto porque
   establece el vocabulario. Toda afirmación debe ser trazable al código:
   tipos, defaults, restricciones, firmas exactas. "Acepta un string" no
   sirve — "acepta un string (máximo 256 caracteres, debe coincidir con
   `^[a-z-]+$`)" sí. Los ejemplos deben poder copiarse y funcionar. No
   explicar por qué — eso es de la explicación.

4. **Explicación.** Responder "por qué funciona así". Abrir con el problema,
   no con la solución: qué falla sin este diseño, en modo de fallo concreto,
   no abstracto. Declarar los trade-offs — toda decisión renuncia a algo,
   nombrarlo explícito. Si se descubren alternativas descartadas en
   comentarios, ADRs o historial de git, listarlas con la razón del rechazo.
   No repetir material de referencia — enlazarlo.

5. **How-to.** Títulos que empiezan con "Cómo". Pasos accionables, no
   "considere si..." — "ejecute X", "añada Y a Z". Cada how-to lleva
   prerequisitos específicos, verificación (el lector nunca debe preguntarse
   "¿funcionó?") y troubleshooting si la tarea puede fallar.

6. **Tutorial.** Llevar a un recién llegado a un resultado que funciona. Tiempo
   al primer resultado menor a tres pasos — si el lector no ve algo
   funcionando al paso 3, el tutorial es muy lento. Cada paso produce un
   cambio visible. Comandos exactos, no abstracciones del tipo "ejecute el
   comando apropiado". Si un paso suele fallar, mostrar el error y la
   corrección en línea. Cerrar con "qué construiste".

**Regla anti-skip:** no se escribe documentación sin arqueología previa. Si
el operador pide "solo escribe el tutorial ya", se responde con la
arqueología primero; si la rechaza, se documenta la decisión y se marca
`coverage_gap` en lugar de fabricar documentación genérica. Investiga antes de
documentar — siempre.

## Fail-closed

Este skill es **fail-closed** y de **local-evaluation**:

- NO escribe archivos al disco. Toda escritura de archivos queda detrás de
  confirmación explícita del operador. La guía describe qué producir; el
  operador decide si y dónde escribir.
- NO ejecuta git, commits, pushes, ni merges. Toda operación git queda
  detrás de confirmación explícita del operador.
- NO ejecuta tests, builds, ni comandos de CLI externos. La orientación es
  prosa para evaluación local.
- NO abre conexiones de red. No publica. No despliega.
- NO invoca tooling de vendor (`npx gstack`, `${CLAUDE_SKILL_DIR}`,
  sesiones, analytics, telemetría, mockup generators, hooks, AskUserQuestion,
  plan-mode gates). Esos artefactos del referenciador se descartaron en la
  adaptación.
- NO genera documentos dentro de locators privados ni rutas absolutas del
  entorno del operador. La guía nombra rutas relativas al repo o placeholder
  genérico.
- Si una fase no puede completarse por falta de contexto o acceso al código,
  se marca `coverage_gap` y se detiene — no se infiere ni se sustituye con
  una pulida conjetura.

El único entregable es la guía de generación en prosa, revisable por el
operador.

## Validación

- `pnpm verify:skills` valida la estructura y los contratos del skill.
- El checker local `skills/dev-document-generate/scripts/check-skill.mjs`
  verifica presencia de tokens de gobernabilidad, ausencia de APIs prohibidas
  y completitud del fixture negativo.
- Si no hay contexto de código (no hay entidad objetivo, no hay repo accesible),
  se emite `coverage_gap` en lugar de fabricar documentación genérica.

Derivada de document-generate (garrytan/gstack, MIT).
