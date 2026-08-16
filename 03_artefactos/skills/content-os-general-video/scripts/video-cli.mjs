#!/usr/bin/env node
import {existsSync, lstatSync, readFileSync, realpathSync} from 'node:fs';
import {isAbsolute, relative, resolve, sep} from 'node:path';

const BLOCKED = new Set(['ingest', 'index', 'script', 'render', 'package']);
const arg = (name, fallback) => {
  const at = process.argv.indexOf(`--${name}`);
  return at >= 0 ? process.argv[at + 1] : fallback;
};
const caseLongformState = () => {
  try {
    const project = realpathSync(resolve(arg('project', '.')));
    const ref = arg('state', 'workflow-state.json');
    if (!ref || isAbsolute(ref) || ref.split(/[/\\]/u).includes('..')) return false;
    const path = resolve(project, ref);
    const rel = relative(project, path);
    if (!rel || rel === '..' || rel.startsWith(`..${sep}`) || isAbsolute(rel)) return false;
    let cursor = project;
    for (const part of rel.split(sep)) {
      cursor = resolve(cursor, part);
      if (existsSync(cursor) && lstatSync(cursor).isSymbolicLink()) return false;
    }
    return JSON.parse(readFileSync(path, 'utf8')).archetype === 'case-longform';
  } catch {
    return false;
  }
};

const command = process.argv[2];
if (BLOCKED.has(command) && caseLongformState()) {
  console.error(`COSR-GV_CASE_LONGFORM_COMMAND_BLOCKED_${command}`);
  process.exit(1);
}
const {runCaseLongformBridge} = await import('./lib/runtime-case-longform.mjs');
if (!runCaseLongformBridge()) await import('./lib/video-runtime.mjs');
