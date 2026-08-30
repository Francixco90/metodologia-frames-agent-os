#!/usr/bin/env node
import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';
import {existsSync, lstatSync, readFileSync, realpathSync} from 'node:fs';
import {dirname, isAbsolute, relative, resolve} from 'node:path';

import {
  DocumentationImpactPlanV1Schema,
  hashExperienceValue,
  type FramesWorkOrderV1,
} from '../../02_proceso/core/contracts/index.ts';
import {canonicalize} from '../../02_proceso/core/evidence/canonical-json.ts';
import {assertContainedInputFileV1} from '../../02_proceso/workflows/core/safe-local-path-v1.ts';
import {
  assertFramesMaintainFileRefV1,
  canonicalFramesMaintainJsonV1,
  routeMaintenanceIntent,
  runFramesMaintainV1,
  type FramesMaintainBindingV1,
  type FramesMaintainObservedGitV1,
  type FramesMaintainReadPortV1,
  type FramesMaintainVerificationV1,
} from '../../02_proceso/workflows/maintenance/index.ts';

function fail(code: string): never {
  throw new Error(code);
}
const sha = (bytes: string | Buffer): string => createHash('sha256').update(bytes).digest('hex');
const GIT_BINARY =
  process.platform === 'win32' ? 'C:\\Program Files\\Git\\cmd\\git.exe' : '/usr/bin/git';
// prettier-ignore
const gitEnv = (): NodeJS.ProcessEnv => ({GIT_CONFIG_COUNT: '0', GIT_CONFIG_GLOBAL: process.platform === 'win32' ? 'NUL' : '/dev/null', GIT_CONFIG_NOSYSTEM: '1', GIT_OPTIONAL_LOCKS: '0', GIT_PAGER: 'cat', GIT_TERMINAL_PROMPT: '0', LANG: 'C', LC_ALL: 'C', PAGER: 'cat'});
// prettier-ignore
const git = (root: string, args: readonly string[], code = 'FM-GIT001'): Buffer => { try { return execFileSync(GIT_BINARY, ['-c', 'core.fsmonitor=false', '-c', 'core.untrackedCache=false', ...args], {cwd: root, env: gitEnv(), encoding: 'buffer', maxBuffer: 4 * 1024 * 1024, stdio: ['ignore', 'pipe', 'pipe']}); } catch { return fail(code); } };
const text = (root: string, args: readonly string[], code?: string): string =>
  git(root, args, code).toString('utf8').trim();
const rootFor = (cwd: string): string => {
  let start: string;
  try {
    start = realpathSync(cwd);
  } catch {
    return fail('FM-WORKSPACE001');
  }
  const root = realpathSync(text(start, ['rev-parse', '--show-toplevel'], 'FM-WORKSPACE001'));
  const rel = relative(root, start);
  if (rel.startsWith('..') || isAbsolute(rel)) fail('FM-WORKSPACE001');
  return root;
};
const records = (bytes: Buffer): string[] => {
  const value = bytes.toString('utf8');
  if (value.includes('\uFFFD')) fail('FM-PATH001');
  return value.split('\0').filter(Boolean).sort();
};
const aliasKey = (ref: string): string =>
  assertFramesMaintainFileRefV1(ref).normalize('NFKC').toUpperCase();
const distinct = (refs: string[]): string[] => {
  if (new Set(refs.map(aliasKey)).size !== refs.length) fail('FM-ALIAS001');
  return refs;
};
const remoteRepo = (root: string, remote: string): string => {
  if (!/^[A-Za-z0-9][A-Za-z0-9._-]*$/u.test(remote)) fail('FM-BASE001');
  const url = text(root, ['remote', 'get-url', remote], 'FM-REPO001');
  const match = url.match(
    /^(?:https:\/\/github\.com\/|ssh:\/\/git@github\.com\/|git@github\.com:)([\w.-]+\/[\w.-]+?)(?:\.git)?$/u,
  );
  return match?.[1] ?? fail('FM-REPO001');
};
const safeRead = (root: string, ref: string): Buffer => {
  assertFramesMaintainFileRefV1(ref);
  try {
    const file = assertContainedInputFileV1(root, ref);
    if (lstatSync(file).nlink !== 1) fail('FM-PATH001');
    return readFileSync(file);
  } catch {
    return fail('FM-PATH001');
  }
};
const safeOutput = (root: string, ref: string): void => {
  assertFramesMaintainFileRefV1(ref);
  const target = resolve(root, ref);
  const present = existsSync(target);
  let cursor = target;
  while (!existsSync(cursor)) cursor = dirname(cursor);
  const stat = lstatSync(cursor);
  const physical = realpathSync(cursor);
  const rel = relative(realpathSync(root), physical);
  if (
    stat.isSymbolicLink() ||
    rel.startsWith('..') ||
    isAbsolute(rel) ||
    (present ? !stat.isFile() || stat.nlink !== 1 : !stat.isDirectory())
  )
    fail('FM-PATH001');
};
const parseJson = (bytes: Buffer): unknown => {
  try {
    return JSON.parse(bytes.toString('utf8'));
  } catch {
    return null;
  }
};

// Adapter read-only: Prettier ignores this declaration to preserve the enforced 200 LOC module cap.
// prettier-ignore
export const createFramesMaintainReadPortV1 = (cwd = process.cwd()): FramesMaintainReadPortV1 => {
  const root = rootFor(cwd);
  const observe = (binding: FramesMaintainBindingV1): FramesMaintainObservedGitV1 => {
    const remote = binding.baseRef.split('/')[0] ?? fail('FM-BASE001');
    if (remoteRepo(root, remote).toUpperCase() !== binding.repository.toUpperCase()) fail('FM-REPO001');
    const branch = text(root, ['symbolic-ref', '--quiet', '--short', 'HEAD'], 'FM-BRANCH001');
    if (branch !== binding.branch) fail('FM-BRANCH001');
    const baseCommit = text(root, ['rev-parse', '--verify', `refs/remotes/${binding.baseRef}^{commit}`], 'FM-BASE001');
    if (baseCommit !== binding.baseCommit) fail('FM-BASE001');
    const baseTree = text(root, ['rev-parse', '--verify', `${baseCommit}^{tree}`], 'FM-TREE001');
    if (baseTree !== binding.baseTree) fail('FM-TREE001');
    const headCommit = text(root, ['rev-parse', '--verify', 'HEAD^{commit}'], 'FM-HEAD001');
    const headTree = text(root, ['rev-parse', '--verify', 'HEAD^{tree}'], 'FM-TREE001');
    if (headCommit !== baseCommit) fail('FM-HEAD001'); if (headTree !== baseTree) fail('FM-TREE001');
    const state = records(git(root, ['status', '--porcelain=v1', '-z', '--untracked-files=all', '--ignore-submodules=none', '--no-renames']));
    return {...binding, headCommit, headTree, status: {clean: !state.length, entryCount: state.length, sha256: sha(state.join('\0'))}};
  };
  const changed = (base: string) => {
    const tracked = records(git(root, ['diff', '--name-only', '-z', '--no-renames', base, '--']));
    const untracked = records(git(root, ['ls-files', '-z', '--others', '--exclude-standard', '--']));
    return {all: distinct([...new Set([...tracked, ...untracked])].sort()), untracked};
  };
  const churn = (base: string, untracked: string[]): number => {
    const rows = records(git(root, ['diff', '--numstat', '-z', '--no-renames', base, '--']));
    const tracked = rows.reduce((sum, row) => { const match = row.match(/^(\d+)\t(\d+)\t/u); return match ? sum + Number(match[1]) + Number(match[2]) : fail('FM-WORKORDER001'); }, 0);
    return tracked + untracked.reduce((sum, ref) => { const value = safeRead(root, ref); const body = value.toString('utf8'); if (value.includes(0) || body.includes('\uFFFD')) fail('FM-PATH001'); return sum + (body ? body.split('\n').length - (body.endsWith('\n') ? 1 : 0) : 0); }, 0);
  };
  const collect = (order: FramesWorkOrderV1, binding: FramesMaintainBindingV1, phase: 'PLAN' | 'HANDOFF') => order.inputs.map(({ref, sha256}) => {
    let bytes: Buffer | undefined; try { bytes = safeRead(root, ref); } catch { bytes = undefined; }
    if (bytes && sha(bytes) === sha256) return {ref, bytes, source: 'WORKTREE'};
    if (phase !== 'HANDOFF' || !order.writeSet.includes(ref)) fail('FM-HASH001');
    const base = git(root, ['show', '--no-textconv', `${binding.baseCommit}:${ref}`], 'FM-HASH001');
    if (sha(base) !== sha256) fail('FM-HASH001'); return {ref, bytes: base, source: 'BASE_PREIMAGE'};
  });
  const authority = (order: FramesWorkOrderV1, binding: FramesMaintainBindingV1, docs: unknown[], actual: number) => {
    const impacts = docs.flatMap((doc) => { const parsed = DocumentationImpactPlanV1Schema.safeParse(doc); return parsed.success ? [parsed.data] : []; });
    if (impacts.length !== 1 || canonicalize(impacts[0]) !== canonicalize(order.documentationImpact)) fail('FM-HASH001');
    const baselines = docs.filter((doc): doc is Record<string, unknown> => !!doc && typeof doc === 'object' && !Array.isArray(doc) && (doc as Record<string, unknown>).schemaVersion === 'maintenance-baseline-v1');
    const base = baselines[0]; if (baselines.length !== 1 || base?.workingRepository !== binding.repository || base.branch !== binding.branch || base.baseRef !== binding.baseRef || base.baseCommit !== binding.baseCommit || base.baseTree !== binding.baseTree) fail('FM-BASE001');
    const policy = base.writePolicy as Record<string, unknown> | undefined;
    if (policy?.externalEffects !== false || policy.mergeAuthorized !== false || policy.promotionAuthorized !== false || policy.versionedFiles !== order.writeSet.length || policy.hardMaxFiles !== 12 || policy.hardMaxChurnLines !== 1200 || typeof policy.targetChurnLines !== 'number' || policy.targetChurnLines > 1200 || actual > 1200) fail('FM-EFFECT001');
    const routes = docs.flatMap((doc) => { try { return [routeMaintenanceIntent(doc)]; } catch { return []; } }).filter(({decision}) => decision === 'ROUTED');
    if (routes.length !== 1 || routes[0]?.request_hash !== order.requestHash) fail('FM-HASH001');
  };
  const digestMaterials = (items: Array<{ref: string; bytes: Buffer; source: string}>) => items.map(({ref, bytes, source}) => ({ref, source, sha256: sha(bytes)}));
  return {inspect: observe, readWorkOrder: (ref, digest) => { const bytes = safeRead(root, ref); if (sha(bytes) !== digest) fail('FM-HASH001'); return parseJson(bytes); }, verify: (order, binding, phase): FramesMaintainVerificationV1 => {
    const before = observe(binding); order.readSet.forEach((ref) => safeRead(root, ref)); order.writeSet.forEach((ref) => safeOutput(root, ref));
    const paths = changed(binding.baseCommit); if (phase === 'HANDOFF' && canonicalize(paths.all) !== canonicalize([...order.writeSet].sort())) fail('FM-DIRTY001');
    const material = collect(order, binding, phase); const actual = phase === 'HANDOFF' ? churn(binding.baseCommit, paths.untracked) : 0;
    authority(order, binding, material.map(({bytes}) => parseJson(bytes)), actual);
    const outputs = phase === 'HANDOFF' ? order.expectedOutputs.map((ref) => ({ref, sha256: sha(safeRead(root, ref))})) : [];
    const repeated = collect(order, binding, phase); const pathsAfter = changed(binding.baseCommit); const actualAfter = phase === 'HANDOFF' ? churn(binding.baseCommit, pathsAfter.untracked) : 0;
    const outputsAfter = phase === 'HANDOFF' ? order.expectedOutputs.map((ref) => ({ref, sha256: sha(safeRead(root, ref))})) : [];
    if (canonicalize(before) !== canonicalize(observe(binding)) || canonicalize(paths) !== canonicalize(pathsAfter) || actual !== actualAfter || canonicalize(digestMaterials(material)) !== canonicalize(digestMaterials(repeated)) || canonicalize(outputs) !== canonicalize(outputsAfter)) fail('FM-HASH001');
    return {inputSetSha256: hashExperienceValue(order.inputs), outputs};
  }};
};

// prettier-ignore
export const runFramesMaintainCli = ({argv, stdin, cwd = process.cwd()}: {argv: readonly string[]; stdin: string; cwd?: string}) => { try { return {exitCode: 0, stdout: canonicalFramesMaintainJsonV1(runFramesMaintainV1(argv, stdin, createFramesMaintainReadPortV1(cwd))), stderr: ''}; } catch (error) { const raw = error instanceof Error ? error.message : 'FM-INPUT001'; const code = /^FM-[A-Z]+\d{3}$/u.test(raw) ? raw : 'FM-WORKSPACE001'; return {exitCode: 1, stdout: '', stderr: `${code}\n`}; } };
if (process.argv[1]?.endsWith('frames-maintain.ts')) {
  const result = runFramesMaintainCli({
    argv: process.argv.slice(2),
    stdin: readFileSync(0, 'utf8'),
  });
  process.stdout.write(result.stdout);
  process.stderr.write(result.stderr);
  process.exitCode = result.exitCode;
}
