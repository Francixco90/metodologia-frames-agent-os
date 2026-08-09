---
name: frames-local-extension-foundry
description: This skill should be used when the user asks to "crear una skill local", "crear un workflow privado", "extender Frames sin subir al repo", "activar una extensión local", or validate a project-local or user-local capability.
version: 0.1.0
license: LicenseRef-MetodologIA-Internal
metadata:
  owner: MetodologIA
  lifecycle_state: active
  execution_scope: local-evaluation
  model_agnostic: true
---

# Frames Local Extension Foundry

## Contexto operativo

Lee [`context.md`](context.md). Convierte una necesidad normal en un paquete local descubrible, trazable y privado mediante R8/L00–L05. [METODOLOGIA][CONFIG]

## Procedimiento

1. Ejecuta `routeLocalExtensionIntent` y completa un brief antes de escribir.
2. Decide la forma mínima: skill, workflow o bundle.
3. Usa ID `local.<namespace>.<slug>` y `override_policy: never`.
4. Materializa solo tras `LX_BRIEF_APPROVED` en el root privado autorizado.
5. Verifica schemas, hashes, fixtures, dependencias, documentación y presupuesto.
6. Activa declarativos válidos; para código exige runner confiable, sandbox y evidencia material.
7. Emite receipt local y actualiza solo el índice/portal privado.

Abre [`references/operating-contract.md`](references/operating-contract.md) para precedencia, estados y promoción.

## Invariantes

- Las rutas canónicas siempre preceden; una local solo complementa o cubre una necesidad nueva.
- Empates locales quedan `AMBIGUOUS`; nunca se elige silenciosamente.
- Sin probe material, código queda `VALIDATED_NOT_RUNNABLE`.
- No escribe registries ni documentación públicos.
- Publicar o promover requiere otro proceso H-03.

## Salida

Devuelve brief, manifest, scope, estado calculado, hashes, reasons, receipt y siguiente gate. `UNKNOWN` bloquea.
