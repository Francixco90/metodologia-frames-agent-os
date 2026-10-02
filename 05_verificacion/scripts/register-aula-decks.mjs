#!/usr/bin/env node
import {createHash} from 'node:crypto';
import {readFileSync, readdirSync, statSync, writeFileSync} from 'node:fs';
import {join, relative} from 'node:path';
import {format, resolveConfig} from 'prettier';
import {parse} from 'yaml';

const hash = (data) => createHash('sha256').update(data).digest('hex');
const walk = (dir) =>
  readdirSync(dir).flatMap((name) => {
    const path = join(dir, name);
    return statSync(path).isDirectory() ? walk(path) : [path];
  });
const packageHash = (id) =>
  hash(
    walk(`skills/${id}`)
      .sort()
      .map((path) => `${hash(readFileSync(path))}  ${relative(`skills/${id}`, path)}`)
      .join('\n') + '\n',
  );
const manifest = JSON.parse(
  readFileSync('04_estado/registries/skills/aula-decks-package.json', 'utf8'),
);
const registryRef = '04_estado/registries/skills/creation-v3-skill-registry.yml';
const skillsRef = '05_verificacion/scripts/creation-v3-skills.json';
const skills = JSON.parse(readFileSync(skillsRef, 'utf8'));
let text = readFileSync(registryRef, 'utf8');
let registry = parse(text);
for (const skill of [...manifest.skills, {name: 'content-os-router'}]) {
  const previous = registry.entries.find((entry) => entry.skill_id === skill.name);
  if (!previous) throw new Error(`AULA_ENTRY_MISSING: ${skill.name}`);
  const next = {
    ...previous,
    version: skill.version ?? previous.version,
    content_sha256: hash(readFileSync(`skills/${skill.name}/SKILL.md`)),
    package_manifest_sha256: packageHash(skill.name),
  };
  if (skill.version) {
    const entry = skills.find((item) => item.id === skill.name);
    if (!entry) throw new Error(`AULA_SKILL_ENTRY_MISSING: ${skill.name}`);
    entry.version = skill.version;
    entry.registryState = previous.current_state;
    entry.scope = previous.execution_scope;
  }
  if (
    previous.version !== next.version ||
    previous.content_sha256 !== next.content_sha256 ||
    previous.package_manifest_sha256 !== next.package_manifest_sha256
  ) {
    const line = text
      .split('\n')
      .find(
        (item) =>
          item.startsWith('  - {"') &&
          JSON.parse(item.slice(4)).skill_id === skill.name &&
          JSON.parse(item.slice(4)).current_state,
      );
    if (line) text = text.replace(line, '  - ' + JSON.stringify(next));
    else if (skill.name === 'content-os-router') {
      const start = text.indexOf('  - skill_id: content-os-router\n');
      const end = text.indexOf('\n  - ', start + 5);
      if (start < 0 || end < 0) throw new Error('AULA_ROUTER_ENTRY_SHAPE_MISMATCH');
      text = text.slice(0, start) + '  - ' + JSON.stringify(next) + text.slice(end);
    } else throw new Error('AULA_OWN_ENTRY_SHAPE_MISMATCH');
    const order =
      Math.max(
        ...registry.events
          .filter((event) => event.skill_id === skill.name)
          .map((event) => event.event_order),
      ) + 1;
    text +=
      '  - ' +
      JSON.stringify({
        event_id: `EVT-AULA-${skill.name}-${String(order).padStart(3, '0')}`,
        event_order: order,
        skill_id: skill.name,
        from: previous.current_state,
        to: previous.current_state,
        actor_id: 'AULA-110-PACKAGER',
        recorded_at: new Date().toISOString(),
        decision: 'freeze_verified_local_package_successor',
        previous_version: previous.version,
        version: next.version,
        content_sha256: next.content_sha256,
        package_manifest_sha256: next.package_manifest_sha256,
      }) +
      '\n';
  }
}
writeFileSync(registryRef, text);
writeFileSync(
  skillsRef,
  await format(JSON.stringify(skills), {
    ...(await resolveConfig(skillsRef)),
    filepath: skillsRef,
  }),
);
const capabilityRef = '04_estado/registries/renderers/aula-decks-capability-v1.json';
const capability = JSON.parse(readFileSync(capabilityRef, 'utf8'));
capability.kinds = [...new Set(manifest.skills.map((item) => item.kind))];
const engineRoot = '03_artefactos/renderers/frames-aula';
capability.engineRefs = walk(engineRoot)
  .filter(
    (ref) =>
      !ref.includes('/examples/') && !ref.includes('/tests/') && !ref.includes('__pycache__'),
  )
  .filter((ref) => /\.(py|js|css|json|svg|ttf|txt)$/u.test(ref) || ref.endsWith('/LICENSE'))
  .sort()
  .map((ref) => ({ref, sha256: hash(readFileSync(ref))}));
for (const item of [...capability.engineRefs, capability.handlerRef])
  item.sha256 = hash(readFileSync(item.ref));
writeFileSync(
  capabilityRef,
  await format(JSON.stringify(capability), {
    ...(await resolveConfig(capabilityRef)),
    filepath: capabilityRef,
  }),
);
console.log('PASS Aula current views updated; previous registry events preserved.');
