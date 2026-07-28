# Manifiesto de certificados

Usar JSON UTF-8. Resolver `asset_path` relativo al archivo de entrada. Mantener nombres y firmas
en una ruta privada o expresamente autorizada.

La validacion autoritativa esta en `schemas/certificate-manifest.ts` (Zod). Este documento es
guia legible; en caso de divergencia, el schema prevalece.

## Ejemplo minimo

```json
{
  "package_id": "certificados-programa-ejemplo",
  "issuer": "MetodologIA",
  "certificate_title": "Certificado de Embajador",
  "meta_label": "Embajador MetodologIA",
  "rail_label": "MetodologIA Embajadores",
  "issue_date": "2026-07-14",
  "issue_date_display": "14 de julio de 2026",
  "certification_statement": "Finalizo satisfactoriamente el programa, demostro las competencias previstas y obtuvo la declaratoria correspondiente.",
  "effort_summary": "El recorrido comprendio trabajo sincronico, trabajo independiente y cierre de entregables.",
  "effort": [
    { "label": "trabajo sincronico", "hours": 48 },
    { "label": "trabajo independiente", "hours": 48 },
    { "label": "cierre de entregables", "hours": 24, "estimated": true }
  ],
  "total_certifiable_hours": 120,
  "evidence_note": "Competencias y entregables verificados conforme al registro interno del programa.",
  "limitation_note": "Constancia formativa interna. No constituye acreditacion externa ni licencia profesional.",
  "panel_title": "Esfuerzo formativo",
  "recipients": [
    {
      "name": "Persona Ejemplo",
      "display_lines": ["Persona", "Ejemplo"],
      "folio": "MDG-EJEMPLO-001"
    }
  ],
  "signatures": [
    {
      "name": "Firmante Autorizado",
      "role": "Rol institucional",
      "asset_path": "firmas/firma-autorizada.png"
    }
  ],
  "coverage_gap": []
}
```

## Reglas

- `package_id`: slug lowercase no sensible.
- `issue_date`: `YYYY-MM-DD`; no sustituir la fecha historica por la de emision sin declararlo.
- `certification_statement`: texto plano; no aceptar HTML del usuario.
- `effort`: entre uno y cuatro componentes con horas no negativas.
- `total_certifiable_hours`: igualdad exacta con la suma de `effort[].hours`.
- `estimated`: `true` cuando el componente sea aproximado.
- `recipients`: nombre y folio unicos; `display_lines` opcional (1-3 lineas que preserven el nombre completo).
- `signatures`: entre uno y tres firmantes; `asset_path` opcional, local, PNG/JPG/JPEG/WEBP.
- `coverage_gap`: registrar faltantes materiales sin datos sensibles.

## Salida

El renderer produce:

- `index.html`
- `manifest.json`
- `html/<nn>-<slug>.html`
- `assets/<firma-local>` cuando existan firmas graficas

El manifiesto de salida contiene nombres y folios. Tratar todo el paquete como nominal.