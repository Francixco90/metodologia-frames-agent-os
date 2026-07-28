import {mkdtempSync, rmSync, writeFileSync, existsSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {execFileSync} from 'node:child_process';

import {afterEach, beforeEach, describe, expect, it} from 'vitest';

const root = process.cwd();
const renderScript = join(root, 'skills', 'metodologia-certificate-builder', 'scripts', 'render-certificates.ts');
const validateScript = join(
  root,
  'skills',
  'metodologia-certificate-builder',
  'scripts',
  'validate-certificates.ts',
);

const validManifest = {
  package_id: 'certificados-test-roundtrip',
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
  recipients: [
    {name: 'Persona Sintetica Uno', folio: 'MDG-TEST-001'},
    {name: 'Persona Sintetica Dos', folio: 'MDG-TEST-002'},
  ],
  signatures: [{name: 'Firmante Sintetico', role: 'Instructor Sintetico'}],
  coverage_gap: [],
} as const;

describe('certificate render + validate round-trip', () => {
  let tempDir: string;
  let outputDir: string;

  beforeEach(() => {
    tempDir = mkdtempSync(join(tmpdir(), 'cert-test-'));
    outputDir = join(tempDir, 'output');
  });

  afterEach(() => {
    rmSync(tempDir, {recursive: true, force: true});
  });

  it('renders a valid package and validation passes', () => {
    const manifestPath = join(tempDir, 'manifest.json');
    writeFileSync(manifestPath, JSON.stringify(validManifest, null, 2));

    const renderOut = execFileSync('node', ['--import', 'tsx', renderScript, '--input', manifestPath, '--output', outputDir], {
      encoding: 'utf8',
      cwd: root,
    });
    const summary = JSON.parse(renderOut) as {certificates: number};
    expect(summary.certificates).toBe(2);
    expect(existsSync(join(outputDir, 'manifest.json'))).toBe(true);
    expect(existsSync(join(outputDir, 'index.html'))).toBe(true);
    expect(existsSync(join(outputDir, 'html', '01-persona-sintetica-uno.html'))).toBe(true);
    expect(existsSync(join(outputDir, 'html', '02-persona-sintetica-dos.html'))).toBe(true);

    const validateOut = execFileSync('node', ['--import', 'tsx', validateScript, '--package', outputDir], {
      encoding: 'utf8',
      cwd: root,
    });
    const result = JSON.parse(validateOut) as {
      static_status: string;
      observed: number;
      findings: unknown[];
    };
    expect(result.static_status).toBe('pass');
    expect(result.observed).toBe(2);
    expect(result.findings).toHaveLength(0);
  }, 30000);

  it('rejects hours mismatch at render time', () => {
    const badManifest = {...validManifest, total_certifiable_hours: 999};
    const manifestPath = join(tempDir, 'manifest-bad.json');
    writeFileSync(manifestPath, JSON.stringify(badManifest, null, 2));
    expect(() => {
      execFileSync(
        'node',
        ['--import', 'tsx', renderScript, '--input', manifestPath, '--output', outputDir],
        {encoding: 'utf8', cwd: root, stdio: 'pipe'},
      );
    }).toThrow();
  }, 30000);
});