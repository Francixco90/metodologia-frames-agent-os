import {existsSync, lstatSync, mkdirSync, realpathSync} from 'node:fs';
import {dirname, isAbsolute, relative, resolve, sep} from 'node:path';

export function anchoredPath({project, projectReal, ref, label, fail, network, privateRules}) {
  const parts = typeof ref === 'string' ? ref.split(/[/\\]/u) : [];
  if (!ref || typeof ref !== 'string' || isAbsolute(ref) || parts.includes('..') || ref.includes('\0') || network.test(ref)) fail(`UNSAFE_${label} ${ref}`);
  if (privateRules.some((pattern) => pattern.test(ref))) fail(`PRIVATE_${label} ${ref}`);
  const path = resolve(project, ref); const rel = relative(project, path);
  if (!rel || rel === '..' || rel.startsWith(`..${sep}`) || isAbsolute(rel)) fail(`OUTSIDE_PROJECT_${label} ${ref}`);
  let cursor = project;
  for (const part of rel.split(sep).filter(Boolean)) {
    cursor = resolve(cursor, part);
    if (existsSync(cursor) && lstatSync(cursor).isSymbolicLink()) fail(`SYMLINK_${label} ${ref}`);
  }
  let anchor = path; while (!existsSync(anchor)) anchor = dirname(anchor);
  const physicalRel = relative(projectReal, realpathSync(anchor));
  if (physicalRel === '..' || physicalRel.startsWith(`..${sep}`) || isAbsolute(physicalRel)) fail(`OUTSIDE_PROJECT_${label} ${ref}`);
  return path;
}

export function trustAnchors({projectRef, stateRef, fail, network, privateRules}) {
  const project = resolve(projectRef); const projectReal = realpathSync(project);
  const options = {project, projectReal, fail, network, privateRules};
  const statePath = anchoredPath({...options, ref: stateRef, label: 'STATE_REF'});
  let runtimeDir = anchoredPath({...options, ref: '.frames-video', label: 'RUNTIME'});
  if (!existsSync(runtimeDir)) mkdirSync(runtimeDir);
  runtimeDir = anchoredPath({...options, ref: '.frames-video', label: 'RUNTIME'});
  return {project, projectReal, statePath, runtimeDir};
}
