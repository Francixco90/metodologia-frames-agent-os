import {createHash} from 'node:crypto';
import {copyFileSync, cpSync, mkdtempSync, readFileSync, rmSync, writeFileSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {resolve} from 'node:path';
import {spawnSync} from 'node:child_process';

export function runAdversarial({SKILL_DIR, errors}) {
const cli = resolve(SKILL_DIR, 'scripts/video-cli.mjs');
const fixture = resolve(SKILL_DIR, 'fixtures/v2-positive');
const temp = mkdtempSync(resolve(tmpdir(), 'general-video-v2-'));
const cleanup = [temp];
const sha = (path) => createHash('sha256').update(readFileSync(path)).digest('hex');
const updateJson = (path, transform) => {
  const value = JSON.parse(readFileSync(path, 'utf8'));
  writeFileSync(path, `${JSON.stringify(transform(value), null, 2)}\n`);
};
try {
  cpSync(fixture, temp, {recursive: true});
  const generated = spawnSync(process.execPath, [resolve(SKILL_DIR, 'scripts/generate-synthetic-media.mjs'), '--out', temp], {encoding: 'utf8'});
  if (generated.status !== 0) errors.push(`${PREFIX}SYNTHETIC_MEDIA`);
  const repoRoot = process.cwd();
  copyFileSync(resolve(repoRoot, '03_artefactos/brand/fonts/vendor/poppins/Poppins-Regular.ttf'), resolve(temp, 'Poppins-Regular.ttf'));
  copyFileSync(resolve(repoRoot, '03_artefactos/brand/fonts/vendor/montserrat/Montserrat-VariableFont_wght.ttf'), resolve(temp, 'Montserrat-VariableFont_wght.ttf'));
  for (const command of ['ingest', 'index', 'script', 'plan', 'render', 'verify', 'package']) {
    const result = spawnSync(process.execPath, [cli, command, '--project', temp], {encoding: 'utf8'});
    if (result.status !== 0) errors.push(`${PREFIX}CLI_${command.toUpperCase()} ${(result.stderr || '').trim()}`);
  }
  const receipt = JSON.parse(readFileSync(resolve(temp, '.frames-video/render-receipt.json')));
  if (receipt.outputs.length !== 2 || receipt.outputs.some((output) => !output.measurements?.outputSha256 || !output.measurements?.pcmSha256)) errors.push(`${PREFIX}REAL_RENDER_MEASUREMENTS`);

  const hookCase = mkdtempSync(resolve(tmpdir(), 'gv-hook-')); cleanup.push(hookCase); cpSync(temp, hookCase, {recursive: true});
  updateJson(resolve(hookCase, 'piece-scripts.json'), (value) => { value.pieces[0].hook = 'Hook changed after planning'; return value; });
  updateJson(resolve(hookCase, 'workflow-state.json'), (value) => { const hash = sha(resolve(hookCase, 'piece-scripts.json')); value.scriptSha256 = hash; value.pieceScriptsSha256 = hash; return value; });
  const stale = spawnSync(process.execPath, [cli, 'render', '--project', hookCase], {encoding: 'utf8'});
  if (stale.status === 0 || !/STALE_RENDER_PLAN_(?:script|pieceScripts)Sha256/u.test(stale.stderr)) errors.push(`${PREFIX}STALE_HOOK_PLAN ${(stale.stderr || '').trim()}`);

  const networkCase = mkdtempSync(resolve(tmpdir(), 'gv-network-')); cleanup.push(networkCase); cpSync(temp, networkCase, {recursive: true});
  updateJson(resolve(networkCase, 'piece-scripts.json'), (value) => { value.pieces[0].render.args[4] = 'tcp://example.invalid/media'; return value; });
  updateJson(resolve(networkCase, 'workflow-state.json'), (value) => { const hash = sha(resolve(networkCase, 'piece-scripts.json')); value.scriptSha256 = hash; value.pieceScriptsSha256 = hash; return value; });
  spawnSync(process.execPath, [cli, 'plan', '--project', networkCase], {encoding: 'utf8'});
  const network = spawnSync(process.execPath, [cli, 'render', '--project', networkCase], {encoding: 'utf8'});
  if (network.status === 0 || !network.stderr.includes('UNSAFE_FFMPEG_ARG')) errors.push(`${PREFIX}NETWORK_PROTOCOL`);

  const abCase = mkdtempSync(resolve(tmpdir(), 'gv-ab-')); cleanup.push(abCase); cpSync(temp, abCase, {recursive: true});
  updateJson(resolve(abCase, 'ab-groups.json'), (value) => { value.groups[0].pieceIds = ['mini-a', 'missing']; value.groups[0].variants = [{pieceId: 'mini-a'}, {pieceId: 'mini-a'}]; return value; });
  updateJson(resolve(abCase, 'workflow-state.json'), (value) => { value.abTestSha256 = sha(resolve(abCase, 'ab-groups.json')); return value; });
  spawnSync(process.execPath, [cli, 'plan', '--project', abCase], {encoding: 'utf8'});
  spawnSync(process.execPath, [cli, 'render', '--project', abCase], {encoding: 'utf8'});
  const abNegative = spawnSync(process.execPath, [cli, 'verify', '--project', abCase], {encoding: 'utf8'});
  if (abNegative.status === 0 || !/shape|piece-binding/u.test(abNegative.stderr)) errors.push(`${PREFIX}AB_DISTINCT_EXISTING ${(abNegative.stderr || '').trim()}`);

  const measureCase = mkdtempSync(resolve(tmpdir(), 'gv-measure-')); cleanup.push(measureCase); cpSync(temp, measureCase, {recursive: true});
  updateJson(resolve(measureCase, '.frames-video/render-receipt.json'), (value) => { value.outputs[0].measurements.durationMs += 500; return value; });
  const measured = spawnSync(process.execPath, [cli, 'verify', '--project', measureCase], {encoding: 'utf8'});
  if (measured.status === 0 || !measured.stderr.includes('measurement-drift')) errors.push(`${PREFIX}MEASUREMENT_RECOMPUTE`);

  const captionCase = mkdtempSync(resolve(tmpdir(), 'gv-caption-')); cleanup.push(captionCase); cpSync(temp, captionCase, {recursive: true});
  updateJson(resolve(captionCase, 'captions.json'), (value) => ({...value, tampered: true}));
  const caption = spawnSync(process.execPath, [cli, 'script', '--project', captionCase], {encoding: 'utf8'});
  if (caption.status === 0 || !caption.stderr.includes('HASH_DRIFT_CAPTION')) errors.push(`${PREFIX}CAPTION_HASH`);
} finally {
  for (const path of cleanup) rmSync(path, {recursive: true, force: true});
}
}
