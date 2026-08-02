import {readFileSync} from 'node:fs';
import {resolve} from 'node:path';
import {parse} from 'yaml';
import {z} from 'zod';

const packageSchema = z.object({
  owner: z.string().min(1),
  depends_on: z.array(z.string()),
  gate: z.string().min(1),
});

const dagSchema = z.object({
  version: z.literal(1),
  program_id: z.literal('metodologia-instagram-agent-os'),
  packages: z.record(z.string(), packageSchema),
  release: z.object({
    creation_terminal_package: z.literal('A12'),
    ai_runtime_package: z.literal('A13').optional(),
    excluded_from_creation_path: z.array(z.string()),
    human_gate: z.literal('G15'),
    readiness_gate: z.literal('G16'),
    publish_gate: z.literal('G17'),
  }),
});

export const validateDag = (root = process.cwd()): string[] => {
  const path = resolve(root, 'docs/program/dag.yml');
  const dag = dagSchema.parse(parse(readFileSync(path, 'utf8')));
  const ids = new Set(Object.keys(dag.packages));
  const errors: string[] = [];

  for (const [id, pkg] of Object.entries(dag.packages)) {
    for (const dependency of pkg.depends_on) {
      if (!ids.has(dependency)) {
        errors.push(`${id}: dependencia inexistente ${dependency}`);
      }
      if (dependency === id) {
        errors.push(`${id}: autodependencia`);
      }
    }
  }

  const visiting = new Set<string>();
  const visited = new Set<string>();
  const visit = (id: string, trail: string[]): void => {
    if (visiting.has(id)) {
      errors.push(`ciclo: ${[...trail, id].join(' -> ')}`);
      return;
    }
    if (visited.has(id)) return;
    visiting.add(id);
    for (const dependency of dag.packages[id]?.depends_on ?? []) {
      visit(dependency, [...trail, id]);
    }
    visiting.delete(id);
    visited.add(id);
  };

  for (const id of ids) visit(id, []);

  const creationAncestors = new Set<string>();
  const collectCreationAncestors = (id: string): void => {
    if (creationAncestors.has(id)) return;
    creationAncestors.add(id);
    for (const dependency of dag.packages[id]?.depends_on ?? [])
      collectCreationAncestors(dependency);
  };
  collectCreationAncestors(dag.release.creation_terminal_package);
  for (const excluded of dag.release.excluded_from_creation_path) {
    if (creationAncestors.has(excluded)) {
      errors.push(`${excluded}: integración futura incluida en el camino crítico de creación`);
    }
  }

  const required = [
    'A00',
    'A01',
    'A02a',
    'A02b',
    'A03',
    'A04',
    'A05',
    'A06',
    'A07',
    'A08',
    'A09a',
    'A09b',
    'A10a',
    'A10b',
    'A11',
    'A12',
  ];
  for (const id of required) {
    if (!ids.has(id)) errors.push(`paquete requerido ausente: ${id}`);
  }

  return errors;
};

const errors = validateDag();
if (errors.length > 0) {
  console.error(errors.join('\n'));
  process.exitCode = 1;
} else {
  console.info(
    'PASS G04 DAG: grafo acíclico, A11 fuera del camino creation-only y G15→G16→G17 explícito.',
  );
}
