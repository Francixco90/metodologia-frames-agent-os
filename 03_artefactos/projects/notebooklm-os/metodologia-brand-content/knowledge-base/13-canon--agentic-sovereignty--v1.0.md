# Canon de soberanía y trabajo agéntico

Versión: `v1.0`
Estado: `ACTIVE_INTERNAL`

## Soberanía Digital

Soberanía Digital es la capacidad de diseñar y gobernar la propia forma de trabajo, elegir herramientas con criterio, conservar trazabilidad y cambiar de proveedor sin perder el método ni el conocimiento. La IA es vehículo y amplificador; no es el destino ni la autoridad. [METODOLOGIA]

## Progresión de autonomía

1. Chat o copiloto para asistencia puntual.
2. Prompt estructurado para resultados delimitados.
3. Asistente para outputs, roles o procesos repetibles.
4. Automatización para ejecutar una secuencia predefinida.
5. Agente para perseguir un objetivo con herramientas y límites.
6. Red de agentes cuando la complejidad justifica especialización, paralelismo o revisión independiente.

La autonomía se gana mediante evidencia y controles. No se presume por usar una herramienta más compleja. [METODOLOGIA]

## Cuándo usar cada arquitectura

- Tarea simple y lineal: un prompt o agente único optimizado.
- Flujo determinista: pipeline o automatización.
- Objetivo dinámico con herramientas: agente acotado.
- Problema con especialidades, paralelismo o riesgo: red mínima de agentes.

Más agentes implican más latencia, costo, superficie de ataque y coordinación. La red debe justificarse por el problema. [METODOLOGIA]

## Roles mínimos de una red gobernada

- **Lead/Orquestador:** interpreta intención, propone plan y delega.
- **Support/Especialista:** ejecuta una función con contexto acotado.
- **Guardian/Verificador:** evalúa sin participar en la generación y puede bloquear.

El productor no aprueba su propio trabajo cuando el riesgo exige independencia. [METODOLOGIA]

## Contratos y contexto

Cada agente declara identidad, propósito, inputs, outputs, herramientas, autoridad, límites y Definition of Done. Cada handoff contiene estado, contexto, instrucción, evidencia y propietario. [METODOLOGIA]

Comparte una fuente de verdad, pero aplica `context sharding`: cada especialista recibe solo lo necesario. La memoria debe ser persistente, auditable y gobernada; no una biblioteca abierta sin permisos. [METODOLOGIA]

## Controles

- Mínimo privilegio y RBAC.
- Allowlist de herramientas.
- Presupuestos y límites de iteración.
- Guardrails de privacidad y derechos.
- Pausa ante ambigüedad o impacto irreversible.
- HITL en decisiones críticas.
- Logs, receipts y readback.
- Revisión adversarial y quality gates con veto.
- Stop rule si el output no alcanza el DoD después de N intentos.

## Amenazas

- Prompt injection directa o indirecta.
- Contaminación de memoria o contexto.
- Validación circular y complacencia.
- Role overstepping.
- Fallos en cascada.
- Dependencia de proveedor.
- Automatización de un proceso incorrecto.
- Confundir demo con sistema productivo.

## Regla del plan observable

Antes de una acción externa material, el sistema presenta objetivo, targets, operaciones, fuentes, permisos, riesgos, rollback, criterios de aceptación y gate. El humano aprueba el plan; la máquina ejecuta dentro de esos límites. [METODOLOGIA]
