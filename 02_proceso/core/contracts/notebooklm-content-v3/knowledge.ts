import {z} from 'zod';

import {RelativePathSchema} from '../primitives.ts';
import {
  IdSchema,
  JsonPointerSchema,
  LanguageTagSchema,
  TextSchema,
  VersionSchema,
} from './shared.ts';

export const KnowledgeDocumentLayerSchema = z.enum([
  '00 Control',
  '10 Canon',
  '20 Evidence',
  '30 Templates',
  '50 Assets',
  '60 Operations',
  '70 Pedagogy',
  '40 Golden References',
  '90 Archive',
]);

export const CanonicalKnowledgeRouteSchema = z.enum([
  'R00-GOVERN',
  'R10-BRAND',
  'R20-LEARN',
  'R30-TEACH',
  'R40-CREATE',
  'R50-RESEARCH',
  'R60-ASSET',
  'R70-STUDIO',
  'R80-AUDIT',
  'R90-ARCHIVE',
]);

export const KnowledgeDocumentMetadataV1Schema = z
  .strictObject({
    schema: z.literal('knowledge-document-metadata-v1'),
    document_id: IdSchema,
    title: TextSchema,
    version: VersionSchema,
    status: z.enum(['ACTIVE', 'REVIEW', 'SUPERSEDED', 'ARCHIVED', 'BLOCKED']),
    authority: z.enum([
      'CONTROL',
      'CANON',
      'EVIDENCE',
      'TEMPLATE',
      'REFERENCE',
      'ASSET',
      'OPERATIONAL',
      'PEDAGOGY',
    ]),
    layer: KnowledgeDocumentLayerSchema,
    language: LanguageTagSchema,
    response_locales: z.array(LanguageTagSchema).min(1),
    routes: z.array(CanonicalKnowledgeRouteSchema).min(1),
    tasks: z.array(IdSchema).min(1),
    audiences: z.array(TextSchema).min(1),
    tags: z.array(IdSchema).min(1),
    keywords: z.array(TextSchema).min(1),
    aliases: z.array(TextSchema),
    source_refs: z.array(z.string().trim().min(1)).min(1),
    rights: z.enum(['APPROVED', 'REVIEW', 'BLOCKED']),
    validity: z.strictObject({
      valid_from: z.string().date(),
      valid_until: z.string().date().nullable(),
    }),
    supersedes: z.array(IdSchema),
    related_ids: z.array(IdSchema),
    manifest_ref: RelativePathSchema,
    json_registry_ref: z.string().trim().min(1).max(512).optional(),
    json_pointer: JsonPointerSchema.optional(),
  })
  .superRefine((value, context) => {
    for (const [field, values] of [
      ['response_locales', value.response_locales],
      ['routes', value.routes],
      ['tasks', value.tasks],
      ['tags', value.tags],
      ['source_refs', value.source_refs],
      ['supersedes', value.supersedes],
      ['related_ids', value.related_ids],
    ] as const) {
      if (new Set(values).size !== values.length) {
        context.addIssue({code: 'custom', path: [field], message: `${field} must be unique.`});
      }
    }
    if (
      value.validity.valid_until !== null &&
      value.validity.valid_until < value.validity.valid_from
    ) {
      context.addIssue({
        code: 'custom',
        path: ['validity', 'valid_until'],
        message: 'valid_until cannot precede valid_from.',
      });
    }
    if (value.status === 'ACTIVE' && value.rights !== 'APPROVED') {
      context.addIssue({
        code: 'custom',
        path: ['rights'],
        message: 'ACTIVE knowledge must have APPROVED rights.',
      });
    }
    if (
      value.authority === 'TEMPLATE' &&
      (value.json_registry_ref === undefined || value.json_pointer === undefined)
    ) {
      context.addIssue({
        code: 'custom',
        message: 'TEMPLATE knowledge requires json_registry_ref and json_pointer.',
      });
    }
  });

export type KnowledgeDocumentMetadataV1 = z.infer<typeof KnowledgeDocumentMetadataV1Schema>;
