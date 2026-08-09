import {readFileSync} from 'node:fs';
import {resolve} from 'node:path';

const id = 'frames-local-extension-foundry';
const base = `skills/${id}`;
const required = [
  'SKILL.md',
  'context.md',
  'LINEAGE.yml',
  'references/operating-contract.md',
  'receipts/runtime-boundary.yml',
  'fixtures/positive/create-local-skill.yml',
  'fixtures/negative/reject-local-override.yml',
];
const docs = required.map((ref) => readFileSync(resolve(base, ref), 'utf8'));
const all = docs.join('\n');
for (const token of [
  `name: ${id}`,
  'version: 0.1.0',
  'lifecycle_state: active',
  'execution_scope: local-evaluation',
  'LX_BRIEF_APPROVED',
  'VALIDATED_NOT_RUNNABLE',
  'CANONICAL_OVERRIDE_FORBIDDEN',
  'network_allowed: false',
  'publication_authority: false',
]) {
  if (!all.includes(token)) throw new Error(`${id}: missing ${token}`);
}
for (let section = 1; section <= 6; section += 1) {
  if (!docs[1].includes(`## ${section}.`)) throw new Error(`${id}: context section ${section}`);
}
if (/\/Users\/|\/home\/|file:\/\/|[A-Za-z]:\\Users\\/u.test(all)) {
  throw new Error(`${id}: private locator`);
}
console.info(`PASS ${id}: brief-first private extensions with canonical precedence.`);
