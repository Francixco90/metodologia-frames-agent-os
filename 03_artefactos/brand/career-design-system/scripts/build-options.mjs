import {createHash} from 'node:crypto';
import {readFileSync, writeFileSync} from 'node:fs';
import {dirname, relative, resolve} from 'node:path';
import {fileURLToPath} from 'node:url';

import {parse} from 'yaml';

const scriptDir = dirname(fileURLToPath(import.meta.url));
const systemDir = resolve(scriptDir, '..');
const optionsDir = resolve(systemDir, 'options');
const brandDir = resolve(systemDir, '..');
const checkOnly = process.argv.includes('--check');
const sha256 = (bytes) => createHash('sha256').update(bytes).digest('hex');
const read = (path) => readFileSync(path);
const text = (path) => read(path).toString('utf8');
const ref = (path) => relative(optionsDir, path).replaceAll('\\', '/');
const fileRecord = (path, mediaType) => ({
  ref: ref(path),
  media_type: mediaType,
  bytes: read(path).byteLength,
  sha256: sha256(read(path)),
});

const fontFiles = {
  poppins: resolve(brandDir, 'fonts/vendor/poppins/Poppins-Bold.ttf'),
  montserrat: resolve(brandDir, 'fonts/vendor/montserrat/Montserrat-VariableFont_wght.ttf'),
};
const licenseFiles = [
  resolve(brandDir, 'fonts/vendor/poppins/OFL.txt'),
  resolve(brandDir, 'fonts/vendor/montserrat/OFL.txt'),
];
const dataUrls = {
  '{{POPPINS_BOLD_DATA_URL}}': `data:font/ttf;base64,${read(fontFiles.poppins).toString('base64')}`,
  '{{MONTSERRAT_DATA_URL}}': `data:font/ttf;base64,${read(fontFiles.montserrat).toString('base64')}`,
};
const brandTokenPath = resolve(brandDir, 'tokens/brand-tokens.yml');
const brandTokens = parse(text(brandTokenPath));
const careerPalette = brandTokens?.career;
if (
  careerPalette?.schema_version !== 'metodologia-career-palette-v1' ||
  careerPalette?.default_theme !== 'navy' ||
  careerPalette?.print_theme !== 'light'
) {
  throw new Error('Career palette authority is missing or incompatible');
}
const paletteCss = ['navy', 'light']
  .map((theme) => {
    const values = careerPalette[theme];
    const selector = theme === 'navy' ? ':root' : "html[data-theme='light']";
    return `${selector}{${Object.entries(values)
      .map(([name, value]) => `--career-option-${name.replaceAll('_', '-')}:${value}`)
      .join(';')}}`;
  })
  .join('');
dataUrls['{{CAREER_PALETTE_DATA_URL}}'] =
  `data:text/css;base64,${Buffer.from(paletteCss).toString('base64')}`;
const candidates = [
  {
    id: 'blueprint-executive',
    source: 'blueprint-executive/index.html.src',
    output: 'blueprint-executive/index.html',
  },
  {
    id: 'neo-swiss-editorial',
    source: 'neo-swiss-editorial/index.html.src',
    output: 'neo-swiss-editorial/index.html',
  },
];
const comparator = {source: 'index.html.src', output: 'index.html'};

const render = (sourceRef) => {
  let rendered = text(resolve(optionsDir, sourceRef));
  for (const [token, value] of Object.entries(dataUrls))
    rendered = rendered.replaceAll(token, value);
  if (rendered.includes('{{')) throw new Error(`Unresolved template token: ${sourceRef}`);
  if (/https?:\/\//i.test(rendered)) throw new Error(`Remote dependency forbidden: ${sourceRef}`);
  if (!rendered.includes('font-src data:'))
    throw new Error(`Embedded-font CSP missing: ${sourceRef}`);
  if (!rendered.includes("style-src 'unsafe-inline' data:"))
    throw new Error(`Embedded-palette CSP missing: ${sourceRef}`);
  return rendered;
};
const primitiveBlock = (sourceRef) => {
  const source = text(resolve(optionsDir, sourceRef));
  const match = source.match(
    /\/\* SHARED_PRIMITIVES_START \*\/([\s\S]*?)\/\* SHARED_PRIMITIVES_END \*\//,
  );
  if (!match) throw new Error(`Shared primitives missing: ${sourceRef}`);
  return match[1];
};
const primitiveHash = sha256(Buffer.from(primitiveBlock(candidates[0].source)));
for (const candidate of candidates) {
  if (sha256(Buffer.from(primitiveBlock(candidate.source))) !== primitiveHash) {
    throw new Error(`Shared primitive drift: ${candidate.id}`);
  }
}

const rendered = new Map(
  [...candidates, comparator].map((item) => [item.output, `${render(item.source).trimEnd()}\n`]),
);
const writeOrCheck = (path, value) => {
  if (checkOnly) {
    if (text(path) !== value) throw new Error(`Generated output drift: ${ref(path)}`);
  } else writeFileSync(path, value);
};
for (const [outputRef, value] of rendered) writeOrCheck(resolve(optionsDir, outputRef), value);

const recordRendered = (outputRef) => {
  const bytes = Buffer.from(rendered.get(outputRef));
  return {ref: outputRef, media_type: 'text/html', bytes: bytes.byteLength, sha256: sha256(bytes)};
};
const manifest = {
  schema_version: 'career-design-options-manifest-v1',
  package_id: 'metodologia-career-design-options-v1',
  state: 'DESIGN_OPTIONS_READY',
  candidate_type: 'shared-primitives-and-compositions',
  selection: null,
  human_approved: false,
  publication_authorized: false,
  synthetic_only: true,
  shared_primitives: {
    sha256: primitiveHash,
    identical_across_options: true,
    authority: 'candidate-only',
  },
  typography: {
    body: {family: 'Trebuchet MS', source: 'system'},
    embedded: [
      fileRecord(fontFiles.poppins, 'font/ttf'),
      fileRecord(fontFiles.montserrat, 'font/ttf'),
    ],
    licenses: licenseFiles.map((path) => fileRecord(path, 'text/plain')),
  },
  palette_authority: fileRecord(brandTokenPath, 'text/yaml'),
  options: candidates.map((item) => ({
    id: item.id,
    narrative: fileRecord(resolve(optionsDir, `${item.id}.md`), 'text/markdown'),
    preview: recordRendered(item.output),
  })),
  comparator: recordRendered(comparator.output),
  runtime: {
    engine: 'node',
    network: 'forbidden',
    command: 'node 03_artefactos/brand/career-design-system/scripts/build-options.mjs',
  },
};
const manifestText = `${JSON.stringify(manifest, null, 2)}\n`;
writeOrCheck(resolve(optionsDir, 'manifest.json'), manifestText);
const receipt = {
  schema_version: 'career-design-options-producer-receipt-v1',
  package_id: manifest.package_id,
  actor: 'design-options-producer',
  action: 'render-two-synthetic-options',
  state: manifest.state,
  manifest_ref: 'manifest.json',
  manifest_sha256: sha256(Buffer.from(manifestText)),
  checks: {
    exact_option_count: candidates.length === 2 ? 'PASS' : 'BLOCKED',
    embedded_fonts: 'PASS',
    shared_primitives_hash_equal: 'PASS',
    remote_dependencies: 'PASS',
    synthetic_only: 'PASS',
  },
  human_approved: false,
  publication_authorized: false,
  next_gate: 'HUMAN_DESIGN_SELECTION',
};
writeOrCheck(resolve(optionsDir, 'producer-receipt.json'), `${JSON.stringify(receipt, null, 2)}\n`);
console.info(`${manifest.state} ${receipt.manifest_sha256}`);
