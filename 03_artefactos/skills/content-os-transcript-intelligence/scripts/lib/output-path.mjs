import {existsSync, lstatSync, realpathSync} from 'node:fs';
import {dirname, isAbsolute, relative, resolve, sep} from 'node:path';

export function resolveOutput(jobPath, ref, fail) {
  const outputRef = ref ?? 'transcript-intelligence-output';
  const parts = typeof outputRef === 'string' ? outputRef.split(/[/\\]/u) : [];
  if (!outputRef || typeof outputRef !== 'string' || isAbsolute(outputRef) || parts.includes('..')) {
    fail('UNSAFE_OUTPUT', 'portable-relative-ref-required');
  }
  const base = realpathSync(dirname(jobPath));
  const candidate = resolve(base, outputRef);
  const rel = relative(base, candidate);
  if (!rel || rel === '..' || rel.startsWith(`..${sep}`) || isAbsolute(rel)) {
    fail('UNSAFE_OUTPUT', 'outside-job-root');
  }
  let cursor = base;
  for (const part of rel.split(sep)) {
    cursor = resolve(cursor, part);
    if (existsSync(cursor) && lstatSync(cursor).isSymbolicLink()) {
      fail('UNSAFE_OUTPUT', 'symlink-component');
    }
  }
  return {dir: candidate, ref: rel.split(sep).join('/')};
}
