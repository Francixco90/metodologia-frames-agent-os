import {readFileSync} from 'node:fs';
import {fail, project, projectPath, run, shaFile} from './runtime-core.mjs';

export function cleanupFilter(piece) {
  const binding = piece.sourceCleanup; const path = projectPath(binding.ref, `CLEANUP_MASK_${piece.id}`);
  if (shaFile(path) !== binding.sha256 || binding.configSha256 !== binding.sha256) fail(`CLEANUP_MASK_DRIFT_${piece.id}`);
  const mask = JSON.parse(readFileSync(path, 'utf8'));
  for (const region of mask.regions) if (region.x + region.width > mask.sourceWidth || region.y + region.height > mask.sourceHeight) fail(`CLEANUP_REGION_BOUNDS_${piece.id}`);
  const crops = mask.regions.filter((region) => region.operation === 'crop');
  if (crops.length > 1 || (crops.length && mask.regions.length > 1)) fail(`CLEANUP_CROP_COMPOSITION_${piece.id}`);
  for (const crop of crops) for (const point of crop.forbiddenPoints) if (point.x >= crop.x && point.x < crop.x + crop.width && point.y >= crop.y && point.y < crop.y + crop.height) fail(`CLEANUP_CROP_TARGET_INCLUDED_${piece.id}_${point.id}`);
  const filters = mask.regions.map((region) => region.operation === 'crop' ? `crop=w=${region.width}:h=${region.height}:x=${region.x}:y=${region.y}` : `drawbox=x=${region.x}:y=${region.y}:w=${region.width}:h=${region.height}:color=0x${region.fillColor.slice(1)}:t=fill`);
  return {binding, mask, filter: filters.join(',')};
}

function duration(ref) {
  const value = Number(run('ffprobe', ['-v', 'error', '-show_entries', 'format=duration', '-of', 'default=nw=1:nk=1', ref], project, 'CLEANUP_DURATION').stdout.trim());
  if (!(value > 0)) fail('CLEANUP_DURATION_INVALID'); return value;
}

function stats(ref, atSeconds, crop, pieceId) {
  const result = run('ffmpeg', ['-hide_banner', '-loglevel', 'info', '-ss', String(atSeconds), '-i', ref, '-frames:v', '1', '-vf', `crop=${crop},signalstats,metadata=print`, '-f', 'null', '-'], project, `CLEANUP_VERIFY_${pieceId}`);
  const text = `${result.stdout}\n${result.stderr}`; const values = {};
  for (const key of ['YMIN', 'YMAX', 'UMIN', 'UMAX', 'VMIN', 'VMAX']) { const match = text.match(new RegExp(`lavfi\\.signalstats\\.${key}=([0-9.]+)`, 'u')); if (!match) fail(`CLEANUP_SIGNALSTATS_${pieceId}`); values[key] = Number(match[1]); }
  return {atSeconds, spans: {y: values.YMAX - values.YMIN, u: values.UMAX - values.UMIN, v: values.VMAX - values.VMIN}};
}

export function verifyCleanBody(piece, ref, cleanup) {
  const evidence = []; const seconds = duration(ref); const sampleTimes = cleanup.mask.sampleSeconds || cleanup.mask.sampleRatios.map((ratio) => ratio * seconds);
  if (sampleTimes.some((at) => at >= seconds)) fail(`CLEANUP_SAMPLE_OUT_OF_RANGE_${piece.id}`);
  for (const region of cleanup.mask.regions) {
    if (region.operation === 'crop') {
      const samples = sampleTimes.map((atSeconds) => { run('ffmpeg', ['-hide_banner', '-loglevel', 'error', '-ss', String(atSeconds), '-i', ref, '-frames:v', '1', '-f', 'null', '-'], project, `CLEANUP_CROP_SAMPLE_${piece.id}`); return {atSeconds, excludedPoints: region.forbiddenPoints.map((point) => point.id)}; });
      evidence.push({regionId: region.id, operation: 'crop', retained: {x: region.x, y: region.y, width: region.width, height: region.height}, samples}); continue;
    }
    const sx = piece.format.width / cleanup.mask.sourceWidth; const sy = piece.format.height / cleanup.mask.sourceHeight;
    const ix = Math.max(1, Math.floor(region.width * sx * 0.2)); const iy = Math.max(1, Math.floor(region.height * sy * 0.2));
    const crop = [Math.max(2, Math.floor(region.width * sx) - 2 * ix), Math.max(2, Math.floor(region.height * sy) - 2 * iy), Math.floor(region.x * sx) + ix, Math.floor(region.y * sy) + iy].join(':');
    const samples = sampleTimes.map((atSeconds) => stats(ref, atSeconds, crop, piece.id));
    if (samples.some((sample) => Object.values(sample.spans).some((span) => span > cleanup.mask.maxChannelSpan))) fail(`CLEANUP_RESIDUAL_${piece.id}_${region.id}`);
    evidence.push({regionId: region.id, operation: 'fill', crop, samples});
  }
  return {schemaVersion: cleanup.mask.schemaVersion, assetId: cleanup.binding.assetId, maskSha256: cleanup.binding.sha256, configSha256: cleanup.binding.configSha256, filterOrder: 'cleanup-before-treatment', cleanedBodySha256: shaFile(projectPath(ref, `CLEAN_BODY_${piece.id}`)), regions: evidence, pass: true};
}
