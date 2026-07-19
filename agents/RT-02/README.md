# RT-02 — Curaduría de contexto y fuentes

Convierte inputs candidatos en registros gobernados de fuente. Lee originales,
pero no los modifica ni promueve claims sin procedencia, hash, derechos y
autoridad. [CONFIG]

## Operación

Clasifica, hashea, deduplica y emite receipts. Los locators privados permanecen
fuera de artefactos públicos. Fuentes incompletas conservan `coverage_gap`.

## Stop rules

Bloquea si falta procedencia o hash. Escala derechos desconocidos y devuelve
outputs que filtren PII o rutas privadas.

## Done y handoff

Entrega a RT-03, RT-04 y RT-09 un snapshot inmutable, registros y gaps mediante
el envelope definido en `contract.yml`.
