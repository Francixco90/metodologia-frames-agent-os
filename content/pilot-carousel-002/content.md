---
schema_version: canonical-content-document-v1
content_id: pilot-carousel-002
version: 0.1.0
authored_status: DRAFT
brand_id: metodologia
locale: es-LatAm
editorial_pattern: educational
primary_workflow: carousel
surface: instagram-feed
authored_by_actor_instance_id: RT-04-H01-PILOT-002
source_freeze_manifest:
  schema_version: hash-bound-ref-v1
  ref: content/pilot-carousel-002/source-freeze-manifest.yml
  sha256: 71ffb0eea5a3e06144afc2a45328941623be2a5708a2a4e97d21def570c0fbb3
profiles:
  brand:
    schema_version: hash-bound-ref-v1
    ref: registries/brand/brand-profile-v2.yml
    sha256: d13855224fe0ba040bb9f6d1a071aa19dedc43813a2e7507c38763c41a2b487c
  voice:
    schema_version: hash-bound-ref-v1
    ref: registries/brand/voice-profile-v2.yml
    sha256: c2129333e2fde087c0af5ecf3ebd1643f6329888003bb06241083b1893c2b88a
  channel:
    schema_version: hash-bound-ref-v1
    ref: registries/channels/instagram-profile-v1.yml
    sha256: 316f6e60fde9aecc67fcddad57f44f5308fa9a239aca656ea2923ef867c93482
  adaptation:
    schema_version: hash-bound-ref-v1
    ref: registries/brand/brand-adaptation-decision-v1.yml
    sha256: 2609707f113383063d01eaaa52f6381adec22ec990d6dd75fb53f536ce236673
planned_capabilities:
  - capability_id: d3
    label: D3
    state: planned_capability
    intended_use: Convertir relaciones y matrices verificables en geometría visual.
    verification_gate: H-03
    requirement_ref:
      schema_version: hash-bound-ref-v1
      ref: docs/program/instagram-content-creation-network-v3.md
      sha256: f965dc28ca487639bad6be88fdc37e9c47a3ba08956cf791ebfcd0dfcc2b20ed
  - capability_id: three
    label: Three.js
    state: planned_capability
    intended_use: Explicar las capas del sistema con una vista tridimensional funcional.
    verification_gate: H-03
    requirement_ref:
      schema_version: hash-bound-ref-v1
      ref: docs/program/instagram-content-creation-network-v3.md
      sha256: f965dc28ca487639bad6be88fdc37e9c47a3ba08956cf791ebfcd0dfcc2b20ed
  - capability_id: lottie
    label: Lottie
    state: planned_capability
    intended_use: Expresar progreso mediante micro-motion local y poster equivalente.
    verification_gate: H-03
    requirement_ref:
      schema_version: hash-bound-ref-v1
      ref: docs/program/instagram-content-creation-network-v3.md
      sha256: f965dc28ca487639bad6be88fdc37e9c47a3ba08956cf791ebfcd0dfcc2b20ed
  - capability_id: gsap
    label: GSAP
    state: planned_capability
    intended_use: Coordinar una transición compleja controlada por el frame del compositor.
    verification_gate: H-03
    requirement_ref:
      schema_version: hash-bound-ref-v1
      ref: docs/program/instagram-content-creation-network-v3.md
      sha256: f965dc28ca487639bad6be88fdc37e9c47a3ba08956cf791ebfcd0dfcc2b20ed
  - capability_id: remotion-v3-creative-compositor
    label: Remotion
    state: planned_capability
    intended_use: Producir stills y preview motion desde un reloj explícito.
    verification_gate: H-03
    requirement_ref:
      schema_version: hash-bound-ref-v1
      ref: docs/program/instagram-content-creation-network-v3.md
      sha256: f965dc28ca487639bad6be88fdc37e9c47a3ba08956cf791ebfcd0dfcc2b20ed
rights_policy: source_freeze_and_first_party_assets_only
publication_policy: forbidden
distribution_state: NOT_DESIGNED
publication_authority: false
---

# Método antes que herramientas

## Audiencia

Profesionales y equipos que quieren adoptar IA con un criterio claro, sin acumular herramientas ni
promesas sin evidencia.

## Problema

Empezar por una plataforma dispersa la atención: todavía no define qué debe mejorar, qué ruta puede
repetirse ni qué señal permitirá decidir si una prueba merece continuar.

## Promesa

Mostrar cómo un sistema de creación separa decisiones, ejecución y verificación para elegir
herramientas por la función que cumplen, no por novedad.

## Tesis

Diseña primero el método y el sistema de trabajo; después elige la herramienta que ejecute una
función verificable dentro de esa ruta.

## Soportes

### SUP-PILOT2-METHOD-001

El resultado y el método dan dirección antes de comparar herramientas.

- Claims: `CLM-PILOT2-METHOD-001`
- Pillar: `P1`

### SUP-PILOT2-SYSTEM-001

Los agentes administran decisiones y excepciones; los workflows ejecutan rutas gobernadas y
repetibles.

- Claims: `CLM-PILOT2-AGENT-WORKFLOW-001`, `CLM-PILOT2-WORKFLOWS-001`, `CLM-PILOT2-PIPELINE-001`, `CLM-PILOT2-BOUNDARY-001`
- Pillar: `P2`

### SUP-PILOT2-EVIDENCE-001

Cada capacidad se evalúa por su utilidad y por señales observables, sin inventar resultados.

- Claims: `CLM-PILOT2-EVIDENCE-001`
- Pillar: `P3`

## Evidencia

### CLM-PILOT2-METHOD-001

El método orienta la elección de herramientas; las herramientas amplifican un sistema de trabajo y
no lo sustituyen.

- Kind: `first_party_principle`
- Support: `direct`
- Authority: `SRC-MAO-PUBLIC-SEMANTICS-001`
- Evidence role: `supports`
- Locator: `lines:6-8`
- Limit: Es un principio first-party para grounding editorial interno, no un resultado de desempeño.

### CLM-PILOT2-AGENT-WORKFLOW-001

En este OS, los agentes administran contexto, decisiones, excepciones y evaluación; los workflows
ejecutan rutas deterministas, repetibles y observables.

- Kind: `system_decision`
- Support: `direct`
- Authority: `DEC-CREATIVE-OS-V3-H00`
- Evidence role: `defines_system_behavior`
- Locator: `lines:9-17`
- Limit: Describe el diseño aprobado de este OS; no afirma que sea la única forma válida de operar.

### CLM-PILOT2-WORKFLOWS-001

La matriz del OS registra ocho workflows creativos y mantiene solo carousel como candidato activo.

- Kind: `system_decision`
- Support: `direct`
- Authority: `REG-IG-WORKFLOW-MATRIX-V2`
- Evidence role: `defines_system_behavior`
- Locator: `lines:35-114`
- Limit: Los otros siete workflows permanecen planificados hasta sus gates humanos secuenciales.

### CLM-PILOT2-PIPELINE-001

La ruta creativa parte de una solicitud acotada, pasa por contenido canónico y verificación, y
termina en un paquete creativo antes de cualquier distribución.

- Kind: `system_decision`
- Support: `direct`
- Authority: `DEC-CREATIVE-OS-V3-H00`
- Evidence role: `defines_system_behavior`
- Locator: `lines:19-30`
- Limit: H-01 solo valida el contrato y no ejecuta atomización, composición ni render.

### CLM-PILOT2-BOUNDARY-001

Distribución, publicación y automatización permanecen fuera de la macrofase de creación.

- Kind: `system_decision`
- Support: `direct`
- Authority: `DEC-CREATIVE-OS-V3-H00`
- Evidence role: `defines_system_behavior`
- Locator: `lines:142-149`
- Limit: La frontera no implica que exista una integración futura diseñada o autorizada.

### CLM-PILOT2-EVIDENCE-001

Una afirmación fuerte debe declarar dato real, indicador sugerido, señal a medir o dato requerido.

- Kind: `indicator_plan`
- Support: `qualified`
- Authority: `SRC-MAO-BRAND-VOICE-001`
- Evidence role: `qualifies`
- Locator: `lines:60-66`
- Limit: El perfil de voz sigue candidato; no existen línea base, periodo, responsable ni umbral medidos para este piloto.

## Recorrido editorial

### 1. Tesis

Método antes que herramientas: la velocidad no reemplaza la dirección.

- Purpose: `thesis`
- Claims: `CLM-PILOT2-METHOD-001`
- Capabilities: `none`
- State: `not_applicable`

### 2. Decisión

Una ruta conocida requiere un workflow; una excepción no enumerable puede justificar un agente.

- Purpose: `decision`
- Claims: `CLM-PILOT2-AGENT-WORKFLOW-001`
- Capabilities: `none`
- State: `not_applicable`

### 3. Diseño del sistema

Los agentes administran decisiones y los workflows ejecutan rutas gobernadas.

- Purpose: `system`
- Claims: `CLM-PILOT2-AGENT-WORKFLOW-001`
- Capabilities: `none`
- State: `not_applicable`

### 4. Matriz creativa

El OS separa ocho productos creativos y activa cada workflow mediante un gate independiente.

- Purpose: `workflow_matrix`
- Claims: `CLM-PILOT2-WORKFLOWS-001`
- Capabilities: `none`
- State: `not_applicable`

### 5. Proceso

Markdown, átomos, composición, render, QA y Guardian forman una secuencia verificable.

- Purpose: `process`
- Claims: `CLM-PILOT2-PIPELINE-001`
- Capabilities: `none`
- State: `not_applicable`

### 6. Router visual planificado

D3, Three.js, Lottie, GSAP y Remotion responden a intenciones distintas; en H-01 son requisitos
planificados y no capacidades disponibles.

- Purpose: `visual_router`
- Claims: `none`
- Capabilities: `d3`, `three`, `lottie`, `gsap`, `remotion-v3-creative-compositor`
- State: `planned_capability`

### 7. Frontera

El paquete creativo cierra la creación; distribución y publicación siguen fuera de alcance.

- Purpose: `boundary`
- Claims: `CLM-PILOT2-BOUNDARY-001`
- Capabilities: `none`
- State: `not_applicable`

### 8. Acción

Diseña primero el sistema que producirá el contenido.

- Purpose: `cta`
- Claims: `CLM-PILOT2-METHOD-001`
- Capabilities: `none`
- State: `not_applicable`

## Dirección visual

### Idea central

La dirección visual debe hacer visible que método, decisión y verificación gobiernan a las
herramientas, mientras cada capacidad planificada ocupa una función acotada.

- Evidence mode: `categorical`

### Relaciones

- `VIS-PILOT2-001` | `contrast` | `thesis`, `CLM-PILOT2-METHOD-001` | El método orienta; la herramienta ejecuta.
- `VIS-PILOT2-002` | `dependency` | `CLM-PILOT2-AGENT-WORKFLOW-001`, `CLM-PILOT2-WORKFLOWS-001` | Las decisiones administradas alimentan rutas repetibles.
- `VIS-PILOT2-003` | `sequence` | `CLM-PILOT2-PIPELINE-001`, `SUP-PILOT2-SYSTEM-001` | El contenido avanza por gates antes de convertirse en un paquete.
- `VIS-PILOT2-004` | `mapping` | `capability:d3`, `capability:three`, `capability:lottie`, `capability:gsap`, `capability:remotion-v3-creative-compositor` | Cada capacidad planificada responde a una intención visual distinta.
- `VIS-PILOT2-005` | `boundary` | `CLM-PILOT2-BOUNDARY-001`, `cta` | La creación termina antes de distribución y publicación.

### Límites visuales

- Preserve: Método y resultado preceden a las herramientas.
- Preserve: Producer, verifier y Guardian conservan responsabilidades distintas.
- Prohibit: No representar capacidades planificadas como instaladas, validadas o disponibles.
- Prohibit: No usar magnitudes, rankings o conexiones causales sin claim verificable.
- Prohibit: No insinuar distribución, publicación o automatización diseñadas.

### Accesibilidad

- Equivalent message: El método define la dirección, los agentes administran decisiones, los workflows ejecutan rutas y cinco capacidades planificadas cumplen funciones visuales distintas antes del gate humano.
- Reading order: `thesis` > `SUP-PILOT2-METHOD-001` > `SUP-PILOT2-SYSTEM-001` > `SUP-PILOT2-EVIDENCE-001` > `cta`
- Non-color cue: Etiquetas, orden, contornos y patrones distinguen roles, estados y fronteras.

## Acción

Diseña primero el sistema que producirá tu contenido y define qué señal verificará cada paso.

## Derechos y activos

- Solo activos first-party, procedurales o con autorización explícita podrán convertirse en derivados.
- Las referencias visuales externas sirven para análisis compositivo y no se reutilizan como assets.
- Una captura con PII, interfaz de terceros o derechos inciertos debe redibujarse semánticamente o excluirse.

## Accesibilidad

- Toda relación visual tendrá una equivalencia textual con el mismo significado.
- El orden de lectura será explícito y el color nunca será la única señal.
- Copy, labels y estados deberán seguir siendo comprensibles sin motion.

## Límites

- H-01 termina en `SCOPED`; no produce átomos, specs visuales, stills, PDF ni video.
- Las cinco capacidades permanecen `planned_capability` hasta cerrar H-03.
- No se afirman resultados obtenidos ni mejoras de desempeño.
- El perfil de voz candidato bloquea aprobación humana, readiness y release público.
- `distributionState` permanece `NOT_DESIGNED`.
- Ningún estado de este documento autoriza distribución o publicación.
