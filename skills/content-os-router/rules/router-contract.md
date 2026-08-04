# Router contract — ground truth

8 reglas que gobiernan el router source→video. Source of truth para
`scripts/route-audit.mjs` y `scripts/check-skill.mjs`.

## Reglas

1. **Hash-bound.** Cada intent-brief es auditable (`route-audit.mjs` PASS). Sin
   route válida o sin capability_map, no se despacha. Fails closed.
2. **Route-once.** El router corre una vez por intent, escribe el brief, sale.
   Nada re-abre el router. Toda pregunta "¿qué requirió la ruta?" se responde del
   brief.
3. **Route-by-deliverable.** Se rutcea por el deliverable pedido, no por keyword o
   file type al pasar. La route table es first-match por deliverable.
4. **Capability dispatch on-demand.** El capability_map[] declara qué skills Fase
   2 carga el workflow. Las capabilities nunca son owners del deliverable.
5. **Dual paradigm.** HTML+GSAP (Content OS) por defecto. Remotion solo si el
   intent lo pide explícito. No mezclar runtimes en un deliverable.
6. **Offline-first.** No network en el route path. No CLI fetch. El router lee
   intent local, escribe brief local. Media via `content-os-media` (offline
   cascade).
7. **Deterministic.** Mismo intent → misma route + mismo capability_map. Sin
   `Date.now()`/`Math.random()`/`new Date()`/`performance.now()`/`fetch`/
   `setTimeout`/`setInterval` en el router (hereda core).
8. **No render.** El router no renderiza. El HTML→MP4 adapter vive en
   `content-os-core`. El workflow orquesta; el router solo enruta.
   `RENDERED_DRAFT != HUMAN_APPROVED != READY != PUBLISHED`.

## Example manifest entry

```json
{
  "schemaVersion": "router-intent-v1",
  "intentId": "pr-123-explainer",
  "source_type": "github-pr",
  "source_ref": "PR #123",
  "deliverable": "explain a GitHub PR",
  "route": "content-os-pr-to-video",
  "capability_map": [
    "content-os-core",
    "content-os-animation",
    "content-os-keyframes",
    "content-os-creative",
    "content-os-media"
  ],
  "duration_s": 60,
  "runtime": "html-gsap",
  "offline": true,
  "workflow_status": "pending"
}
```

## Failure modes

| Code                     | Trigger                                             | Fix                                   |
| ------------------------ | --------------------------------------------------- | ------------------------------------- |
| `missing-route`          | intent sin `route` o route inválida                 | Rutcea via route table, escribe brief |
| `missing-capability-map` | intent sin `capability_map[]` o capability inválida | Declarar capabilities on-demand       |
| `unknown-source-type`    | `source_type` fuera del enum válido                 | Pedir source (R0), no adivines        |
| `route-by-keyword`       | rutcea por palabra suelta, no por deliverable       | Re-rutcea por deliverable             |
| `no-deliverable`         | intent sin `deliverable`                            | Pedir deliverable (R0)                |
| `network-in-route`       | URL https en brief u `offline != true`              | Quitar network, offline-first         |

## Stop rules

- Brief auditable PASS, route válida, capability_map[] cubre needs: STOP route.
- Workflow Fase 3 disponible: despachar. STOP.
- Workflow Fase 3 pendiente: `coverage_gap`, despachar capabilities. STOP route.
- Sin deliverable o source_type desconocido: STOP, pedir dato bloqueante (R0).
