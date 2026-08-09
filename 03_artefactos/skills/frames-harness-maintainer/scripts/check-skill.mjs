import {readFileSync} from 'node:fs';
import {resolve} from 'node:path';

const id = 'frames-harness-maintainer';
const base = `skills/${id}`;
const required = [
  'SKILL.md',
  'context.md',
  'LINEAGE.yml',
  'references/operating-contract.md',
  'receipts/runtime-boundary.yml',
  'fixtures/positive/correct-with-docs.yml',
  'fixtures/negative/reject-undocumented-change.yml',
];
const docs = required.map((ref) => readFileSync(resolve(base, ref), 'utf8'));
const all = docs.join('\n');
for (const token of [
  `name: ${id}`,
  'version: 0.1.0',
  'lifecycle_state: active',
  'execution_scope: local-evaluation',
  'HM_CHANGE_APPROVED',
  'HM_PROMOTION_APPROVED',
  'DocumentationClosureReceiptV1',
  'DOCS_TRANSVERSAL_INCOMPLETE',
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
console.info(`PASS ${id}: governed maintenance with transversal documentation DoD.`);
