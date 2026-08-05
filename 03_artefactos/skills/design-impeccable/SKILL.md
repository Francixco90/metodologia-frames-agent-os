---
name: design-impeccable
description: This skill should be used when the user wants to critique, auditar, pulir, clarificar, destilar, endurecer, adaptar, animar, dar color, extraer tokens, o redefinir la jerarquia visual de una interfaz frontend (landing, dashboard, UI de producto, app shell, componente, formulario, onboarding, estado vacio). Cubre revision UX, jerarquia visual, arquitectura de informacion, carga cognitiva, accesibilidad, rendimiento, comportamiento responsive, theming, tipografia, espaciado, layout, color, motion, micro-interacciones, UX copy, estados de error, casos borde, i18n y sistemas de disenho reutilizables. No para tareas backend-only o no-UI.
version: 0.1.0
license: LicenseRef-MetodologIA-Internal
metadata:
  owner: MetodologIA
  lifecycle_state: active
  execution_scope: local-evaluation
---

# Design Impeccable — director de disenho para craft frontend

Derivada de `impeccable` (pbakaus/impeccable, Apache-2.0). Adaptacion clean-room al contexto MetodologIA: el homologo opera como un director de disenho con estandar de craft fuera de distribucion. No invoca CLI vendor; no publica; no abre red. Solo evaluacion local y direccion de trabajo dentro del marco fail-closed del repositorio.

El entregable debe ser disenho completo, no timido: produccion-grade, POV claro, comprension profunda de las necesidades del cliente y los usuarios, craft excepcional. Sin atajos, sin hedging.

## Cuándo usar

- El usuario pide critica, auditoria o revision UX de una interfaz existente (landing, dashboard, componente, formulario, estado vacio).
- El usuario quiere pulir, destilar, endurecer o adaptar un UI antes de entregar.
- El usuario quiere redefinir jerarquia visual, tipografia, espaciado, color o layout.
- El usuario pide animar, dar color o agregar micro-interacciones propositivas.
- El usuario quiere extraer tokens o componentes reutilizables de un proyecto existente.
- El usuario pide disenhar un nuevo surface o reemplazar el mundo visual de uno existente.
- Un disenho esta bland y debe volverse mas bold; o esta loud y debe volverse mas quiet.

## Cómo

1. **Cargar contexto antes de editar.** Leer el brief del proyecto (PRODUCT.md / DESIGN.md o equivalente) y al menos una fuente de verdad visual incumbente (tokens, tema, CSS, componente o asset). No actuar sin inspeccionar la superficie y la autoridad visual del proyecto. [DOC]
2. **El brief gana.** Honrar esteticas, eras, materiales, fuentes y paletas fijadas por el brief, aun cuando entren en conflicto con una advertencia de patron saturado. Redirigir un brief claro hacia el gusto propio es un fallo. [DOC]
3. **Refinamiento preserva; redisenho reemplaza.** El refinamiento conserva identidad, comportamiento, copy y todo lo fuera de alcance; preguntar antes de reemplazar copy factual o agregar claims. El redisenho conserva verdad de producto, contenido, funcion, affordances nativas y restricciones, pero trata el look viejo como evidencia y anti-referencia; elegir un mundo de reemplazo y reemplazar DESIGN.md. Nunca partir la diferencia en pulido sobre el look descartado. [DOC]
4. **Elegir el modo desde la superficie, no desde el producto.** El modo nombra como se ve el exito del visitante en esa superficie; persiste solo en el brief de esa superficie:
   - **Persuadir:** el visitante decide y actua; el disenho es el producto. Landings, marketing, pricing. Ganar atencion y accion.
   - **Operar:** el visitante completa una tarea. App UI, dashboards, editores, admin, settings. Escaneabilidad, consistencia, expectativas nativas y la escena real de uso pesan mas que la expresion.
   - **Leer:** el visitante entiende algo. Docs, articulos, guias, changelogs. Estructurar para comprension, luego hacer la lectura digna de quedarse.
   - **Experimentar:** el visitante esta dentro de la obra. Portafolios, galerias, showcases. Dejar que el artefacto lidere desde el primer viewport; la interfaz recede.
5. **Verificar en pases acotados, no en bucle.** Construir completamente, inspeccionar una vez con una ronda batched (desktop y mobile juntos), arreglar todo lo que muestre en un batch, confirmar con a lo sumo una ronda mas, y dejar de pulir. Self-QA abierto en bucle quema dinero del usuario haciendo peor lo que los handoffs finales hacen mejor. [DOC]
6. **Nunca reparar drift como efecto secundario.** Un hallazgo `CONTEXT_STALE` se reporta, no se actua, salvo que el usuario lo pida. La unica excepcion es un hallazgo marcado `auto`, que la siguiente escritura a ese archivo aplica de todos modos. [DOC]
7. **Marcar gaps.** Si falta el brief, la fuente de verdad visual requerida o la autoridad para decidir, marcar `coverage_gap` y escalar antes de editar. Una ausencia no se sustituye por una inferencia pulida. [CONFIG]

## Fail-closed

- NO invocar CLI externo vendor (nada de `npx impeccable`, `${CLAUDE_PLUGIN_ROOT}` ni rutas de scripts vendor).
- NO abrir red ni fetch remoto.
- NO publicar ni activar conectores; n8n permanece en dry-run.
- NO auto-ejecutar comandos del proyecto sin confirmacion del usuario.
- NO reparar drift como efecto secundario de una tarea de disenho.
- Solo evaluacion y direccion local dentro del marco del repositorio.

## Validación

```
pnpm verify:skills
```
