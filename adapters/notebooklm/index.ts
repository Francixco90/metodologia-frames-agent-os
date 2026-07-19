import {z} from 'zod';

import {
  NotebookWorkUnitDeclarationSchema,
  type NotebookWorkUnitDeclaration,
} from '../../core/contracts/index.ts';

const sha256Schema = z.string().regex(/^[a-f0-9]{64}$/u);

const coverageSchema = z
  .strictObject({
    sourceCount: z.number().int().nonnegative(),
    citedSourceCount: z.number().int().nonnegative(),
    coverageDigest: sha256Schema,
    observedAt: z.iso.datetime({offset: true}),
  })
  .superRefine(({citedSourceCount, sourceCount}, context) => {
    if (citedSourceCount > sourceCount) {
      context.addIssue({
        code: 'custom',
        message: 'citedSourceCount cannot exceed sourceCount',
        path: ['citedSourceCount'],
      });
    }
  });

export const notebookBindingSchema = z.discriminatedUnion('mode', [
  z.strictObject({
    mode: z.literal('digest'),
    bindingDigest: sha256Schema,
    coverage: coverageSchema,
    locatorMaterialPresent: z.literal(false),
  }),
  z.strictObject({
    mode: z.literal('none'),
    reasonCode: z.string().min(1),
    locatorMaterialPresent: z.literal(false),
  }),
]);

const emptyClaimIdsSchema = z.array(z.string().min(1)).max(0).default([]);
const mappedClaimIdsSchema = z.array(z.string().min(1)).min(1);

export const groundingRequestSchema = z.discriminatedUnion('operation', [
  z.strictObject({
    operation: z.literal('resolve_binding_status'),
    binding: notebookBindingSchema,
    claimIds: emptyClaimIdsSchema,
  }),
  z.strictObject({
    operation: z.literal('read_metadata_digest'),
    binding: notebookBindingSchema,
    claimIds: emptyClaimIdsSchema,
  }),
  z.strictObject({
    operation: z.literal('read_coverage_digest'),
    binding: notebookBindingSchema,
    claimIds: emptyClaimIdsSchema,
  }),
  z.strictObject({
    operation: z.literal('query_grounding'),
    binding: notebookBindingSchema,
    claimIds: mappedClaimIdsSchema,
  }),
]);

export type NotebookBinding = z.infer<typeof notebookBindingSchema>;
export type GroundingRequest = z.infer<typeof groundingRequestSchema>;

export const validateNotebookWorkUnitDeclaration = (input: unknown): NotebookWorkUnitDeclaration =>
  NotebookWorkUnitDeclarationSchema.parse(input);

export type GroundingResult =
  | {
      status: 'blocked';
      bindingMode: 'none';
      coverageStatus: 'unavailable';
      evidence: [];
      errorCode: 'NOTEBOOK_BINDING_NONE';
      reasonCode: string;
    }
  | {
      status: 'partial';
      bindingMode: 'digest';
      coverageStatus: 'declared_not_queried';
      evidence: [];
      bindingDigest: string;
    };

export const prepareReadOnlyGrounding = (input: unknown): GroundingResult => {
  const request = groundingRequestSchema.parse(input);
  if (request.binding.mode === 'none') {
    return {
      status: 'blocked',
      bindingMode: 'none',
      coverageStatus: 'unavailable',
      evidence: [],
      errorCode: 'NOTEBOOK_BINDING_NONE',
      reasonCode: request.binding.reasonCode,
    };
  }

  return {
    status: 'partial',
    bindingMode: 'digest',
    coverageStatus: 'declared_not_queried',
    evidence: [],
    bindingDigest: request.binding.bindingDigest,
  };
};
