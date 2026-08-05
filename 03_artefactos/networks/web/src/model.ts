import {z} from 'zod';

export const claimReferenceSchema = z.strictObject({
  claimId: z.string().regex(/^CLM-[A-Z0-9-]+$/u),
  sourceId: z.string().regex(/^SRC-[A-Z0-9-]+$/u),
  statement: z.string().min(1),
  status: z.enum(['supported', 'qualified', 'blocked']),
});

export const pageSectionSchema = z.strictObject({
  id: z.string().regex(/^[a-z0-9-]+$/u),
  eyebrow: z.string().min(1),
  title: z.string().min(1),
  body: z.string().min(1),
  items: z.array(z.string().min(1)).min(1),
  claimIds: z.array(z.string().regex(/^CLM-[A-Z0-9-]+$/u)).min(1),
});

export const pageModelSchema = z
  .strictObject({
    schemaVersion: z.literal(1),
    pageId: z.string().regex(/^WEB-[A-Z0-9-]+$/u),
    language: z.literal('es'),
    title: z.string().min(1),
    description: z.string().min(1).max(180),
    eyebrow: z.string().min(1),
    thesis: z.string().min(1),
    summary: z.string().min(1),
    status: z.literal('RENDERED_DRAFT'),
    sourceSnapshotId: z.string().min(1),
    deterministicTimestamp: z.iso.datetime({offset: true}),
    claims: z.array(claimReferenceSchema).min(1),
    sections: z.array(pageSectionSchema).min(3),
  })
  .superRefine(({claims, sections}, context) => {
    const claimsById = new Map(claims.map((claim) => [claim.claimId, claim]));
    if (claimsById.size !== claims.length) {
      context.addIssue({
        code: 'custom',
        message: 'Visible claim IDs must be unique.',
        path: ['claims'],
      });
    }

    for (const [sectionIndex, section] of sections.entries()) {
      const uniqueClaimIds = new Set(section.claimIds);
      if (uniqueClaimIds.size !== section.claimIds.length) {
        context.addIssue({
          code: 'custom',
          message: 'Section claim references must be unique.',
          path: ['sections', sectionIndex, 'claimIds'],
        });
      }

      for (const [claimIndex, claimId] of section.claimIds.entries()) {
        const claim = claimsById.get(claimId);
        if (claim === undefined) {
          context.addIssue({
            code: 'custom',
            message: 'Section claim reference must resolve in the page claim set.',
            path: ['sections', sectionIndex, 'claimIds', claimIndex],
          });
        } else if (claim.status === 'blocked') {
          context.addIssue({
            code: 'custom',
            message: 'Blocked claims cannot support material page sections.',
            path: ['sections', sectionIndex, 'claimIds', claimIndex],
          });
        }
      }
    }
  });

export type PageModel = z.infer<typeof pageModelSchema>;
