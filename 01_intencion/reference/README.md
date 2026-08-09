---
title: Referencia de Frames
type: technical_reference
status: candidate
owner: RT-04 Architecture
audience: [operator, maintainer]
---

# Referencia de Frames

Esta capa responde “qué existe y cómo se relaciona” después de que las guías orientadas a resultados explican “qué puedo lograr”. No es el mejor punto de entrada para una persona nueva: comienza por el quick start y vuelve aquí cuando necesites inspeccionar una decisión, un paso o una aprobación.

## Qué encontrarás

- [Recorridos y diagramas](workflows/index.md): referencia generada de cada workflow ejecutable.
- Inputs y entregables derivados de la fuente canónica.
- Skills responsables, verificadores, gates y reglas de detención.
- Alternativas textuales para comprender cada diagrama sin depender de su visualización.

## Cómo leer un recorrido

1. **Qué puedes conseguir** traduce el propósito técnico a una utilidad concreta.
2. **Qué necesita** evita iniciar sin los insumos indispensables.
3. **Qué entrega** muestra los artefactos que deben existir realmente.
4. **Cómo avanza** conecta pasos, skills, resultados y aprobaciones.
5. **Límites** explica cuándo Frames debe detenerse en lugar de improvisar.

## Autoridad y actualización

Los archivos `workflow.yml` son la autoridad ejecutable. Esta referencia, el portal HTML y sus diagramas son proyecciones: si divergen, el checker bloquea el cierre. Para modificar una página generada, cambia la fuente autorizada y regenera todo el conjunto.

Los cambios de creación, expansión, extensión, corrección, migración o deprecación deben declarar impacto documental antes de producir. Un cambio no está terminado hasta sincronizar fuentes, referencias, índices, portal y pruebas aplicables.
