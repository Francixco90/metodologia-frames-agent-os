# Inbox de fuentes

Esta ruta recibe material antes de evaluarlo. Un archivo presente aqui no adquiere
autoridad ni derechos por el solo hecho de existir.

## Estado de este repositorio (publico/sanitizado)

Las subcarpetas `Contratos/`, `Firmas/` y `Muestras/` estan
**vacias intencionalmente**. Contienen unicamente `.gitkeep` y `README.md`
para preservar la estructura del harness. El contenido real (con informacion
personal) se mantiene en el repositorio privado original y no se publica.

La subcarpeta `first-party/` contiene proyecciones semanticas sin PII que son
parte del pipeline y estan referenciadas por hash en receipts y manifests.

La subcarpeta `templates/` contiene plantillas HTML con placeholders genericos
(sin nombres reales).

## Contrato de ingesta

1. Asignar un `source_id` portable.
2. Conservar los bytes recibidos sin sobrescribirlos.
3. Calcular `raw_sha256`.
4. Normalizar una copia logica mediante el contrato de
   `registries/sources/lifecycle-contract.yml` y calcular `normalized_sha256`.
5. Emitir receipts append-only para cada transicion de estado.
6. Bloquear la promocion si procedencia, deduplicacion, derechos o autoridad no
   tienen veredicto.

Los locators privados, credenciales y contenidos restringidos no se versionan.
