#!/usr/bin/env node
import {
  existsSync,
  lstatSync,
  mkdirSync,
  readFileSync,
  readdirSync,
  realpathSync,
  statSync,
  writeFileSync,
} from 'node:fs';
import {join, resolve, dirname, extname, basename, isAbsolute, relative} from 'node:path';
import {fileURLToPath} from 'node:url';

import {CertificateManifestSchema, type CertificateManifest} from '../schemas/certificate-manifest';
import {escapeHtml, fileSha256, readJson, slugify} from '../../../scripts/lib/certificate-utils';
import {bindVisibleCertificationStatement} from './certification-statement-binding';

const scriptDir = dirname(fileURLToPath(import.meta.url));
const TEMPLATE_PATH = join(scriptDir, '..', 'assets', 'certificate-template-v16.html');
// Walk up to the repository root (the nearest directory holding package.json)
// so brand/registries bindings resolve through the retro root symlinks regardless
// of where the skills directory lives after the NN_slug taxonomy move.
const findRepoRoot = (start: string): string => {
  let current = start;
  for (let depth = 0; depth < 8; depth += 1) {
    if (existsSync(join(current, 'package.json'))) return current;
    const parent = dirname(current);
    if (parent === current) break;
    current = parent;
  }
  return resolve(scriptDir, '..', '..', '..', '..');
};
const repoRoot = findRepoRoot(scriptDir);
const BRAND_BINDINGS = [
  'registries/brand/brand-profile-v2.yml',
  'registries/brand/voice-profile-v2.yml',
  'brand/tokens/brand-tokens.yml',
  'brand/fonts/font-manifest.yml',
  'brand/fonts/rights-receipt.yml',
] as const;

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
    throw new Error(
      'Usage: render-certificates.ts --input <manifest.json> --output <directory> [--force]',
    );
  }
  return args as Args;
}

interface NormalizedSignature {
  name: string;
  role: string;
  asset_presentation?: 'standard' | 'invert' | undefined;
  asset_mode: 'embedded_data_uri' | 'none';
  data_uri: string | null;
  mime_type: 'image/png' | 'image/jpeg' | 'image/webp' | null;
  sha256: string | null;
}

function loadSignatureAssets(
  signatures: CertificateManifest['signatures'],
  inputDir: string,
): NormalizedSignature[] {
  return signatures.map((sig) => {
    if (!sig.asset_path) {
      return {
        ...sig,
        asset_mode: 'none',
        data_uri: null,
        mime_type: null,
        sha256: null,
      };
    }
    if (/^(https?|file|data|blob):/i.test(sig.asset_path)) {
      throw new Error(`Signature asset must be a local file path: ${sig.asset_path}`);
    }
    if (isAbsolute(sig.asset_path)) {
      throw new Error(`Signature asset path must be relative to the manifest: ${sig.asset_path}`);
    }
    const source = resolve(inputDir, sig.asset_path);
    if (!existsSync(source) || !statSync(source).isFile()) {
      throw new Error(`Signature asset not found: ${sig.asset_path}`);
    }
    const relativeSource = relative(realpathSync(inputDir), realpathSync(source));
    if (
      relativeSource.startsWith('..') ||
      isAbsolute(relativeSource) ||
      lstatSync(source).isSymbolicLink()
    ) {
      throw new Error(`Signature asset must stay inside the manifest directory: ${sig.asset_path}`);
    }
    const ext = extname(source).toLowerCase();
    if (!['.png', '.jpg', '.jpeg', '.webp'].includes(ext)) {
      throw new Error(`Unsupported signature asset type: ${ext}`);
    }
    const mimeType = ext === '.png' ? 'image/png' : ext === '.webp' ? 'image/webp' : 'image/jpeg';
    const bytes = readFileSync(source);
    return {
      ...sig,
      asset_mode: 'embedded_data_uri',
      data_uri: `data:${mimeType};base64,${bytes.toString('base64')}`,
      mime_type: mimeType,
      sha256: fileSha256(source),
    };
  });
}

function splitName(fullName: string): {nombres: string; apellidos: string} {
  const parts = fullName.trim().split(/\s+/);
  if (parts.length <= 1) {
    return {nombres: parts[0] ?? '', apellidos: ''};
  }
  if (parts.length === 2) {
    return {nombres: parts[0] ?? '', apellidos: parts[1] ?? ''};
  }
  const apellidos = parts.slice(-2).join(' ');
  const nombres = parts.slice(0, -2).join(' ');
  return {nombres, apellidos};
}

function buildCertificateDataJs(
  config: CertificateManifest,
  recipient: CertificateManifest['recipients'][number],
  signatures: NormalizedSignature[],
): string {
  const displayLines = recipient.display_lines ?? [];
  const split = splitName(recipient.name);
  const nombres = displayLines.length >= 2 ? displayLines[0]! : split.nombres;
  const apellidos = displayLines.length >= 2 ? displayLines[1]! : split.apellidos;
  const estado = config.artifact_state === 'FINAL' ? 'emitido' : 'demo';
  const fechaGrado = config.completion_date_display ?? config.issue_date_display;
  const enfoqueProfesional = config.program_focus ?? 'Método + IA';
  const ciclo = config.program_cycle ?? '';
  const sig0 = signatures[0];
  const sig1 = signatures[1];
  const data: Record<string, string> = {
    estado,
    nombres,
    apellidos,
    intensidad: String(config.total_certifiable_hours),
    fechaGrado,
    enfoqueProfesional,
    ciclo,
    firmaPrincipal: sig0?.name ?? '',
    cargoPrincipal: sig0?.role ?? '',
    cargoPrincipalSecundario: sig0 ? 'Cofundador de MetodologIA' : '',
    firmaPrincipalAsset: sig0?.data_uri ?? '',
    firmaSecundaria: sig1?.name ?? '',
    cargoSecundaria: sig1?.role ?? '',
    cargoSecundariaSecundario: sig1 ? 'Cofundador de MetodologIA' : '',
    firmaSecundariaAsset: sig1?.data_uri ?? '',
    folio: recipient.folio,
    certificationStatement: config.certification_statement,
  };
  const entries = Object.entries(data)
    .map(([key, value]) => `      ${key}: ${JSON.stringify(value)}`)
    .join(',\n');
  return `    const certificateData = Object.freeze({\n${entries},\n    });`;
}

function injectCertificateData(template: string, dataJs: string): string {
  const pattern = /const certificateData = Object\.freeze\(\{[\s\S]*?\}\);/;
  if (!pattern.test(template)) {
    throw new Error('Template does not contain a certificateData block to inject into.');
  }
  return template.replace(pattern, dataJs);
}

function activateRenderedState(html: string, artifactState: string): string {
  const templateState = artifactState === 'FINAL' ? 'emitido' : 'demo';
  return html.replace(/<body\b[^>]*>/u, (bodyTag) => {
    const withRenderStatus = /data-render-status=/u.test(bodyTag)
      ? bodyTag.replace(/data-render-status="[^"]*"/u, 'data-render-status="rendered"')
      : bodyTag.replace('<body', '<body data-render-status="rendered"');
    return withRenderStatus.replace(
      /data-template-state="(?:demo|emitido)"/u,
      `data-template-state="${templateState}"`,
    );
  });
}

function updatePageTitle(html: string, title: string): string {
  return html.replace(/<title>[^<]*<\/title>/, `<title>${escapeHtml(title)}</title>`);
}

interface OutputEntry {
  name: string;
  display_lines: string[];
  folio: string;
  file_name: string;
  relative_path: string;
  sha256: string;
}

function walkFiles(root: string, current = root): string[] {
  return readdirSync(current, {withFileTypes: true}).flatMap((entry) => {
    const absolute = join(current, entry.name);
    return entry.isDirectory()
      ? walkFiles(root, absolute)
      : [relative(root, absolute).replace(/\\/g, '/')];
  });
}

function writeIndex(outputRoot: string, config: CertificateManifest, outputs: OutputEntry[]): void {
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
  mkdirSync(htmlDir, {recursive: true});
  const signatures = loadSignatureAssets(config.signatures, dirname(inputPath));

  const outputs: OutputEntry[] = config.recipients.map((recipient, index) => {
    const fileName = `${String(index + 1).padStart(2, '0')}-${slugify(recipient.name)}.html`;
    const outputPath = join(htmlDir, fileName);
    const dataJs = buildCertificateDataJs(config, recipient, signatures);
    let html = injectCertificateData(template, dataJs);
    html = bindVisibleCertificationStatement(html, config.certification_statement);
    html = activateRenderedState(html, config.artifact_state);
    html = updatePageTitle(html, `${config.certificate_title} | ${config.issuer}`);
    writeFileSync(outputPath, html, 'utf8');
    return {
      name: recipient.name,
      display_lines: recipient.display_lines ?? [recipient.name],
      folio: recipient.folio,
      file_name: fileName,
      relative_path: `html/${fileName}`,
      sha256: fileSha256(outputPath),
    };
  });

  writeIndex(outputRoot, config, outputs);

  const brandBindings = BRAND_BINDINGS.map((path) => ({
    path,
    sha256: fileSha256(join(repoRoot, path)),
  }));
  const boundFiles = walkFiles(outputRoot)
    .filter((path) => path !== 'manifest.json')
    .sort()
    .map((path) => ({path, sha256: fileSha256(join(outputRoot, path))}));
  const outputManifest = {
    generator: {id: 'metodologia-certificate-builder', version: '0.4.1'},
    package_id: config.package_id,
    generated_at: new Date().toISOString(),
    source_input: basename(inputPath),
    artifact_state: config.artifact_state,
    hours_claim_mode: config.hours_claim_mode,
    approved_demo_sha256: config.approved_demo_sha256 ?? null,
    issuer: config.issuer,
    certificate_title: config.certificate_title,
    issue_date: config.issue_date,
    issue_date_display: config.issue_date_display,
    completion_date_display: config.completion_date_display,
    certification_statement: config.certification_statement,
    effort_summary: config.effort_summary,
    learning_areas: config.learning_areas,
    program_focus: config.program_focus ?? 'Método + IA',
    program_cycle: config.program_cycle ?? null,
    effort: config.effort,
    total_certifiable_hours: config.total_certifiable_hours,
    evidence_note: config.evidence_note,
    limitation_note: config.limitation_note,
    count: outputs.length,
    outputs,
    signatures: signatures.map(
      ({name, role, asset_presentation, asset_mode, mime_type, sha256: digest}) => ({
        name,
        role,
        asset_presentation: asset_presentation ?? 'standard',
        asset_mode,
        mime_type,
        sha256: digest,
      }),
    ),
    template_id: 'programa-empoderamiento-reconocimiento-v16',
    template_sha256: fileSha256(TEMPLATE_PATH),
    brand_bindings: brandBindings,
    file_allowlist: boundFiles.map(({path}) => path),
    files: boundFiles,
    coverage_gap: config.coverage_gap ?? [],
  };
  writeFileSync(
    join(outputRoot, 'manifest.json'),
    `${JSON.stringify(outputManifest, null, 2)}\n`,
    'utf8',
  );
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
