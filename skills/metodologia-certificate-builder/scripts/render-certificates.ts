#!/usr/bin/env node
import {copyFileSync, existsSync, mkdirSync, readFileSync, readdirSync, statSync, writeFileSync} from 'node:fs';
import {join, resolve, dirname, extname, basename, isAbsolute} from 'node:path';
import {fileURLToPath} from 'node:url';

import {CertificateManifestSchema, type CertificateManifest} from '../schemas/certificate-manifest';
import {escapeHtml, fileSha256, readJson, slugify} from '../../../scripts/lib/certificate-utils';

const scriptDir = dirname(fileURLToPath(import.meta.url));
const TEMPLATE_PATH = join(scriptDir, '..', 'assets', 'certificate-template.html');

interface Args {
  input: string;
  output: string;
  force: boolean;
}

function parseArgs(argv: string[]): Args {
  const args: Partial<Args> = {force: false};
  for (let index = 2; index < argv.length; index += 1) {
    const token = argv[index];
    if (token === '--force') {
      args.force = true;
      continue;
    }
    if (token === '--input' || token === '--output') {
      const value = argv[index + 1];
      if (!value) throw new Error(`${token} requires a value.`);
      args[token.slice(2) as 'input' | 'output'] = value;
      index += 1;
      continue;
    }
    throw new Error(`Unknown argument: ${token}`);
  }
  if (!args.input || !args.output) {
    throw new Error('Usage: render-certificates.ts --input <manifest.json> --output <directory> [--force]');
  }
  return args as Args;
}

interface NormalizedSignature {
  name: string;
  role: string;
  asset_path?: string | undefined;
  asset: string | null;
  html_asset: string | null;
  sha256: string | null;
}

function copySignatureAssets(
  signatures: CertificateManifest['signatures'],
  inputDir: string,
  assetsDir: string,
): NormalizedSignature[] {
  mkdirSync(assetsDir, {recursive: true});
  return signatures.map((sig, index) => {
    if (!sig.asset_path) {
      return {...sig, asset: null, html_asset: null, sha256: null};
    }
    if (/^(https?|file|data|blob):/i.test(sig.asset_path)) {
      throw new Error(`Signature asset must be a local file path: ${sig.asset_path}`);
    }
    const source = isAbsolute(sig.asset_path) ? sig.asset_path : resolve(inputDir, sig.asset_path);
    if (!existsSync(source) || !statSync(source).isFile()) {
      throw new Error(`Signature asset not found: ${sig.asset_path}`);
    }
    const ext = extname(source).toLowerCase();
    if (!['.png', '.jpg', '.jpeg', '.webp'].includes(ext)) {
      throw new Error(`Unsupported signature asset type: ${ext}`);
    }
    const fileName = `signature-${String(index + 1).padStart(2, '0')}${ext}`;
    const dest = join(assetsDir, fileName);
    copyFileSync(source, dest);
    return {
      ...sig,
      asset: `assets/${fileName}`,
      html_asset: `../assets/${fileName}`,
      sha256: fileSha256(dest),
    };
  });
}

function effortRows(effort: CertificateManifest['effort']): string {
  return effort
    .map((item) => {
      const estimate = item.estimated ? '<span class="estimate">estimadas</span>' : '';
      return `<div class="hour-row"><span class="hour-number">${escapeHtml(item.hours)} h</span><span class="hour-label">${escapeHtml(item.label)} ${estimate}</span></div>`;
    })
    .join('\n');
}

function signatureCards(signatures: NormalizedSignature[]): string {
  return signatures
    .map((sig) => {
      const image = sig.html_asset
        ? `<img class="signature-image" src="${escapeHtml(sig.html_asset)}" alt="Firma de ${escapeHtml(sig.name)}">`
        : '<div class="signature-image signature-image--empty" aria-hidden="true"></div>';
      return `<section class="signature">${image}<div class="signature-line" aria-hidden="true"></div><p class="issuer-name">${escapeHtml(sig.name)}</p><p class="issuer-role">${escapeHtml(sig.role)}</p></section>`;
    })
    .join('\n');
}

function replaceTokens(template: string, values: Record<string, string>): string {
  let output = template;
  for (const [key, value] of Object.entries(values)) {
    output = output.split(`{{${key}}}`).join(value);
  }
  const unresolved = output.match(/\{\{[A-Z0-9_]+\}\}/g);
  if (unresolved) {
    throw new Error(`Template has unresolved tokens: ${[...new Set(unresolved)].join(', ')}`);
  }
  return output;
}

interface OutputEntry {
  name: string;
  display_lines: string[];
  folio: string;
  file_name: string;
  relative_path: string;
  sha256: string;
}

function writeIndex(
  outputRoot: string,
  config: CertificateManifest,
  outputs: OutputEntry[],
): void {
  const items = outputs
    .map(
      (item) =>
        `<li><a href="${escapeHtml(item.relative_path)}">${escapeHtml(item.folio)} - ${escapeHtml(item.name)}</a></li>`,
    )
    .join('\n');
  const html = `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${escapeHtml(config.certificate_title)} - ${escapeHtml(config.issuer)}</title>
  <style>
    body { margin: 0; padding: 40px; font-family: "Segoe UI", Arial, sans-serif; color: #0a122a; background: #eef2f6; }
    main { max-width: 860px; margin: 0 auto; padding: 32px; border: 1px solid #ccd3dc; background: #fff; }
    h1 { margin: 0 0 12px; font-size: 28px; }
    li { margin: 8px 0; }
    a { color: #0a122a; font-weight: 700; }
  </style>
</head>
<body>
  <main>
    <h1>${escapeHtml(config.certificate_title)}</h1>
    <p>Paquete nominal: ${outputs.length} certificados. Fecha de emision: ${escapeHtml(config.issue_date_display)}.</p>
    <ol>${items}</ol>
  </main>
</body>
</html>`;
  writeFileSync(join(outputRoot, 'index.html'), html, 'utf8');
}

function main(): void {
  const args = parseArgs(process.argv);
  const inputPath = resolve(args.input);
  const outputRoot = resolve(args.output);
  if (!existsSync(inputPath)) throw new Error(`Input manifest not found: ${inputPath}`);

  if (!existsSync(outputRoot)) {
    mkdirSync(outputRoot, {recursive: true});
  } else {
    const entries = readdirSync(outputRoot);
    if (entries.length > 0 && !args.force) {
      throw new Error(
        `Output directory is not empty: ${outputRoot}. Use --force only with explicit authorization.`,
      );
    }
  }

  const config = CertificateManifestSchema.parse(readJson(inputPath));
  const template = readFileSync(TEMPLATE_PATH, 'utf8');
  const htmlDir = join(outputRoot, 'html');
  const assetsDir = join(outputRoot, 'assets');
  mkdirSync(htmlDir, {recursive: true});
  const signatures = copySignatureAssets(config.signatures, dirname(inputPath), assetsDir);
  const sigMarkup = signatureCards(signatures);
  const rows = effortRows(config.effort);

  const outputs: OutputEntry[] = config.recipients.map((recipient, index) => {
    const fileName = `${String(index + 1).padStart(2, '0')}-${slugify(recipient.name)}.html`;
    const outputPath = join(htmlDir, fileName);
    const nameClass = recipient.name.length > 38 ? 'recipient-name is-long' : 'recipient-name';
    const displayLines = recipient.display_lines ?? [recipient.name];
    const html = replaceTokens(template, {
      PAGE_TITLE: escapeHtml(`${config.certificate_title} | ${config.issuer}`),
      ISSUER: escapeHtml(config.issuer),
      RAIL_LABEL: escapeHtml(config.rail_label ?? 'MetodologIA'),
      META_LABEL: escapeHtml(config.meta_label ?? 'Certificado MetodologIA'),
      ISSUE_DATE: escapeHtml(config.issue_date_display),
      CERTIFICATE_TITLE: escapeHtml(config.certificate_title),
      RECIPIENT_CLASS: nameClass,
      RECIPIENT_NAME: displayLines.map(escapeHtml).join('<br>'),
      CERTIFICATION_STATEMENT: escapeHtml(config.certification_statement),
      EFFORT_SUMMARY: escapeHtml(config.effort_summary ?? ''),
      EVIDENCE_NOTE: escapeHtml(config.evidence_note),
      LIMITATION_NOTE: escapeHtml(config.limitation_note),
      PANEL_TITLE: escapeHtml(config.panel_title ?? 'Esfuerzo formativo'),
      EFFORT_ROWS: rows,
      TOTAL_HOURS: escapeHtml(config.total_certifiable_hours),
      SIGNATURE_COUNT: String(signatures.length),
      SIGNATURES: sigMarkup,
      FOLIO: escapeHtml(recipient.folio),
    });
    writeFileSync(outputPath, html, 'utf8');
    return {
      name: recipient.name,
      display_lines: displayLines,
      folio: recipient.folio,
      file_name: fileName,
      relative_path: `html/${fileName}`,
      sha256: fileSha256(outputPath),
    };
  });

  writeIndex(outputRoot, config, outputs);

  const outputManifest = {
    package_id: config.package_id,
    generated_at: new Date().toISOString(),
    source_input: basename(inputPath),
    issuer: config.issuer,
    certificate_title: config.certificate_title,
    issue_date: config.issue_date,
    issue_date_display: config.issue_date_display,
    certification_statement: config.certification_statement,
    effort_summary: config.effort_summary,
    effort: config.effort,
    total_certifiable_hours: config.total_certifiable_hours,
    evidence_note: config.evidence_note,
    limitation_note: config.limitation_note,
    count: outputs.length,
    outputs,
    signatures: signatures.map(({name, role, asset, sha256: digest}) => ({
      name,
      role,
      asset,
      sha256: digest,
    })),
    coverage_gap: config.coverage_gap ?? [],
  };
  writeFileSync(join(outputRoot, 'manifest.json'), `${JSON.stringify(outputManifest, null, 2)}\n`, 'utf8');
  process.stdout.write(
    `${JSON.stringify({package: config.package_id, certificates: outputs.length, output: outputRoot}, null, 2)}\n`,
  );
}

try {
  main();
} catch (error) {
  process.stderr.write(`FAIL: ${(error as Error).message}\n`);
  process.exit(1);
}