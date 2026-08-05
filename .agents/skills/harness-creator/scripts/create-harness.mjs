#!/usr/bin/env node
import { chmod, copyFile, mkdir, symlink, unlink } from 'node:fs/promises';
import path from 'node:path';
import {
  copyTemplate,
  detectPackageManager,
  detectProject,
  exists,
  initScriptFromCommands,
  parseArgs,
  verificationCommands,
  writeText
} from './lib/harness-utils.mjs';

const args = parseArgs(process.argv.slice(2));

if (args.help) {
  console.log(`Usage: node scripts/create-harness.mjs [--target DIR] [--agent-file AGENTS.md|CLAUDE.md] [--package-manager npm|pnpm|yarn|bun] [--force]

Creates a minimal production harness with the 7-folder taxonomy:
  00_inbox/ 01_intencion/ 10_proceso/{gates,workflows}/ 20_artefactos/ 80_estado/ 90_verificacion/ 99_archive/
  CLAUDE.md GEMINI.md AGENTS.md README.md CONSTITUTION.md
  00_inbox/{assets,prompts}/ 10_proceso/workflows/
  80_estado/{feature_list.json,progress.md,session-handoff.md} + retro symlinks at root
  90_verificacion/init.sh + retro symlink at root

Existing files are skipped unless --force is set.`);
  process.exit(0);
}

const target = path.resolve(args.target || args._[0] || process.cwd());
const agentFile = args.agentFile || 'AGENTS.md';
const force = Boolean(args.force);
const project = await detectProject(target);
project.packageManager = detectPackageManager(target, args.packageManager);
const commands = args.commands
  ? String(args.commands).split(',').map((command) => command.trim()).filter(Boolean)
  : verificationCommands(project, args.packageManager);

await mkdir(target, { recursive: true });

// 7-folder taxonomy (10_proceso has gates/ and workflows/ subfolders).
const folders = [
  '00_inbox',
  '01_intencion',
  '10_proceso',
  '10_proceso/gates',
  '10_proceso/workflows',
  '20_artefactos',
  '80_estado',
  '90_verificacion',
  '99_archive'
];
for (const folder of folders) {
  await mkdir(path.join(target, folder), { recursive: true });
}

const replacements = {
  AGENT_FILE_NAME: agentFile,
  PROJECT_PURPOSE: project.stack === 'generic'
    ? 'Project harness for reliable agent-assisted development.'
    : `Project harness for reliable agent-assisted development in a ${project.stack} codebase.`,
  VERIFICATION_COMMANDS: commands.map((command) => `- \`${command}\``).join('\n'),
  PRIMARY_VERIFICATION_COMMAND: './init.sh'
};

const results = [];

// Principal agent file: source template matches agentFile (CLAUDE.md -> CLAUDE.md, AGENTS.md -> agents.md).
const principalTemplate = agentFile === 'CLAUDE.md' ? 'CLAUDE.md' : 'agents.md';
results.push(await copyTemplate(principalTemplate, path.join(target, agentFile), replacements, { force }));

// 4 orchestration .md (additional). README and CONSTITUTION are invariant (no replacements).
const orchestrationMd = [
  { template: 'CLAUDE.md', target: 'CLAUDE.md', replacements },
  { template: 'GEMINI.md', target: 'GEMINI.md', replacements },
  { template: 'agents.md', target: 'AGENTS.md', replacements },
  { template: 'README.md', target: 'README.md', replacements: {} },
  { template: 'CONSTITUTION.md', target: 'CONSTITUTION.md', replacements: {} }
];
for (const md of orchestrationMd) {
  if (md.target === agentFile) continue; // principal already written
  results.push(await copyTemplate(md.template, path.join(target, md.target), md.replacements, { force }));
}

// Assets and prompts under 00_inbox/; workflows under 10_proceso/workflows/.
const assetFiles = ['brand.md', 'favicon.svg', 'styles.css'];
const promptFiles = ['P-01-compiler.md', 'P-02-executor.md', 'P-03-evaluator.md', 'P-04-registrar.md'];
const workflowFiles = ['workflow.schema.json', 'workflow.example.json'];
for (const name of assetFiles) {
  results.push(await copyTemplate(`assets/${name}`, path.join(target, '00_inbox', 'assets', name), {}, { force }));
}
for (const name of promptFiles) {
  results.push(await copyTemplate(`prompts/${name}`, path.join(target, '00_inbox', 'prompts', name), {}, { force }));
}
for (const name of workflowFiles) {
  results.push(await copyTemplate(`workflows/${name}`, path.join(target, '10_proceso', 'workflows', name), {}, { force }));
}

// State files live in 80_estado/ with retro symlinks at root.
const stateFiles = [
  { template: 'feature-list.json', name: 'feature_list.json' },
  { template: 'progress.md', name: 'progress.md' },
  { template: 'session-handoff.md', name: 'session-handoff.md' }
];
for (const file of stateFiles) {
  const realPath = path.join(target, '80_estado', file.name);
  results.push(await copyTemplate(file.template, realPath, {}, { force }));
  results.push(await symlinkOrCopy(realPath, path.join(target, file.name), { force }));
}

// init.sh lives in 90_verificacion/ with a retro symlink at root.
const initRealPath = path.join(target, '90_verificacion', 'init.sh');
if (force || !await exists(initRealPath)) {
  await writeText(initRealPath, initScriptFromCommands(commands));
  await chmod(initRealPath, 0o755);
  results.push({ path: initRealPath, status: 'written' });
} else {
  results.push({ path: initRealPath, status: 'skipped', reason: 'exists' });
}
results.push(await symlinkOrCopy(initRealPath, path.join(target, 'init.sh'), { force }));

console.log(`Created harness for ${target}`);
console.log(`Detected stack: ${project.stack}`);
console.log(`Verification commands:`);
for (const command of commands) {
  console.log(`  - ${command}`);
}
console.log('');
console.log(`Folders: ${folders.join(', ')}`);
console.log('');
for (const result of results) {
  console.log(`${result.status.toUpperCase()} ${path.relative(target, result.path)}${result.reason ? ` (${result.reason})` : ''}`);
}

// Symlink with fallback to copy (Windows / no permissions). Documents fallback via result.reason.
async function symlinkOrCopy(source, linkPath, { force = false } = {}) {
  const linkExists = await exists(linkPath);
  if (!force && linkExists) {
    return { path: linkPath, status: 'skipped', reason: 'exists' };
  }
  if (linkExists) {
    await unlink(linkPath); // clear stale link/file so --force re-creates a true symlink
  }
  try {
    await symlink(source, linkPath);
    return { path: linkPath, status: 'symlinked' };
  } catch {
    await copyFile(source, linkPath);
    return { path: linkPath, status: 'copied', reason: 'symlink fallback' };
  }
}
