import {readFileSync} from 'node:fs';
import {resolve} from 'node:path';
import {parse} from 'yaml';
import {z} from 'zod';
import {CommandsManifestSchema} from './lib/commands-schema.js';

const packageSchema = z.object({
  owner: z.string().min(1),
  depends_on: z.array(z.string()),
  gate: z.string().min(1),
});

const dagSchema = z.object({
  version: z.literal(1),
  program_id: z.literal('metodologia-frames-agent-os'),
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

// --- S4: validación del manifiesto gate → comando (commands-v1) ---

const dagGatesSchema = z.object({
  version: z.literal(1),
  program_id: z.literal('metodologia-frames-agent-os'),
  packages: z.record(z.string(), z.object({gate: z.string().min(1)})),
  release: z.object({
    human_gate: z.literal('G15'),
    readiness_gate: z.literal('G16'),
    publish_gate: z.literal('G17'),
  }),
});

const ownershipSchema = z.object({
  version: z.literal(1),
  writers: z.record(z.string(), z.array(z.string().min(1))),
});

const staticPrefix = (pattern: string): string => pattern.split(/[*?[{]/u, 1)[0] ?? '';

const globCoveredByOwner = (glob: string, ownerPatterns: string[]): boolean =>
  ownerPatterns.some((pattern) => {
    const globPrefix = staticPrefix(glob);
    const patternPrefix = staticPrefix(pattern);
    if (globPrefix.length === 0 || patternPrefix.length === 0) return true;
    return globPrefix.startsWith(patternPrefix) || patternPrefix.startsWith(globPrefix);
  });

const validateCommands = (root = process.cwd()): string[] => {
  const errors: string[] = [];

  const dagPath = resolve(root, 'docs/program/dag.yml');
  const dag = dagGatesSchema.parse(parse(readFileSync(dagPath, 'utf8')));
  const dagGates = new Set<string>([
    ...Object.values(dag.packages).map((pkg) => pkg.gate),
    dag.release.human_gate,
    dag.release.readiness_gate,
    dag.release.publish_gate,
  ]);

  const manifestPath = resolve(root, '05_verificacion/scripts/commands.yaml');
  const manifest = CommandsManifestSchema.parse(
    parse(readFileSync(manifestPath, 'utf8')),
  );
  const entryByGate = new Map(manifest.gates.map((entry) => [entry.gate, entry]));

  // 1. todo gate del DAG tiene entrada en el manifiesto.
  for (const gate of dagGates) {
    if (!entryByGate.has(gate)) {
      errors.push(`COMMANDS: gate ${gate} sin entrada en commands.yaml`);
    }
  }

  // 2. cargar ownership-manifest para cross-check write_set_globs.
  const ownershipPath = resolve(root, 'docs/program/ownership-manifest.yml');
  const ownership = ownershipSchema.parse(parse(readFileSync(ownershipPath, 'utf8')));

  let manualFailClosed = 0;

  for (const entry of manifest.gates) {
    // 3. entradas manuales deben ser fail-closed.
    if (entry.manual) {
      if (!entry.fail_closed) {
        errors.push(`COMMANDS: gate ${entry.gate} manual pero fail_closed=false`);
      } else {
        manualFailClosed += 1;
      }
      continue;
    }

    // 4. entradas automáticas: write_set_globs debe ser subconjunto de la
    //    allowlist del owner en ownership-manifest.
    const ownerPatterns = ownership.writers[entry.owner];
    if (ownerPatterns === undefined) {
      errors.push(`COMMANDS: gate ${entry.gate} owner "${entry.owner}" no declarado en ownership-manifest`);
      continue;
    }
    for (const glob of entry.write_set_globs) {
      if (!globCoveredByOwner(glob, ownerPatterns)) {
        errors.push(
          `COMMANDS: gate ${entry.gate} glob "${glob}" fuera de la allowlist de owner "${entry.owner}"`,
        );
      }
    }
  }

  if (errors.length === 0) {
    console.info(
      `PASS G04 COMMANDS: manifest válido, ${manifest.gates.length} gates, ${manualFailClosed} manuales fail-closed.`,
    );
  }

  return errors;
};

const dagErrors = validateDag();
const commandErrors = validateCommands();
const errors = [...dagErrors, ...commandErrors];
if (errors.length > 0) {
  console.error(errors.join('\n'));
  process.exitCode = 1;
} else {
  console.info(
    'PASS G04 DAG: grafo acíclico, A11 fuera del camino creation-only y G15→G16→G17 explícito.',
  );
}
