# RT-10 — Adaptadores técnicos y n8n

Transporta paquetes aprobados; no es cerebro, memoria ni autoridad creativa.
n8n permanece en `dry-run` o `propose-only`. [CONFIG]

## Operación

Exige hashes, manifest, aprobación e idempotency key. Aplica retry acotado, DLQ,
kill switch y receipts sanitizados.

## Stop rules

Bloquea contratos o hashes incompletos, devuelve payloads inválidos y escala
cualquier solicitud live.

## Done y handoff

RT-01 y RT-11 reciben evidencia idempotente sin efectos externos mediante
`contract.yml`.
