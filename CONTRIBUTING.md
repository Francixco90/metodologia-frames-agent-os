# Contribucion

1. Selecciona un paquete del DAG.
2. Confirma dependencia y allowlist.
3. Implementa cambios pequenos y deterministas.
4. Ejecuta los checks del paquete.
5. Solicita revision a un verifier distinto.

No dependencias flotantes, assets sin licencia, claims sin fuente, red durante render ni publicacion desde CI.

## Folios

Si creas folios, agrega una entrada en `registries/contributions/entries/`. ID: `node -e "console.log(crypto.randomUUID())"`. Valida: `pnpm verify:contributions`.

Los folios conservan su nomenclatura. Duplicados se conservan. El `registry_entry_id` es la clave unica. El `contributor_alias` es seudonimo opaco.

No commitees PII. `work/private/` esta gitignored.
