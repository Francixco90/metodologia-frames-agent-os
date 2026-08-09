import {readFileSync} from 'node:fs';
import {resolve} from 'node:path';
const id = 'skill-runtime-adapter';
const refs = ['SKILL.md','context.md','LINEAGE.yml','references/operating-contract.md','fixtures/positive/case.yml','fixtures/negative/case.yml','receipts/runtime-boundary.yml'];
const body = refs.map((ref) => readFileSync(resolve('skills', id, ref), 'utf8')).join('\n');
for (const token of [`name: ${id}`,'version: 0.1.0','lifecycle_state: active','execution_scope: local-evaluation','publication_authority: false']) if (!body.includes(token)) throw new Error(`${id}: missing ${token}`);
for (let section=1; section<=6; section+=1) if (!body.includes(`## ${section}.`)) throw new Error(`${id}: context section ${section}`);
if (/\/Users\/|\/home\/|file:\/\/|[A-Za-z]:\\Users\\/u.test(body)) throw new Error(`${id}: private locator`);
console.info(`PASS ${id}: Skill Systems H-03 package.`);
