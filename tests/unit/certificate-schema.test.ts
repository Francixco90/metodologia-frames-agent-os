import {describe, expect, it} from 'vitest';

import {CertificateManifestSchema} from '../../skills/metodologia-certificate-builder/schemas/certificate-manifest';

const validManifest = {
  package_id: 'certificados-programa-ejemplo',
  issuer: 'MetodologIA',
  certificate_title: 'Certificado de Embajador',
  meta_label: 'Embajador MetodologIA',
  rail_label: 'MetodologIA Embajadores',
  issue_date: '2026-07-14',
  issue_date_display: '14 de julio de 2026',
  certification_statement: 'Finalizo satisfactoriamente el programa.',
  effort_summary: 'Recorrido formativo completo.',
  effort: [
    {label: 'trabajo sincronico', hours: 48},
    {label: 'trabajo independiente', hours: 48},
    {label: 'cierre de entregables', hours: 24, estimated: true},
  ],
  total_certifiable_hours: 120,
  evidence_note: 'Competencias verificadas.',
  limitation_note: 'Constancia formativa interna.',
  panel_title: 'Esfuerzo formativo',
  recipients: [{name: 'Persona Ejemplo', folio: 'MDG-EJEMPLO-001'}],
  signatures: [{name: 'Firmante Autorizado', role: 'Rol institucional'}],
  coverage_gap: [],
} as const;

describe('CertificateManifestSchema', () => {
  it('accepts a valid manifest', () => {
    expect(() => CertificateManifestSchema.parse(validManifest)).not.toThrow();
  });

  it('rejects hours mismatch', () => {
    const bad = {...validManifest, total_certifiable_hours: 999};
    expect(() => CertificateManifestSchema.parse(bad)).toThrow();
  });

  it('rejects bad issue_date format', () => {
    const bad = {...validManifest, issue_date: '14/07/2026'};
    expect(() => CertificateManifestSchema.parse(bad)).toThrow();
  });

  it('rejects empty recipients', () => {
    const bad = {...validManifest, recipients: []};
    expect(() => CertificateManifestSchema.parse(bad)).toThrow();
  });

  it('rejects too many signatures', () => {
    const bad = {
      ...validManifest,
      signatures: [
        {name: 'A', role: 'R'},
        {name: 'B', role: 'R'},
        {name: 'C', role: 'R'},
        {name: 'D', role: 'R'},
      ],
    };
    expect(() => CertificateManifestSchema.parse(bad)).toThrow();
  });

  it('rejects non-slug package_id', () => {
    const bad = {...validManifest, package_id: 'Not A Slug!'};
    expect(() => CertificateManifestSchema.parse(bad)).toThrow();
  });

  it('rejects duplicate recipient names', () => {
    const bad = {
      ...validManifest,
      recipients: [
        {name: 'Persona Ejemplo', folio: 'MDG-001'},
        {name: 'Persona Ejemplo', folio: 'MDG-002'},
      ],
    };
    expect(() => CertificateManifestSchema.parse(bad)).toThrow();
  });

  it('rejects duplicate folios', () => {
    const bad = {
      ...validManifest,
      recipients: [
        {name: 'Persona A', folio: 'MDG-DUP'},
        {name: 'Persona B', folio: 'MDG-DUP'},
      ],
    };
    expect(() => CertificateManifestSchema.parse(bad)).toThrow();
  });

  it('rejects display_lines that do not preserve the full name', () => {
    const bad = {
      ...validManifest,
      recipients: [{name: 'Persona Ejemplo', folio: 'MDG-001', display_lines: ['Otro', 'Nombre']}],
    };
    expect(() => CertificateManifestSchema.parse(bad)).toThrow();
  });

  it('accepts display_lines that preserve the full name', () => {
    const good = {
      ...validManifest,
      recipients: [{name: 'Persona Ejemplo', folio: 'MDG-001', display_lines: ['Persona', 'Ejemplo']}],
    };
    expect(() => CertificateManifestSchema.parse(good)).not.toThrow();
  });
});