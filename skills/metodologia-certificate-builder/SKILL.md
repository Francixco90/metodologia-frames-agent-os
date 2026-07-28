---
name: metodologia-certificate-builder
description: This skill should be used when the user asks to "create MetodologIA certificates", "emit certificate batches", "validate certificate packages", "regenerate certificates from a manifest", or "prepare HTML certificates for printing or PDF conversion".
version: 0.1.0
license: LicenseRef-MetodologIA-Internal
compatibility: Requires the certificate manifest Zod schema, A4 landscape HTML template, and hash-bound brand profiles.
metadata:
  owner: MetodologIA
  lifecycle_state: active
  execution_scope: local-candidate-production
---

# MetodologIA Certificate Builder

Crear certificados nominales reproducibles sin inventar fechas, horas, competencias,
acreditaciones ni firmas. Mantener la fuente estructurada, el HTML y la evidencia de validacion
como un mismo paquete hash-bound.

## Preflight

1. Leer primero cualquier certificado, plantilla, manifiesto, lista o regla de marca entregada
   por el usuario.
2. Confirmar marca activa, tipo de certificado, fuente de los claims, fecha, destinatarios,
   folios, desglose horario, total y firmantes.
3. Resolver `BrandProfileV2`, `VoiceProfileV2` y `ChannelProfileV1` por hash antes de renderizar.
4. Tratar como `coverage_gap` cualquier dato material no suministrado. No inferir aprobacion,
   competencia demostrada, horas, acreditacion externa ni fecha historica.

## Produccion

1. Crear un manifiesto JSON conforme a
   [references/certificate-manifest.md](references/certificate-manifest.md) y validado por
   [schemas/certificate-manifest.ts](schemas/certificate-manifest.ts).
2. Elegir una ruta de salida autorizada. Dentro del arnes, guardar nombres, firmas, manifiestos
   nominales y capturas solo en `work/private/certificates/<package_id>/`.
3. Generar el paquete con:

   `pnpm cb -- --input <manifest.json> --output <output-dir>`

4. Usar `--force` solo cuando el usuario haya autorizado regenerar una ruta existente y se haya
   revisado su contenido.
5. Validar el paquete con:

   `pnpm cv -- --package <output-dir>`

6. Si se solicita PDF, convertirlo solo despues del pass HTML/visual y usar la skill PDF
   aplicable. No declarar aptitud de imprenta ni PDF/X sin su gate especifico.

## Claims y evidencia

- Usar como autoridad la instruccion actual del usuario y las fuentes locales aprobadas.
- Separar finalizacion, asistencia, aprobacion, competencia demostrada y declaratoria: no son
  claims equivalentes.
- Verificar aritmeticamente cada total certificable contra sus componentes (el schema Zod lo
  exige).
- Etiquetar horas aproximadas como estimadas en el copy y en el manifiesto.
- Mantener una nota de alcance cuando el certificado sea interno y no constituya acreditacion
  externa o licencia profesional.
- Exigir revision humana para certificados publicables, contractuales o que puedan interpretarse
  como acreditacion de terceros.

## Privacidad y assets

- No guardar nombres reales, firmas, folios nominales ni rutas privadas dentro de esta skill.
- Aceptar firmas solo desde archivos locales autorizados; copiar al paquete como assets relativos.
- Bloquear en el HTML final `http(s)`, `file://`, `data:`, `blob:`, rutas absolutas, CDNs,
  fuentes remotas y tracking.
- No leer caches, historiales, cookies, tokens ni perfiles de navegador como fuente de
  certificados.

## Stop rules

Detener ante `SOURCE_GAP`, `CLAIM_MISMATCH`, `RIGHTS_GAP`, `BRAND_DRIFT`, total horario
inconsistente, folios duplicados, referencia remota en HTML, firma no local o paquete existente
sin `--force`. Mantener `RENDERED_DRAFT` y emitir `WORKFLOW_PILOT_REVIEW`. Esperar una
aceptacion explicita; no emitir `READY` ni publicar.

## Recursos

- Usar [assets/certificate-template.html](assets/certificate-template.html) como shell A4
  landscape local.
- Usar [scripts/render-certificates.ts](scripts/render-certificates.ts) para generar HTML, indice
  y manifiesto de salida.
- Usar [scripts/validate-certificates.ts](scripts/validate-certificates.ts) para validar
  estructura, hashes, assets, folios, copy nominal y suma horaria.
- Leer [references/certificate-manifest.md](references/certificate-manifest.md) al preparar o
  revisar el JSON de entrada.

## Criterio de cierre

- Confirmar conteo esperado y observado.
- Confirmar folios unicos, hashes actuales y assets relativos existentes.
- Confirmar una sola etiqueta `h1`, shell semantica y cero referencias remotas o rutas privadas.
- Confirmar total horario exacto y copy material presente en todos los certificados.
- Revisar visualmente cada pagina o registrar `coverage_gap` si no hay navegador.
- Reportar archivos creados, validaciones, decision, privacidad, gaps y siguiente accion.

## Limites

- No inventar evidencia de competencia ni autenticar firmas.
- No actuar como autoridad acreditadora externa.
- No publicar nombres o firmas fuera de la ruta autorizada.
- No considerar la validacion estatica como sustituto de la revision visual.
- No sobrescribir paquetes existentes sin autorizacion explicita.

## Fixtures y checks

Usar `fixtures/positive/embajador-batch.yml` y `fixtures/negative/hours-mismatch.yml` +
`fixtures/negative/remote-signature.yml`. Ejecutar `pnpm verify:skills` antes de aceptar una
nueva version.