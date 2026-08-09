# Mantén y evoluciona Frames con trazabilidad

Usa el recorrido de mantenimiento para corregir un defecto, ampliar una capacidad, migrar un contrato o retirar una superficie sin perder documentación, pruebas ni rollback.

## Qué hace Frames

1. Congela la base y el inventario.
2. Clasifica el cambio y su riesgo.
3. Define el write set, la aceptación y el impacto documental.
4. Se detiene en `HM_CHANGE_APPROVED`.
5. Implementa y verifica con producer, RT‑09 y RT‑11 separados cuando corresponde.
6. Regenera páginas, secuencias e inventarios.
7. Exige `DOCS_TRANSVERSAL_COMPLETE` antes del cierre.
8. Mantiene `HM_PROMOTION_APPROVED` separado de commit, push, merge y publicación.

## Definition of Done documental

Todo cambio `CREATE`, `EXPAND`, `EXTEND`, `CORRECT`, `MIGRATE` o `DEPRECATE` debe decidir, antes de editar, qué guías, referencias, workflows, skills, templates, routing, troubleshooting, ADR, compatibilidad, índices, portal y pruebas se actualizan. Una superficie no aplicable necesita un motivo controlado.

El cierre liga base, candidate, fuentes y proyecciones a hashes materiales. Un archivo faltante, un symlink, privacidad desconocida o producer igual al verifier bloquea.

## Comandos útiles

```sh
pnpm docs:generate
pnpm inventory:generate
pnpm check:documentation-os
```

Los dos primeros regeneran derivados; el tercero no escribe y detecta drift. La verificación completa sigue siendo necesaria antes de promover.

## Siguiente lectura

- [Recorridos M00–M06](../reference/workflows/index.md)
- [Ampliar Frames localmente](extend-frames.md)
- [Portal offline](../../03_artefactos/content/documentation/index.html)
- [Inventario del ecosistema](../../03_artefactos/content/documentation/ecosystem-inventory.md)
