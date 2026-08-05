import {existsSync, mkdtempSync, readFileSync, rmSync, writeFileSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {execFileSync, spawnSync} from 'node:child_process';
import {createHash} from 'node:crypto';

import {afterEach, beforeEach, describe, expect, it} from 'vitest';
import {
  bindVisibleCertificationStatement,
  visibleCertificationStatementMarkup,
} from '../../../skills/metodologia-certificate-builder/scripts/certification-statement-binding';

const root = process.cwd();
const renderScript = join(
  root,
  'skills',
  'metodologia-certificate-builder',
  'scripts',
  'render-certificates.ts',
);
const validateScript = join(
  root,
  'skills',
  'metodologia-certificate-builder',
  'scripts',
  'validate-certificates.ts',
);
const activeTemplatePath = join(
  root,
  'skills',
  'metodologia-certificate-builder',
  'assets',
  'certificate-template-v16.html',
);
const sha256 = (bytes: Buffer): string => createHash('sha256').update(bytes).digest('hex');

const validManifest = {
  package_id: 'certificados-test-roundtrip',
  issuer: 'MetodologIA',
  certificate_title: 'Certificado de Embajador',
  meta_label: 'Embajador MetodologIA',
  rail_label: 'MetodologIA Embajadores',
  issue_date: '2026-07-14',
  issue_date_display: '14 de julio de 2026',
  completion_date_display: '12 de julio de 2026',
  artifact_state: 'RENDERED_DRAFT',
  hours_claim_mode: 'certifiable_hours',
  certification_statement: 'Finalizo satisfactoriamente el programa.',
  effort_summary: 'Recorrido formativo completo.',
  learning_areas: ['Área uno', 'Área dos', 'Área tres'],
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

    const renderOut = execFileSync(
      'node',
      ['--import', 'tsx', renderScript, '--input', manifestPath, '--output', outputDir],
      {
        encoding: 'utf8',
        cwd: root,
      },
    );
    const summary = JSON.parse(renderOut) as {certificates: number};
    expect(summary.certificates).toBe(2);
    expect(existsSync(join(outputDir, 'manifest.json'))).toBe(true);
    expect(existsSync(join(outputDir, 'index.html'))).toBe(true);
    expect(existsSync(join(outputDir, 'html', '01-persona-sintetica-uno.html'))).toBe(true);
    expect(existsSync(join(outputDir, 'html', '02-persona-sintetica-dos.html'))).toBe(true);
    const firstHtml = readFileSync(
      join(outputDir, 'html', '01-persona-sintetica-uno.html'),
      'utf8',
    );
    expect(firstHtml).toContain('data-render-status="rendered"');
    expect(firstHtml).toContain('certificateData');
    expect(firstHtml).toContain('Persona');
    expect(firstHtml).toContain('MDG-TEST-001');
    expect(firstHtml).toContain('data-signature-slot="principal" hidden');
    expect(firstHtml).toContain('data-signature-slot="secundaria" hidden');
    expect(firstHtml).toContain('firmaPrincipal: "Firmante Sintetico"');
    expect(firstHtml).toContain('firmaPrincipalAsset: ""');
    expect(firstHtml).toContain('firmaSecundaria: ""');
    expect(firstHtml).toContain(
      visibleCertificationStatementMarkup(validManifest.certification_statement),
    );
    expect(firstHtml).toContain(
      `certificationStatement: ${JSON.stringify(validManifest.certification_statement)}`,
    );
    expect(firstHtml).not.toMatch(/\{\{[A-Z0-9_]+\}\}/u);
    const outputManifest = JSON.parse(readFileSync(join(outputDir, 'manifest.json'), 'utf8')) as {
      generator: {id: string; version: string};
      template_id: string;
      template_sha256: string;
      signatures: Array<{asset_mode: string; sha256: string | null}>;
    };
    expect(outputManifest.generator).toEqual({
      id: 'metodologia-certificate-builder',
      version: '0.4.1',
    });
    expect(outputManifest.template_id).toBe('programa-empoderamiento-reconocimiento-v16');
    expect(outputManifest.template_sha256).toBe(sha256(readFileSync(activeTemplatePath)));
    expect(outputManifest.signatures[0]).toMatchObject({
      asset_mode: 'none',
      sha256: null,
    });

    execFileSync(
      'node',
      ['--import', 'tsx', renderScript, '--input', manifestPath, '--output', outputDir, '--force'],
      {encoding: 'utf8', cwd: root},
    );
    const validateOut = execFileSync(
      'node',
      ['--import', 'tsx', validateScript, '--package', outputDir],
      {
        encoding: 'utf8',
        cwd: root,
      },
    );
    const result = JSON.parse(validateOut) as {
      static_status: string;
      observed: number;
      findings: unknown[];
    };
    expect(result.static_status).toBe('pass');
    expect(result.observed).toBe(2);
    expect(result.findings).toHaveLength(0);
  }, 30000);

  it('embeds authorized PNG and JPEG signatures and binds their hashes', () => {
    const pngBytes = Buffer.from(
      'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=',
      'base64',
    );
    const jpegBytes = Buffer.from(
      '/9j/4AAQSkZJRgABAQAAAQABAAD/2wBDAP//////////////////////////////////////////////////////////////////////////////////////2wBDAf//////////////////////////////////////////////////////////////////////////////////////wAARCAABAAEDASIAAhEBAxEB/8QAFQABAQAAAAAAAAAAAAAAAAAAAAX/xAAUEAEAAAAAAAAAAAAAAAAAAAAA/9oADAMBAAIQAxAAAAF//8QAFBABAAAAAAAAAAAAAAAAAAAAAP/aAAgBAQABBQJ//8QAFBEBAAAAAAAAAAAAAAAAAAAAAP/aAAgBAwEBPwF//8QAFBEBAAAAAAAAAAAAAAAAAAAAAP/aAAgBAgEBPwF//8QAFBABAAAAAAAAAAAAAAAAAAAAAP/aAAgBAQAGPwJ//8QAFBABAAAAAAAAAAAAAAAAAAAAAP/aAAgBAQABPyF//9oADAMBAAIAAwAAABAf/8QAFBEBAAAAAAAAAAAAAAAAAAAAAP/aAAgBAwEBPxB//8QAFBEBAAAAAAAAAAAAAAAAAAAAAP/aAAgBAgEBPxB//8QAFBABAAAAAAAAAAAAAAAAAAAAAP/aAAgBAQABPxB//9k=',
      'base64',
    );
    writeFileSync(join(tempDir, 'principal.png'), pngBytes);
    writeFileSync(join(tempDir, 'secundaria.jpeg'), jpegBytes);
    const manifestPath = join(tempDir, 'manifest-signatures.json');
    writeFileSync(
      manifestPath,
      JSON.stringify(
        {
          ...validManifest,
          recipients: [{name: 'Persona Sintetica Uno', folio: 'MDG-TEST-001'}],
          signatures: [
            {
              name: 'Firmante Sintetico Uno',
              role: 'Rol Sintetico Uno',
              asset_path: 'principal.png',
            },
            {
              name: 'Firmante Sintetico Dos',
              role: 'Rol Sintetico Dos',
              asset_path: 'secundaria.jpeg',
            },
          ],
        },
        null,
        2,
      ),
    );

    execFileSync(
      'node',
      ['--import', 'tsx', renderScript, '--input', manifestPath, '--output', outputDir],
      {encoding: 'utf8', cwd: root},
    );
    const html = readFileSync(join(outputDir, 'html', '01-persona-sintetica-uno.html'), 'utf8');
    expect(html).toContain('firmaPrincipalAsset: "data:image/png;base64,');
    expect(html).toContain('firmaSecundariaAsset: "data:image/jpeg;base64,');
    const outputManifest = JSON.parse(readFileSync(join(outputDir, 'manifest.json'), 'utf8')) as {
      signatures: Array<{
        asset_mode: string;
        mime_type: string;
        sha256: string;
      }>;
    };
    expect(outputManifest.signatures).toEqual([
      expect.objectContaining({
        asset_mode: 'embedded_data_uri',
        mime_type: 'image/png',
        sha256: sha256(pngBytes),
      }),
      expect.objectContaining({
        asset_mode: 'embedded_data_uri',
        mime_type: 'image/jpeg',
        sha256: sha256(jpegBytes),
      }),
    ]);
    const validateOut = execFileSync(
      'node',
      ['--import', 'tsx', validateScript, '--package', outputDir],
      {encoding: 'utf8', cwd: root},
    );
    expect(JSON.parse(validateOut)).toMatchObject({
      static_status: 'pass',
      findings: [],
    });
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

  it('escapes and binds the visible certification statement as plain text', () => {
    const certificationStatement = `Declaró <avance> & "evidencia" 'propia'.`;
    const manifestPath = join(tempDir, 'manifest-escaped-statement.json');
    writeFileSync(
      manifestPath,
      JSON.stringify(
        {
          ...validManifest,
          certification_statement: certificationStatement,
          recipients: [{name: 'Persona Sintetica Uno', folio: 'MDG-TEST-001'}],
        },
        null,
        2,
      ),
    );

    execFileSync(
      'node',
      ['--import', 'tsx', renderScript, '--input', manifestPath, '--output', outputDir],
      {encoding: 'utf8', cwd: root},
    );
    const html = readFileSync(join(outputDir, 'html', '01-persona-sintetica-uno.html'), 'utf8');
    expect(html).toContain(visibleCertificationStatementMarkup(certificationStatement));
    expect(html).not.toContain(`<p class="certificate-statement">${certificationStatement}</p>`);

    const validateOut = execFileSync(
      'node',
      ['--import', 'tsx', validateScript, '--package', outputDir],
      {encoding: 'utf8', cwd: root},
    );
    expect(JSON.parse(validateOut)).toMatchObject({
      static_status: 'pass',
      findings: [],
    });
  }, 30000);

  it('fails closed when the template statement slot is absent or duplicated', () => {
    expect(() => bindVisibleCertificationStatement('<main>sin slot</main>', 'Declaración')).toThrow(
      /exactly one certificate-statement slot; found 0/u,
    );
    const slot = '<p class="certificate-statement">placeholder</p>';
    expect(() => bindVisibleCertificationStatement(`${slot}${slot}`, 'Declaración')).toThrow(
      /exactly one certificate-statement slot; found 2/u,
    );
  });

  it('reports P1 when the bound visible statement is tampered', () => {
    const manifestPath = join(tempDir, 'manifest-tampering.json');
    writeFileSync(
      manifestPath,
      JSON.stringify(
        {
          ...validManifest,
          recipients: [{name: 'Persona Sintetica Uno', folio: 'MDG-TEST-001'}],
        },
        null,
        2,
      ),
    );
    execFileSync(
      'node',
      ['--import', 'tsx', renderScript, '--input', manifestPath, '--output', outputDir],
      {encoding: 'utf8', cwd: root},
    );

    const relativePath = 'html/01-persona-sintetica-uno.html';
    const htmlPath = join(outputDir, relativePath);
    const original = readFileSync(htmlPath, 'utf8');
    const tampered = original.replace(
      visibleCertificationStatementMarkup(validManifest.certification_statement),
      visibleCertificationStatementMarkup('Declaración adulterada.'),
    );
    expect(tampered).not.toBe(original);
    writeFileSync(htmlPath, tampered, 'utf8');

    const packageManifestPath = join(outputDir, 'manifest.json');
    const packageManifest = JSON.parse(readFileSync(packageManifestPath, 'utf8')) as {
      outputs: Array<{relative_path: string; sha256: string}>;
      files: Array<{path: string; sha256: string}>;
    };
    const tamperedHash = sha256(readFileSync(htmlPath));
    const output = packageManifest.outputs.find((item) => item.relative_path === relativePath);
    const file = packageManifest.files.find((item) => item.path === relativePath);
    if (!output || !file) throw new Error('Rendered HTML binding missing from package manifest.');
    output.sha256 = tamperedHash;
    file.sha256 = tamperedHash;
    writeFileSync(packageManifestPath, `${JSON.stringify(packageManifest, null, 2)}\n`, 'utf8');

    const validation = spawnSync(
      'node',
      ['--import', 'tsx', validateScript, '--package', outputDir],
      {encoding: 'utf8', cwd: root},
    );
    expect(validation.status).toBe(1);
    const result = JSON.parse(validation.stdout) as {
      static_status: string;
      findings: Array<{severity: string; issue: string}>;
    };
    expect(result.static_status).toBe('fail');
    expect(result.findings).toContainEqual(
      expect.objectContaining({
        severity: 'P1',
        issue: 'visible_certification_statement_mismatch',
      }),
    );
  }, 30000);
});
