---
name: design-taste-frontend
description: This skill should be used when the user wants to disenhar, auditar o redisenhar landings, portafolios o paginas de marketing frontend que no parezcan plantilla generica. Cubre inference del brief (leer el room antes de disenh), design read declarado, anti-default discipline (rechazar defaults de IA tipo purpura-IA, hero centrado sobre mesh oscuro, tres tarjetas iguales, Inter+slate-900), tres diales (varianza, intensidad de motion, densidad visual) mapeados desde el brief, eleccion honesta de design system, auditoria de AI tells, y pre-flight check antes de entregar. No para dashboards, tablas de datos, forms multi-step, editores de codigo o UI nativa movil.
version: 0.1.0
license: LicenseRef-MetodologIA-Internal
metadata:
  owner: MetodologIA
  lifecycle_state: active
  execution_scope: local-evaluation
---

# Design Taste Frontend — anti-slop para landings y portafolios

Derivada de `taste-skill` (leonxlnx/taste-skill, MIT). Adaptacion clean-room al contexto MetodologIA: el homologo opera como un director de frontend que rechaza el slop generativo por defecto y entrega interfaces con POV claro. No invoca CLI vendor; no publica; no abre red. Solo evaluacion local y direccion de trabajo dentro del marco fail-closed del repositorio.

El output debe verse disenado, no templado: lectura del brief declarada, diales razonados desde el brief (no baseline silencioso), design system honesto cuando aplica, y cero AI tells. Sin atajos, sin hedging.

## Cuándo usar

- El usuario pide disenhar una landing, portafolio o pagina de marketing desde cero.
- El usuario quiere auditar o redisenhar una landing existente que se ve generica o templada.
- El usuario pide que una pagina "no parezca hecha por IA" o que tenga mas POV visual.
- El usuario quiere mapear un brief ambiguo a una direccion de disenho clara.
- Una landing existente tiene defaults de IA (purpura-IA, tres tarjetas iguales, hero centrado, Inter por defecto) y debe pulirse.

## Cómo

1. **Leer el room antes de tocar nada.** Inferir lo que el usuario quiere realmente desde las senhales del brief: tipo de pagina (landing SaaS/consumer/agency/event, portafolio dev/designer/studio, redisenh preservar/overhaul, editorial/blog), palabras de vibe ("minimalist", "Linear-style", "Awwwards", "brutalist", "premium consumer", "Apple-y"), referencias (URLs, screenshots, marcas competidoras), audiencia (B2B procurement vs consumidor consciente de disenho vs reclutador), assets de marca existentes, y restricciones quietas (accessibility-first, public-sector, regulado, trust-first, productos para ninhos). Las restricciones quietas OVERRIDE la preferencia estetica. [DOC]
2. **Declarar el design read antes de generar.** Una linea antes de cualquier output: "Reading this as: <tipo de pagina> para <audiencia>, con lenguaje <vibe>, inclinando hacia <design system o familia estetica>." Si el brief es ambiguo, hacer exactamente UNA pregunta aclaratoria (nunca un dump de preguntas), solo cuando la lectura diverja genuinamente. Si se puede inferir con confianza, no preguntar; declarar y proceder. [DOC]
3. **Anti-default discipline.** No default a: gradientes purpura-IA, hero centrado sobre mesh oscuro, tres tarjetas de feature iguales, glassmorphism generico en todo, micro-animaciones de loop infinito en cada lado, Inter + slate-900. Estos son los defaults de IA; alcanzar past ellos deliberadamente desde el design read. [DOC]
4. **Mapear el brief a tres diales.** Varianza de disenho (1 simetria perfecta - 10 caos artsy), intensidad de motion (1 estatico - 10 cinematico/fisico), densidad visual (1 galeria de arte/airy - 10 cockpit/packed). Los valores se infieren desde el brief, no se usan en baseline silencioso. Presets por caso de uso existen como referencia; el design read decide. [DOC]
5. **Elegir design system honestamente.** Si el brief lee como un sistema con paquete oficial (Fluent, Material, Carbon, Polaris, Atlaskit, Primer, GOV.UK, USWDS, Bootstrap, Radix Themes, shadcn/ui), usar el paquete oficial; no recrear su CSS a mano, no importar tokens y sobreescribir 90%. Si el brief es una estetica sin sistema oficial (glassmorphism, bento, brutalismo, editorial, dark tech, aurora, kinetic type, Apple Liquid Glass), construir con CSS nativo + Tailwind y etiquetar honestamente lo que es inspiracion vs material oficial. Un sistema por proyecto; no mezclar. [DOC]
6. **Auditar AI tells antes de entregar.** Cero em-dashes (`—`) en cualquier lado visible. Cero version labels en hero, cero section-numbering eyebrows (`00 / INDEX`), cero dots decorativos, cero scroll cues, cero strips de locale/tiempo/clima, cero div-based fake screenshots, cero nombres genericos (John Doe, Acme), cero copy cliché ("Elevate", "Seamless", "Unleash"). Eyebrows rationados (max 1 por 3 secciones). Una paleta de acento por pagina, lockeada en toda la pagina. Un corner-radius system consistente. [DOC]
7. **Pre-flight check antes de declarar done.** Correr la matriz: brief inference declarada, diales explicitos, design system elegido, cero em-dashes, theme lock (una tema por pagina), color consistency lock, shape consistency lock, button contrast (WCAG AA), CTA no wrappea, form contrast, hero cabe en viewport (headline <= 2 lineas, subtext <= 20 palabras, CTA visible sin scroll), eyebrow count mecanico <= ceil(secciones/3), no duplicate CTA intent, logo wall = logos solo, real images (gen-tool primero, picsum-seed segundo, placeholder slots explicitos tercero), motion motivado, marquee max-uno, nav en una linea desktop. Si una checkbox no se puede marcar con honestidad, la pagina no esta done. [DOC]
8. **Marcar gaps.** Si falta el brief, la fuente de verdad visual requerida o la autoridad para decidir, marcar `coverage_gap` y escalar antes de editar. Una ausencia no se sustituye por una inferencia pulida. [CONFIG]

## Fail-closed

- NO invocar CLI externo vendor (nada de `npx taste-skill`, `npx extract-design-system` ni rutas de scripts vendor).
- NO abrir red ni fetch remoto. Las URLs de referencia en el design read son lectura, no fetch.
- NO publicar ni activar conectores; n8n permanece en dry-run.
- NO auto-ejecutar comandos del proyecto sin confirmacion del usuario.
- NO generar imagenes via herramientas externas automaticamente; dejar placeholder slots explicitos si no hay gen-tool local.
- Solo evaluacion y direccion local dentro del marco del repositorio.

## Validación

```
pnpm verify:skills
```
