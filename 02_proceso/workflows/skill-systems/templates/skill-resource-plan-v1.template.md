---
template_id: skill-resource-plan-v1
schema_version: skill-systems-template-model-v1
state: DRAFT
owner: skill-authoring-engineer
model_sha256: 42c9e261a62b0152c4004ded4b215bd43e9a203ffa128a8e28bf653ff1afaabd
---

# Plan de recursos de una skill

Seleccionar assets, scripts, referencias y templates sin copiar ni inflar el paquete.

## 1. Trabajo del usuario

> Explica qué esfuerzo reduce el recurso y cuándo se carga.

⟦FIELD:job⟧

## 2. Inventario de fuentes

> Lista cada recurso, locator portable, hash y autoridad.

⟦FIELD:inventory⟧

## 3. Disposición

> Marca ADOPT ADAPT REFERENCE REJECT o GAP con razón verificable.

⟦FIELD:disposition⟧

## 4. Carga progresiva

> Separa SKILL compacto, referencias, assets y scripts.

⟦FIELD:progressive⟧

## 5. Contratos y efectos

> Liga inputs, outputs, tools, write set, effects y fallback.

⟦FIELD:contracts⟧

## 6. Templates y paridad

> Define Markdown canónico, HTML derivado y campos obligatorios.

⟦FIELD:templates⟧

## 7. Fixtures y evaluaciones

> Incluye positivos, adversariales, replay y no-skill baseline.

⟦FIELD:tests⟧

## 8. Handoff y cierre

> Indica owner, verifier, hashes, documentación y stop rule.

⟦FIELD:closure⟧

<!-- skill-systems-template-data:{"schema_version":"skill-systems-template-model-v1","template_id":"skill-resource-plan-v1","title":"Plan de recursos de una skill","purpose":"Seleccionar assets, scripts, referencias y templates sin copiar ni inflar el paquete.","owner":"skill-authoring-engineer","sections":[{"id":"job","title":"Trabajo del usuario","prompt":"Explica qué esfuerzo reduce el recurso y cuándo se carga."},{"id":"inventory","title":"Inventario de fuentes","prompt":"Lista cada recurso, locator portable, hash y autoridad."},{"id":"disposition","title":"Disposición","prompt":"Marca ADOPT ADAPT REFERENCE REJECT o GAP con razón verificable."},{"id":"progressive","title":"Carga progresiva","prompt":"Separa SKILL compacto, referencias, assets y scripts."},{"id":"contracts","title":"Contratos y efectos","prompt":"Liga inputs, outputs, tools, write set, effects y fallback."},{"id":"templates","title":"Templates y paridad","prompt":"Define Markdown canónico, HTML derivado y campos obligatorios."},{"id":"tests","title":"Fixtures y evaluaciones","prompt":"Incluye positivos, adversariales, replay y no-skill baseline."},{"id":"closure","title":"Handoff y cierre","prompt":"Indica owner, verifier, hashes, documentación y stop rule."}]} -->
