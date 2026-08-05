import {z} from 'zod';

import {PortableIdSchema, RelativePathSchema, Sha256Schema} from './primitives.ts';

const NonEmptyTextSchema = z.string().trim().min(1).max(1000);
const SourceIdSchema = z.string().regex(/^SRC-[A-Z0-9-]+$/u);

const NotebookWorkUnitBindingSchema = z.discriminatedUnion('mode', [
  z.strictObject({
    mode: z.literal('digest'),
    binding_digest: Sha256Schema,
    locator_material_present: z.literal(false),
  }),
  z.strictObject({
    mode: z.literal('none'),
    reason_code: NonEmptyTextSchema,
    locator_material_present: z.literal(false),
  }),
]);

const NotebookWorkUnitCoverageSchema = z.strictObject({
  status: z.enum(['coverage_gap', 'declared_not_queried', 'partial', 'grounded']),
  expected_source_ids: z.array(SourceIdSchema).min(1),
  covered_source_ids: z.array(SourceIdSchema),
  missing_source_ids: z.array(SourceIdSchema),
  evidence_refs: z.array(RelativePathSchema),
});

export const NotebookWorkUnitDeclarationSchema = z
  .strictObject({
    contract_ref: z.literal('registries/notebooks/work-unit-binding-contract.yml'),
    adapter_id: z.literal('notebooklm-grounding-readonly-v1'),
    binding_id: PortableIdSchema,
    purpose: NonEmptyTextSchema,
    question: NonEmptyTextSchema,
    binding: NotebookWorkUnitBindingSchema,
    coverage: NotebookWorkUnitCoverageSchema,
    permissions: z.strictObject({
      access_mode: z.literal('read_only'),
      mutation: z.literal('forbidden'),
      evidence_promotion: z.literal('forbidden_without_source_mapping'),
      source_locked_effect: z.literal('none'),
    }),
  })
  .superRefine(({binding, coverage}, context) => {
    const expected = new Set(coverage.expected_source_ids);
    const covered = new Set(coverage.covered_source_ids);
    const missing = new Set(coverage.missing_source_ids);

    for (const [path, values] of [
      ['expected_source_ids', coverage.expected_source_ids],
      ['covered_source_ids', coverage.covered_source_ids],
      ['missing_source_ids', coverage.missing_source_ids],
    ] as const) {
      if (new Set(values).size !== values.length) {
        context.addIssue({
          code: 'custom',
          message: `${path} cannot contain duplicates`,
          path: ['coverage', path],
        });
      }
    }

    for (const sourceId of covered) {
      if (!expected.has(sourceId)) {
        context.addIssue({
          code: 'custom',
          message: 'covered_source_ids must be a subset of expected_source_ids',
          path: ['coverage', 'covered_source_ids'],
        });
      }
      if (missing.has(sourceId)) {
        context.addIssue({
          code: 'custom',
          message: 'a source cannot be both covered and missing',
          path: ['coverage', 'missing_source_ids'],
        });
      }
    }
    for (const sourceId of missing) {
      if (!expected.has(sourceId)) {
        context.addIssue({
          code: 'custom',
          message: 'missing_source_ids must be a subset of expected_source_ids',
          path: ['coverage', 'missing_source_ids'],
        });
      }
    }
    if ([...expected].some((sourceId) => !covered.has(sourceId) && !missing.has(sourceId))) {
      context.addIssue({
        code: 'custom',
        message: 'every expected source must be classified as covered or missing',
        path: ['coverage'],
      });
    }

    if (binding.mode === 'none') {
      if (coverage.status !== 'coverage_gap') {
        context.addIssue({
          code: 'custom',
          message: 'mode none requires coverage_gap',
          path: ['coverage', 'status'],
        });
      }
      if (coverage.covered_source_ids.length > 0 || coverage.evidence_refs.length > 0) {
        context.addIssue({
          code: 'custom',
          message: 'mode none cannot claim covered sources or evidence',
          path: ['coverage'],
        });
      }
      if (missing.size !== expected.size) {
        context.addIssue({
          code: 'custom',
          message: 'mode none must classify every expected source as missing',
          path: ['coverage', 'missing_source_ids'],
        });
      }
    }

    if (coverage.status === 'grounded') {
      if (
        missing.size > 0 ||
        covered.size !== expected.size ||
        coverage.evidence_refs.length === 0
      ) {
        context.addIssue({
          code: 'custom',
          message: 'grounded coverage requires all sources covered and evidence references',
          path: ['coverage'],
        });
      }
    }
  });

export const NotebookWorkflowBindingManifestSchema = z.strictObject({
  schema_version: z.literal(1),
  workflow_id: z.enum(['WF-CORE', 'WF-WEB', 'WF-CONTENT', 'WF-ADAPTERS']),
  entrypoints: z.array(RelativePathSchema).min(1),
  notebooklm: NotebookWorkUnitDeclarationSchema,
});

export type NotebookWorkUnitDeclaration = z.infer<typeof NotebookWorkUnitDeclarationSchema>;
export type NotebookWorkflowBindingManifest = z.infer<typeof NotebookWorkflowBindingManifestSchema>;
