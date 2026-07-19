import {readFileSync} from 'node:fs';
import {resolve} from 'node:path';
import {z} from 'zod';

const root = process.cwd();
const skillRoot = resolve(root, 'skills/remotion-video-production');
const sha256 = z.string().regex(/^[a-f0-9]{64}$/u);
const portableMediaPathPattern =
  /^(?!\/)(?!\.\.?(?:\/|$))(?!.*\/\.\.?(?:\/|$))[A-Za-z0-9._-]+(?:\/[A-Za-z0-9._-]+)*$/u;
const profile = z.object({
  width: z.number().int().positive(),
  height: z.number().int().positive(),
  fps: z.number().int().positive(),
  durationInFrames: z.number().int().positive(),
});
const renderInput = z.object({
  requestId: z.string().min(1),
  projectId: z.string().min(1),
  requestedState: z.literal('RENDERED_DRAFT'),
  sourceSnapshot: z.object({id: z.string().min(1), normalizedSha256: sha256}),
  claimsLedgerDigest: sha256,
  assetsManifestDigest: sha256,
  profile,
  props: z.record(z.string(), z.unknown()),
  runtime: z.object({
    remotionVersion: z.literal('4.0.494'),
    zodMajor: z.literal(4),
    networkAllowed: z.literal(false),
    licenseVerdict: z.enum(['evaluation_only', 'eligible_for_requested_use']),
  }),
});
const renderOutput = z.object({
  requestId: z.string().min(1),
  status: z.literal('RENDERED_DRAFT'),
  artifactId: z.string().min(1),
  portableMediaPath: z
    .string()
    .min(1)
    .regex(portableMediaPathPattern, 'Expected a portable repository-relative media path'),
  fileSha256: sha256,
  normalizedFrameDigest: sha256,
  normalizedAudioDigest: sha256.nullable(),
  profile,
  humanReview: z.literal('pending'),
  runtimeLicenseStatus: z.enum(['unresolved', 'eligible_for_requested_use']),
  coverageGaps: z.array(z.string().min(1)),
});
const renderError = z.object({
  requestId: z.string().min(1),
  status: z.literal('blocked'),
  code: z.enum([
    'SOURCE_NOT_ACTIVE',
    'CLAIM_NOT_SUPPORTED',
    'ASSET_INVALID',
    'RIGHTS_OR_AUTHORITY_GAP',
    'RUNTIME_LICENSE_GAP',
    'VERSION_MISMATCH',
    'NONDETERMINISTIC_API',
    'OFFLINE_VIOLATION',
    'TIMELINE_INVALID',
    'AV_QA_FAILED',
    'RENDER_FAILED',
  ]),
  phase: z.enum(['preflight', 'bundle', 'render', 'av_qa', 'handoff']),
  message: z.string().min(1),
  retryable: z.boolean(),
  evidence: z.array(z.string().min(1)),
  coverageGaps: z.array(z.string().min(1)),
});

const readJson = (relativePath) =>
  JSON.parse(readFileSync(resolve(skillRoot, relativePath), 'utf8'));
const errors = [];

for (const [schema, path] of [
  [renderInput, 'fixtures/positive/render-input.json'],
  [renderOutput, 'fixtures/positive/render-output.json'],
  [renderError, 'fixtures/positive/render-error.json'],
]) {
  const result = schema.safeParse(readJson(path));
  if (!result.success) errors.push(`${path}: fixture positiva inválida`);
}

for (const [schema, path] of [
  [renderInput, 'fixtures/negative/render-input-missing-source-digest.json'],
  [renderOutput, 'fixtures/negative/render-output-ready-with-license-gap.json'],
]) {
  const result = schema.safeParse(readJson(path));
  if (result.success) errors.push(`${path}: fixture negativa fue aceptada`);
}

for (const schemaPath of [
  'schemas/render-input.schema.json',
  'schemas/render-output.schema.json',
  'schemas/render-error.schema.json',
  'schemas/video-spec.schema.json',
]) {
  const schema = readJson(schemaPath);
  if (schema.$schema !== 'https://json-schema.org/draft/2020-12/schema') {
    errors.push(`${schemaPath}: draft inesperado`);
  }
}

const publishedOutputSchema = readJson('schemas/render-output.schema.json');
const publishedPathPattern = new RegExp(
  publishedOutputSchema.properties.portableMediaPath.pattern,
  'u',
);
const positivePathCases = readJson('fixtures/positive/portable-media-paths.json');
for (const fixture of positivePathCases.cases) {
  if (!portableMediaPathPattern.test(fixture.value) || !publishedPathPattern.test(fixture.value)) {
    errors.push(`portable path positiva rechazada: ${fixture.case}`);
  }
}
const negativePathCases = readJson('fixtures/negative/portable-media-paths.json');
for (const fixture of negativePathCases.cases) {
  if (portableMediaPathPattern.test(fixture.value) || publishedPathPattern.test(fixture.value)) {
    errors.push(`portable path hostil aceptada: ${fixture.case}`);
  }
}

const bannedRules = [
  ['Math.random', /\bMath\.random\s*\(/u],
  ['random(null)', /\brandom\s*\(\s*null\s*\)/u],
  ['Date.now', /\bDate\.now\s*\(/u],
  ['new Date', /\bnew\s+Date\s*\(/u],
  ['performance.now', /\bperformance\.now\s*\(/u],
  ['setTimeout', /\bsetTimeout\s*\(/u],
  ['setInterval', /\bsetInterval\s*\(/u],
  ['requestAnimationFrame', /\brequestAnimationFrame\s*\(/u],
  ['fetch', /\bfetch\s*\(/u],
  ['CSS animation', /\banimation\s*:/u],
  ['CSS transition', /\btransition\s*:/u],
  ['GSAP ticker', /\bgsap\.ticker\b/u],
  ['D3 transition', /\.transition\s*\(/u],
  ['R3F useFrame', /\buseFrame\s*\(/u],
];
const positiveCode = readFileSync(resolve(skillRoot, 'fixtures/positive/frame-driven.tsx'), 'utf8');
for (const [name, pattern] of bannedRules) {
  if (pattern.test(positiveCode)) errors.push(`frame-driven.tsx: API prohibida ${name}`);
}
const negativeCode = readFileSync(
  resolve(skillRoot, 'fixtures/negative/banned-apis.fixture.txt'),
  'utf8',
);
for (const [name, pattern] of bannedRules) {
  if (!pattern.test(negativeCode)) errors.push(`banned fixture: no ejercita ${name}`);
}

if (errors.length > 0) {
  console.error(errors.join('\n'));
  process.exitCode = 1;
} else {
  console.info(
    `PASS REMOTION CONTRACTS: input/output/error, ${positivePathCases.cases.length} rutas portables, ${negativePathCases.cases.length} rutas hostiles y ${bannedRules.length} APIs prohibidas validadas.`,
  );
}
