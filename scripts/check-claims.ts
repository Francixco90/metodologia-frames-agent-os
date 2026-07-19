import {readFileSync} from 'node:fs';
import {resolve} from 'node:path';
import {parse} from 'yaml';
import {z} from 'zod';

const hash = z.string().regex(/^[a-f0-9]{64}$/u);
const claimSchema = z.object({
  claim_id: z.string().regex(/^CLM-[A-Z0-9-]+$/u),
  state: z.enum(['candidate', 'active', 'deprecated', 'blocked']),
  text: z.string().min(1),
  source_id: z.string().regex(/^SRC-[A-Z0-9-]+$/u),
  source_snapshot_id: z.string().min(1),
  source_lines: z.union([z.string(), z.number()]),
  source_normalized_sha256: hash,
  support: z.enum(['direct', 'qualified', 'inferred']),
  allowed_use_scope: z.string().min(1),
});

const claimRegistrySchema = z.object({
  schema_version: z.literal(1),
  registry_id: z.literal('claim-registry-v1'),
  mutation_policy: z.string().includes('append-only'),
  claims: z.array(claimSchema).min(1),
});

const sourceRegistrySchema = z.object({
  entries: z.array(
    z.object({
      source_id: z.string(),
      snapshot_id: z.string().optional(),
      current_state: z.string(),
      hashes: z.object({normalized_sha256: hash.nullable()}),
    }),
  ),
});

const root = process.cwd();
const claims = claimRegistrySchema.parse(
  parse(readFileSync(resolve(root, 'registries/claims/claim-registry.yml'), 'utf8')),
);
const sources = sourceRegistrySchema.parse(
  parse(readFileSync(resolve(root, 'registries/sources/source-registry.yml'), 'utf8')),
);
const sourceById = new Map(sources.entries.map((source) => [source.source_id, source]));
const errors: string[] = [];
const claimIds = new Set<string>();

for (const claim of claims.claims) {
  if (claimIds.has(claim.claim_id)) errors.push(`claim_id duplicado: ${claim.claim_id}`);
  claimIds.add(claim.claim_id);
  const source = sourceById.get(claim.source_id);
  if (source === undefined) {
    errors.push(`${claim.claim_id}: source_id inexistente ${claim.source_id}`);
    continue;
  }
  if (claim.state === 'active' && source.current_state !== 'active') {
    errors.push(`${claim.claim_id}: claim activo sobre fuente ${source.current_state}`);
  }
  if (source.snapshot_id !== claim.source_snapshot_id) {
    errors.push(`${claim.claim_id}: snapshot no coincide con fuente`);
  }
  if (source.hashes.normalized_sha256 !== claim.source_normalized_sha256) {
    errors.push(`${claim.claim_id}: hash normalizado no coincide con fuente`);
  }
}

const page = JSON.parse(
  readFileSync(resolve(root, 'projects/vs-001-source-to-campaign/web/page.json'), 'utf8'),
) as {claims?: Array<{claimId?: string; sourceId?: string}>};
for (const reference of page.claims ?? []) {
  if (reference.claimId === undefined || !claimIds.has(reference.claimId)) {
    errors.push(`Web referencia claim no registrado: ${reference.claimId ?? 'undefined'}`);
  }
  const claim = claims.claims.find(({claim_id}) => claim_id === reference.claimId);
  if (claim !== undefined && claim.source_id !== reference.sourceId) {
    errors.push(`Web referencia source incorrecta para ${reference.claimId}`);
  }
}

if (errors.length > 0) {
  console.error(errors.join('\n'));
  process.exitCode = 1;
} else {
  console.info(
    `PASS CLAIMS: ${claims.claims.length} claims activos trazables y referencias Web válidas.`,
  );
}
