---
name: metodologia-certificate-builder
description: This skill should be used when the user asks to "create MetodologIA certificates", "emit certificate batches", "validate certificate packages", "regenerate certificates from a manifest", or "prepare HTML certificates for printing or PDF conversion".
license: LicenseRef-MetodologIA-Internal
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
   folios, desglose horario, total, `artifact_state`, `hours_claim_mode` y firmantes.
3. Resolver `BrandProfileV2`, `VoiceProfileV2` y `ChannelProfileV1` por hash antes de renderizar.
4. Tratar como `coverage_gap` cualquier dato material no suministrado. No inferir aprobacion,
   competencia demostrada, horas, acreditacion externa ni fecha historica.
5. Usar `RENDERED_DRAFT` para demos. Exigir `approved_demo_sha256` antes de aceptar `FINAL`.
6. Usar `learning_areas` para mostrar el alcance formativo de manera estructurada cuando exista
   una fuente aprobada. No convertir el listado en una declaracion de competencia.

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
7. No compartir `assets/certificate-template.html`: al abrirse directamente debe mostrar el
   guard de plantilla tecnica, nunca un certificado con tokens sin resolver.

## Claims y evidencia

- Usar como autoridad la instruccion actual del usuario y las fuentes locales aprobadas.
- Separar finalizacion, asistencia, aprobacion, competencia demostrada y declaratoria: no son
  claims equivalentes.
- Verificar aritmeticamente cada total certificable contra sus componentes (el schema Zod lo
  exige).
- Etiquetar horas aproximadas como estimadas en el copy y en el manifiesto.
- Usar `hours_claim_mode: estimated_program_load` para mostrar `h estimadas`; no presentar esa
  carga prevista como horas certificables.
- Mantener una nota de alcance cuando el certificado sea interno y no constituya acreditacion
  externa o licencia profesional.
- Exigir revision humana para certificados publicables, contractuales o que puedan interpretarse
  como acreditacion de terceros.

## Privacidad y assets

- No guardar nombres reales, firmas, folios nominales ni rutas privadas dentro de esta skill.
- Aceptar firmas solo desde archivos locales autorizados; copiar al paquete como assets relativos.
- Bloquear en el HTML final `http(s)`, `file://`, `data:`, `blob:`, rutas absolutas, CDNs,
  fuentes remotas y tracking.
- Copiar Poppins y Montserrat desde el manifiesto local de fuentes autorizado y hash-bound.
- No leer caches, historiales, cookies, tokens ni perfiles de navegador como fuente de
  certificados.

## Stop rules

Detener ante `SOURCE_GAP`, `CLAIM_MISMATCH`, `RIGHTS_GAP`, `BRAND_DRIFT`, total horario
inconsistente, folios duplicados, referencia remota en HTML, firma no local o paquete existente
sin `--force`. Mantener `RENDERED_DRAFT` y emitir `WORKFLOW_PILOT_REVIEW`. Esperar una
aceptacion explicita; no emitir `READY` ni publicar.

## Recursos

- Usar [assets/certificate-template.html](assets/certificate-template.html) como shell A4
  landscape local de tres paginas (certificado, competencias y ruta formativa).
  El template es self-contained: fuentes woff2 embebidas, SVG inline y JS vanilla.
- El renderizador inyecta los datos del participante en el objeto `certificateData`
  del template mediante [scripts/render-certificates.ts](scripts/render-certificates.ts),
  que genera HTML, indice y manifiesto de salida.
- Usar [scripts/validate-certificates.ts](scripts/validate-certificates.ts) para validar
  estructura, hashes, assets, folios, datos inyectados y suma horaria.
- Leer [references/certificate-manifest.md](references/certificate-manifest.md) al preparar o
  revisar el JSON de entrada.

## Criterio de cierre

- Confirmar conteo esperado y observado.
- Confirmar folios unicos, hashes actuales y assets relativos existentes.
- Confirmar `data-render-status="rendered"`, `certificateData` inyectado y cero referencias remotas o rutas privadas.
- Confirmar total horario exacto y datos del participante presentes en todos los certificados.
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
