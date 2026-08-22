---
name: content-os-publication-privacy-verifier
description: This skill should be used when a hash-bound minimal-redaction-execution-v1 must be independently audited for protected-signal residuals, changes outside authorized masks, value-zone occlusion, audio identity outside silence spans, and disclosure-curtain-v2 compliance before human playback.
license: LicenseRef-MetodologIA-Internal
metadata:
  owner: MetodologIA
  version: 0.1.0
  lifecycle_state: candidate
  execution_scope: local-candidate-nondurable-verification
---

# ContentOS Publication Privacy Verifier

Auditar de forma independiente una ejecución de censura mínima. La skill rederiva la
detección antes y después, vuelve a acreditar la ejecución, neutraliza solo las máscaras
autorizadas para comparar RGB, compara audio fuera de los silencios y valida la divulgación
de cortinillas. Emite `publication-privacy-report-v1`; no transforma, corrige ni promueve.

## Secuencia

1. Abrir solicitud, receipt, inventarios y requests de detección como materiales canónicos.
2. Recalcular ambos `sensitive-signal-inventory-v1` y exigir cobertura completa.
3. Reejecutar el assertion determinista de `minimal-redaction-execution-v1` en scratch
   efímero aislado; las raíces físicas de evidencia permanecen inmutables.
4. Buscar residuales por identidad y clase protegidas en el inventario posterior.
5. Comparar cada cuadro en RGB después de cubrir únicamente los ROI autorizados; cualquier
   cuadro divergente acredita alteración fuera de máscara.
6. Recalcular presupuesto y oclusión de zonas de valor. Comparar PCM por canal fuera de los
   spans y silencio interior excluyendo fades.
7. Re-renderizar cada cortinilla con fuente y herramienta hash-bound, contrastarla contra
   cuadros exportados y exigir intro/cierre en la pieza principal y una en cada recorte.
8. Verificar que el cuerpo exportado conserve RGB y PCM, que el set de exports sea completo
   y que una autorización material vigente respalde la nota de memoria de clase.
9. Emitir reporte bloqueado o listo únicamente para reproducción humana.

## Divulgación

- Toda cortinilla usa `EDITADO CON IA` en zona segura inferior.
- Si existe al menos una operación de censura agrega `MEMORIA DE CLASE AUTORIZADA`.
- Contraste mínimo 4.5:1, altura textual mínima 2.2% del cuadro y 1.8 s de lectura.
- La divulgación vive en cortinillas, nunca como marca de agua persistente sobre el trabajo.
- Intro, capítulo y cierre cumplen el mismo contrato; cada pieza autónoma retiene una.

## Stop rules

- Material, receipt, actor, raíz, herramienta o inventario no rederivable: FAIL.
- Cobertura `UNKNOWN`, `NOT_PRESENT` no acreditada o detector incompleto: FAIL.
- Residual protegido, divergencia RGB, audio exterior alterado, silencio ausente, zona focal
  ocluida o cortinilla insuficiente: `BLOCKED_PRIVACY_FINDINGS`.
- Aun con cero hallazgos: `VERIFIED_FOR_HUMAN_PLAYBACK`, máximo `RENDERED_DRAFT`.
- Reproducción completa, Guardian, aprobación de Javier y autorización de publicación siguen
  siendo gates independientes.

## Uso

```bash
node --import tsx skills/content-os-publication-privacy-verifier/scripts/verify-publication-privacy.mjs request.json source-root output-root disclosure-root
node --import tsx skills/content-os-publication-privacy-verifier/scripts/check-skill.mjs
```

`coverage_gap`: la autenticidad externa de actores y autorizaciones depende del harness de
receipts. La skill no escribe en las tres raíces auditadas; solo usa scratch efímero y acredita
consistencia material local, no consentimiento ni publicación.
