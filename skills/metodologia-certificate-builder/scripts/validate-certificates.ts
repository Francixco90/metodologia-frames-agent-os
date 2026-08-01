#!/usr/bin/env node
import {createHash} from 'node:crypto';
import {existsSync, readFileSync, readdirSync} from 'node:fs';
import {join, resolve, relative} from 'node:path';

import {escapeHtml, fileSha256} from '../../../scripts/lib/certificate-utils';
import {visibleCertificationStatementMarkup} from './certification-statement-binding';

interface Args {
  packageDir: string;
}

function parseArgs(argv: string[]): Args {
  const idx = argv.indexOf('--package');
  if (idx < 0 || !argv[idx + 1]) {
    throw new Error('Usage: validate-certificates.ts --package <directory>');
  }
  return {packageDir: resolve(argv[idx + 1] ?? '')};
}

interface Finding {
  severity: 'P0' | 'P1';
  file: string;
  issue: string;
}

const FORBIDDEN: ReadonlyArray<readonly [string, RegExp]> = [
  ['http_url', /https?:\/\//i],
  ['file_url', /file:\/\//i],
  ['data_uri_disallowed', /data:(?!font\/|image\/svg|image\/png|image\/jpeg|image\/webp)/i],
  ['blob_url', /blob:/i],
  ['css_import', /@import/i],
  ['local_font', /local\s*\(/i],
  ['windows_absolute_path', /[A-Za-z]:[\\/]/],
  ['mac_private_path', /\/Users\//i],
  ['source_map', /sourceMappingURL/i],
];

function countMatches(value: string, regex: RegExp): number {
  return [...value.matchAll(regex)].length;
}

function portableRelative(root: string, filePath: string): string {
  return relative(root, filePath).replace(/\\/g, '/');
}

function extractCertificateString(html: string, field: string): string | null {
  const match = html.match(new RegExp(`\\b${field}:\\s*("(?:\\\\.|[^"\\\\])*")`, 'u'));
  if (!match?.[1]) return null;
  try {
    return JSON.parse(match[1]) as string;
  } catch {
    return null;
  }
}

function decodeImageDataUri(
  value: string,
): {mimeType: 'image/png' | 'image/jpeg' | 'image/webp'; bytes: Buffer} | null {
  const match = value.match(/^data:(image\/(?:png|jpeg|webp));base64,([A-Za-z0-9+/=]+)$/u);
  if (!match?.[1] || !match[2]) return null;
  return {
    mimeType: match[1] as 'image/png' | 'image/jpeg' | 'image/webp',
    bytes: Buffer.from(match[2], 'base64'),
  };
}

function bytesSha256(bytes: Uint8Array): string {
  return createHash('sha256').update(bytes).digest('hex');
}

interface OutputItem {
  name: string;
  folio: string;
  file_name: string;
  relative_path: string;
  sha256: string;
  display_lines?: string[];
}

interface ManifestEffortItem {
  label: string;
  hours: number;
  estimated?: boolean;
}

interface PackageManifest {
  generator: {id: string; version: string};
  package_id: string;
  artifact_state: 'RENDERED_DRAFT' | 'FINAL';
  hours_claim_mode: 'certifiable_hours' | 'estimated_program_load';
  approved_demo_sha256: string | null;
  count: number;
  outputs: OutputItem[];
  effort: ManifestEffortItem[];
  total_certifiable_hours: number;
  signatures: Array<{
    name: string;
    role: string;
    asset_mode: 'embedded_data_uri' | 'none';
    mime_type: 'image/png' | 'image/jpeg' | 'image/webp' | null;
    sha256: string | null;
  }>;
  certification_statement: string;
  effort_summary?: string;
  learning_areas?: string[];
  evidence_note: string;
  limitation_note: string;
  issue_date_display: string;
  completion_date_display?: string;
  template_id: string;
  file_allowlist: string[];
  files: Array<{path: string; sha256: string}>;
}

function walkFiles(root: string, current = root): string[] {
  return readdirSync(current, {withFileTypes: true}).flatMap((entry) => {
    const absolute = join(current, entry.name);
    return entry.isDirectory() ? walkFiles(root, absolute) : [portableRelative(root, absolute)];
  });
}

function main(): void {
  const {packageDir} = parseArgs(process.argv);
  const manifestPath = join(packageDir, 'manifest.json');
  const findings: Finding[] = [];
  if (!existsSync(manifestPath)) throw new Error(`Missing manifest: ${manifestPath}`);
  const manifestText = readFileSync(manifestPath, 'utf8');
  const manifest = JSON.parse(manifestText) as PackageManifest;

  for (const [id, regex] of FORBIDDEN) {
    if (regex.test(manifestText)) findings.push({severity: 'P0', file: 'manifest.json', issue: id});
  }

  if (!Array.isArray(manifest.outputs) || manifest.outputs.length !== manifest.count) {
    findings.push({severity: 'P1', file: 'manifest.json', issue: 'output_count_mismatch'});
  }
  if (
    manifest.generator?.id !== 'metodologia-certificate-builder' ||
    manifest.generator.version !== '0.4.1'
  ) {
    findings.push({severity: 'P1', file: 'manifest.json', issue: 'unexpected_generator'});
  }
  if (manifest.template_id !== 'programa-empoderamiento-reconocimiento-v16') {
    findings.push({severity: 'P1', file: 'manifest.json', issue: 'unexpected_template_id'});
  }
  if (
    manifest.artifact_state === 'FINAL' &&
    !/^[a-f0-9]{64}$/u.test(manifest.approved_demo_sha256 ?? '')
  ) {
    findings.push({
      severity: 'P0',
      file: 'manifest.json',
      issue: 'final_without_approved_demo_hash',
    });
  }
  if (
    manifest.hours_claim_mode === 'estimated_program_load' &&
    !manifest.effort.every((item) => item.estimated === true)
  ) {
    findings.push({
      severity: 'P1',
      file: 'manifest.json',
      issue: 'estimated_mode_has_non_estimated_component',
    });
  }

  const allowedFiles = Array.isArray(manifest.file_allowlist)
    ? [...manifest.file_allowlist].sort()
    : [];
  const observedBoundFiles = walkFiles(packageDir)
    .filter((path) => path !== 'manifest.json')
    .sort();
  if (JSON.stringify(allowedFiles) !== JSON.stringify(observedBoundFiles)) {
    findings.push({severity: 'P0', file: 'manifest.json', issue: 'file_allowlist_mismatch'});
  }
  const declaredFiles = new Map(
    (Array.isArray(manifest.files) ? manifest.files : []).map((item) => [item.path, item.sha256]),
  );
  for (const path of observedBoundFiles) {
    const declaredHash = declaredFiles.get(path);
    if (!declaredHash || fileSha256(join(packageDir, path)) !== declaredHash) {
      findings.push({severity: 'P1', file: path, issue: 'bound_file_hash_mismatch'});
    }
  }
  const outputs = Array.isArray(manifest.outputs) ? manifest.outputs : [];
  const expectedFiles = new Set(outputs.map((item) => item.file_name));
  const htmlDir = join(packageDir, 'html');
  const observedFiles = existsSync(htmlDir)
    ? readdirSync(htmlDir).filter((name) => name.toLowerCase().endsWith('.html'))
    : [];
  for (const fileName of observedFiles) {
    if (!expectedFiles.has(fileName))
      findings.push({severity: 'P1', file: `html/${fileName}`, issue: 'unexpected_html'});
  }
  for (const fileName of expectedFiles) {
    if (!observedFiles.includes(fileName)) {
      findings.push({severity: 'P0', file: `html/${fileName}`, issue: 'missing_html'});
    }
  }

  const calculatedTotal = Array.isArray(manifest.effort)
    ? manifest.effort.reduce((sum, item) => sum + Number(item.hours || 0), 0)
    : Number.NaN;
  if (
    !Number.isFinite(calculatedTotal) ||
    Math.abs(calculatedTotal - Number(manifest.total_certifiable_hours)) > 1e-9
  ) {
    findings.push({
      severity: 'P1',
      file: 'manifest.json',
      issue: 'certifiable_hours_total_mismatch',
    });
  }

  const names = outputs.map((item) => String(item.name).toLowerCase());
  const folios = outputs.map((item) => String(item.folio).toLowerCase());
  if (new Set(names).size !== names.length) {
    findings.push({severity: 'P1', file: 'manifest.json', issue: 'duplicate_recipient'});
  }
  if (new Set(folios).size !== folios.length) {
    findings.push({severity: 'P1', file: 'manifest.json', issue: 'duplicate_folio'});
  }

  for (const item of outputs) {
    const htmlPath = join(packageDir, item.relative_path);
    if (!existsSync(htmlPath)) continue;
    const html = readFileSync(htmlPath, 'utf8');
    const rel = portableRelative(packageDir, htmlPath);
    for (const [id, regex] of FORBIDDEN) {
      if (regex.test(html)) findings.push({severity: 'P0', file: rel, issue: id});
    }
    const bodyTag = html.match(/<body\b[^>]*>/u)?.[0] ?? '';
    if (!bodyTag.includes('data-render-status="rendered"')) {
      findings.push({severity: 'P1', file: rel, issue: 'missing_render_status'});
    }
    if (countMatches(html, /class="page /g) < 1) {
      findings.push({severity: 'P1', file: rel, issue: 'missing_page_articles'});
    }
    const expectedTemplateState = manifest.artifact_state === 'FINAL' ? 'emitido' : 'demo';
    if (!bodyTag.includes(`data-template-state="${expectedTemplateState}"`)) {
      findings.push({severity: 'P1', file: rel, issue: 'body_template_state_mismatch'});
    }
    if (!/body\[data-template-state=(?:"emitido"|'emitido')\]\s+\.template-watermark/u.test(html)) {
      findings.push({severity: 'P1', file: rel, issue: 'watermark_selector_mutated'});
    }
    if (!html.includes('certificateData')) {
      findings.push({severity: 'P1', file: rel, issue: 'missing_certificate_data'});
    }
    const expectedStatement = visibleCertificationStatementMarkup(manifest.certification_statement);
    const exactStatementCount = html.split(expectedStatement).length - 1;
    const statementSlotCount = countMatches(
      html,
      /<p\b[^>]*\bclass="certificate-statement"[^>]*>/gu,
    );
    if (exactStatementCount !== 1 || statementSlotCount !== 1) {
      findings.push({
        severity: 'P1',
        file: rel,
        issue: 'visible_certification_statement_mismatch',
      });
    }
    if (!html.includes(item.folio)) {
      findings.push({severity: 'P1', file: rel, issue: 'missing_folio'});
    }
    if (!html.includes(String(manifest.total_certifiable_hours))) {
      findings.push({severity: 'P1', file: rel, issue: 'missing_total_hours'});
    }
    const lines = Array.isArray(item.display_lines) ? item.display_lines : [item.name];
    let recipientFound = false;
    for (const line of lines) {
      if (html.includes(escapeHtml(line))) {
        recipientFound = true;
      }
    }
    if (!recipientFound && lines.length > 0) {
      const parts = (lines[0] ?? '').split(/\s+/);
      const allPartsPresent = parts.every((p) => html.includes(escapeHtml(p)));
      if (!allPartsPresent) {
        findings.push({severity: 'P1', file: rel, issue: 'missing_recipient_copy'});
      }
    }
    if (item.sha256 && fileSha256(htmlPath) !== item.sha256) {
      findings.push({severity: 'P1', file: rel, issue: 'html_hash_mismatch'});
    }
    const signatureFields = ['firmaPrincipalAsset', 'firmaSecundariaAsset'] as const;
    manifest.signatures.forEach((signature, index) => {
      const field = signatureFields[index];
      if (!field) return;
      const encoded = extractCertificateString(html, field) ?? '';
      if (signature.asset_mode === 'none') {
        if (encoded) {
          findings.push({
            severity: 'P0',
            file: rel,
            issue: `unexpected_embedded_signature:${field}`,
          });
        }
        return;
      }
      const decoded = decodeImageDataUri(encoded);
      if (!decoded) {
        findings.push({severity: 'P0', file: rel, issue: `missing_embedded_signature:${field}`});
        return;
      }
      if (decoded.mimeType !== signature.mime_type) {
        findings.push({severity: 'P1', file: rel, issue: `signature_mime_mismatch:${field}`});
      }
      if (!signature.sha256 || bytesSha256(decoded.bytes) !== signature.sha256) {
        findings.push({severity: 'P1', file: rel, issue: `signature_hash_mismatch:${field}`});
      }
    });
    const assetRefs = [...html.matchAll(/src="\.\.\/assets\/([^"]+)"/g)].map((m) => m[1]);
    for (const asset of assetRefs) {
      if (asset && !existsSync(join(packageDir, 'assets', asset))) {
        findings.push({severity: 'P0', file: rel, issue: `missing_asset:${asset}`});
      }
    }
  }

  for (const signature of manifest.signatures) {
    if (
      signature.asset_mode === 'embedded_data_uri' &&
      (!signature.sha256 || !signature.mime_type)
    ) {
      findings.push({
        severity: 'P0',
        file: 'manifest.json',
        issue: 'embedded_signature_missing_binding',
      });
    }
    if (signature.asset_mode === 'none' && (signature.sha256 || signature.mime_type)) {
      findings.push({severity: 'P1', file: 'manifest.json', issue: 'empty_signature_has_binding'});
    }
  }

  const result = {
    package: manifest.package_id,
    expected: manifest.count,
    observed: observedFiles.length,
    total_certifiable_hours: manifest.total_certifiable_hours,
    artifact_state: manifest.artifact_state,
    hours_claim_mode: manifest.hours_claim_mode,
    findings,
    static_status: findings.length === 0 ? 'pass' : 'fail',
    visual_status: 'not_run',
    next_gate: 'Run browser screenshots and visual review before PDF or publication.',
  };
  process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
  process.exit(findings.length === 0 ? 0 : 1);
}

try {
  main();
} catch (error) {
  process.stderr.write(`FAIL: ${(error as Error).message}\n`);
  process.exit(1);
}
