import {mkdirSync, readFileSync} from 'node:fs';
import {resolve} from 'node:path';
import {artifacts, fail, project, projectPath, run, runtimeDir, shaBytes, shaFile} from './runtime-core.mjs';
import {validateSchema} from './schema-validation.mjs';

const FIXED = [
  {id: 'email', re: /[\w.+-]+@[\w.-]+\.[A-Za-z]{2,}/u},
  {id: 'private-path', re: /\/(?:Users|home)\/|(?:Downloads|Documents)\//iu},
  {id: 'financial', re: /[$€£]\s?\d/u},
];

export function inspectVisual(a, piece) {
  const asset = a.assets.assets.find((item) => item.id === 'visual-detector');
  if (!asset) fail('VISUAL_DETECTOR_REQUIRED');
  const detectorPath = projectPath(asset.ref, 'VISUAL_DETECTOR');
  const detector = JSON.parse(readFileSync(detectorPath, 'utf8'));
  validateSchema('visual-detector-v1.schema.json', detector, 'VISUAL_DETECTOR', fail);
  if (shaFile(detectorPath) !== asset.sha256) fail('VISUAL_DETECTOR_HASH');
  const version = run('tesseract', ['--version'], project, 'TESSERACT_VERSION').stdout.split('\n')[0];
  if (!version.startsWith(detector.versionPrefix)) fail('VISUAL_DETECTOR_VERSION');
  const frames = [...new Set(detector.sampleRatios.map((ratio) => Math.min(piece.format.frameCount - 1, Math.floor(ratio * piece.format.frameCount))))].sort((a0, b0) => a0 - b0);
  const outDir = resolve(runtimeDir, 'visual', piece.id); mkdirSync(outDir, {recursive: true});
  const samples = frames.map((frame) => {
    const rel = `.frames-video/visual/${piece.id}/frame-${frame}.png`;
    run('ffmpeg', ['-hide_banner', '-loglevel', 'error', '-protocol_whitelist', 'file', '-i', piece.output, '-vf', `select=eq(n\\,${frame})`, '-vsync', '0', '-frames:v', '1', rel], project, `VISUAL_FRAME_${piece.id}_${frame}`);
    const path = projectPath(rel, `VISUAL_FRAME_${piece.id}_${frame}`);
    const ocr = run('tesseract', [path, 'stdout', '-l', 'eng', '--psm', '6'], project, `OCR_${piece.id}_${frame}`).stdout;
    const matches = [...FIXED.filter((rule) => rule.re.test(ocr)).map((rule) => rule.id), ...detector.forbiddenTerms.filter((term) => ocr.toLocaleLowerCase('en').includes(term.toLocaleLowerCase('en'))).map((term) => `term:${term}`)];
    const imageSha256 = shaFile(path); if (detector.forbiddenFrameSha256.includes(imageSha256)) matches.push('forbidden-frame');
    return {frame, imageSha256, ocrSha256: shaBytes(ocr), matches};
  });
  const violations = samples.flatMap((sample) => sample.matches.map((match) => `${sample.frame}:${match}`));
  return {detectorSha256: asset.sha256, engine: detector.engine, engineVersion: version, coverage: detector.coverage, samples, violations, pass: violations.length === 0};
}
