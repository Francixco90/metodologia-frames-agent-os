# Contrato de operación

## Modelo

Cada entrada conserva ID, clase, scope, owner, fuente, estado, referencias, derivados y hash. Las relaciones usan IDs resolubles, no nombres aproximados.

## Separación de scopes

La vista pública contiene solo superficies versionadas. La vista local fusiona canónico, proyecto y usuario en memoria y etiqueta el origen; nunca copia rutas privadas al modelo público.

## Reconciliación

Contrastar registry, manifest y archivo material. Declarado sin material, material sin owner, ID duplicado, hash stale o relación muerta son findings, no capacidades válidas.

## Determinismo

Ordenar claves, categorías e IDs de forma estable. Excluir timestamps del digest. Doble replay debe producir bytes idénticos.
