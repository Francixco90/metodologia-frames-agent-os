---
title: Integrar Skill Systems Specialist sobre Frames
status: accepted-local-evaluation
owner: skill-foundry
sources: [SRC-SKILL-SYSTEMS-PRD-V1, SRC-SKILL-SYSTEMS-BASELINE-V1]
---

# ADR-SSS-001 — Skill Systems sin arnés paralelo

## Contexto

El PRD describe un sistema riguroso para decidir cuándo crear una skill, separar componentes, evaluar valor incremental y gobernar releases. Frames ya dispone de routing R8/R9, lifecycle H‑03, WorkOrders, Documentation OS, inventarios y verificadores RT‑09/RT‑11. Duplicarlos introduciría dos autoridades y estados incompatibles.

## Decisión

Adoptar los contratos y controles útiles como familia interna S00–S09. R8 conserva extensiones privadas; R9 conserva cambios canónicos. Crear ocho skills con responsabilidad exclusiva; tools, evaluators mecánicos y aprobadores siguen siendo tipos distintos. Mantener el core portable y todos los hosts externos en `UNKNOWN` hasta probes materiales.

## Trade-offs

- Ocho skills mejoran descubribilidad y separación de funciones, pero elevan el costo H‑03. Se compensa con un contrato común y progressive disclosure.
- No crear R10 reduce superficie de routing, pero exige handoffs explícitos L/M ↔ S.
- La evaluación inicial puede demostrar decisiones y replay local, no comportamiento universal de hosts ni outcomes de media.

## Límites y recuperación

E3 sin runner confiable, sandbox y replay queda `VALIDATED_NOT_RUNNABLE`. E4 permanece fuera del MVP. Un adapter ausente degrada a handoff o `UNKNOWN`. Cualquier cambio crea successor; capsules y registries no se sobreescriben. H01 continúa separado de commit, push, merge, instalación y publicación.

## Aceptación

Contratos estrictos, diez workflows documentados, ocho paquetes H‑03, tools dry-run, baseline honesto, canary sintético, inventarios sincronizados y RT‑09/RT‑11 independientes. Estado máximo: `active/local-evaluation`.
