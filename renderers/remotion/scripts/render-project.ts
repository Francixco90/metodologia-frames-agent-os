import {execFileSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import {mkdirSync, readFileSync} from 'node:fs';
import {resolve} from 'node:path';
import YAML from 'yaml';

import {
  validationTestReportSchema,
  verifyValidationCommandEvidenceBinding,
} from '../src/validation-evidence.ts';

const root = process.cwd();
const projectRelative = 'projects/vs-001-source-to-campaign/remotion';
const entry = 'renderers/remotion/src/index.ts';
const composition = 'MethodologiaVertical';
const props = `${projectRelative}/05-input-props.json`;
const mediaRoot = `${projectRelative}/receipts/media`;
const shotsRoot = `${projectRelative}/review-shots`;
const validationReportPath = `${projectRelative}/receipts/test-report.json`;
const sha256 = (value: Uint8Array | string): string =>
  createHash('sha256').update(value).digest('hex');
const validationReport = validationTestReportSchema.parse(
  JSON.parse(readFileSync(resolve(root, validationReportPath), 'utf8')),
);
if (
  validationReport.status !== 'PASS' ||
  validationReport.technical_validation_state !== 'BUILD_VALIDATED'
) {
  throw new Error('Render requires a passing BUILD_VALIDATED test report.');
}
for (const input of validationReport.source_files) {
  const observed = sha256(readFileSync(resolve(root, input.path)));
  if (observed !== input.sha256) {
    throw new Error(`Validated input changed before render: ${input.path}.`);
  }
}
for (const commandResult of validationReport.commands) {
  const evidenceText = readFileSync(resolve(root, commandResult.evidenceRef), 'utf8');
  verifyValidationCommandEvidenceBinding(commandResult, evidenceText);
}
const beatMap = YAML.parse(
  readFileSync(resolve(root, `${projectRelative}/02-beat-map.yml`), 'utf8'),
) as {
  timing: {duration_in_frames: number};
  beats: Array<{from_frame: number; to_frame: number}>;
  transitions: Array<{
    review_frames: {pre: number; during: number; post: number};
  }>;
};

mkdirSync(resolve(root, mediaRoot), {recursive: true});
mkdirSync(resolve(root, shotsRoot), {recursive: true});

const runRemotion = (args: readonly string[]): void => {
  execFileSync('pnpm', ['exec', 'remotion', ...args], {
    cwd: root,
    encoding: 'utf8',
    stdio: 'inherit',
  });
};

const commonRenderArgs = [
  '--props',
  props,
  '--codec',
  'h264',
  '--pixel-format',
  'yuv420p',
  '--image-format',
  'png',
  '--color-space',
  'bt709',
  '--muted',
  '--enforce-audio-track=false',
  '--concurrency',
  '1',
  '--log',
  'verbose',
] as const;

runRemotion([
  'still',
  entry,
  'NetworkGuardProbe',
  `${projectRelative}/receipts/runtime-network-denied.png`,
  '--frame',
  '0',
  '--log',
  'verbose',
]);
runRemotion([
  'render',
  entry,
  composition,
  `${mediaRoot}/vs-001-smoke.mp4`,
  ...commonRenderArgs,
  '--frames',
  '0-89',
  '--scale',
  '0.25',
]);
runRemotion([
  'render',
  entry,
  composition,
  `${mediaRoot}/vs-001-review-a.mp4`,
  ...commonRenderArgs,
]);
runRemotion([
  'render',
  entry,
  composition,
  `${mediaRoot}/vs-001-review-b.mp4`,
  ...commonRenderArgs,
]);

const stills = [
  {name: '00-first', frame: 0},
  ...beatMap.transitions.flatMap(({review_frames: reviewFrames}, index) =>
    (['pre', 'during', 'post'] as const).map((phase) => ({
      name: `${String(index + 1).padStart(2, '0')}-${phase}`,
      frame: reviewFrames[phase],
    })),
  ),
  ...beatMap.beats.map((beat, index) => ({
    name: `beat-${String(index + 1).padStart(2, '0')}-mid`,
    frame: beat.from_frame + Math.floor((beat.to_frame - beat.from_frame) / 2),
  })),
  {name: '99-last', frame: beatMap.timing.duration_in_frames - 1},
];

for (const still of stills) {
  runRemotion([
    'still',
    entry,
    composition,
    `${shotsRoot}/${still.name}-f${still.frame}.png`,
    '--frame',
    String(still.frame),
    '--props',
    props,
    '--log',
    'verbose',
  ]);
}

execFileSync(
  'ffmpeg',
  [
    '-v',
    'error',
    '-pattern_type',
    'glob',
    '-i',
    `${shotsRoot}/*-f*.png`,
    '-vf',
    'scale=216:384:force_original_aspect_ratio=decrease,pad=216:384:(ow-iw)/2:(oh-ih)/2:color=black,tile=5x6:padding=8:margin=8',
    '-frames:v',
    '1',
    '-y',
    `${shotsRoot}/contact-sheet.png`,
  ],
  {cwd: root, encoding: 'utf8', stdio: 'inherit'},
);

console.info(
  `Rendered network probe, low-resolution smoke, two full reviews, ${stills.length} review shots and contact sheet for ${composition}.`,
);
