import {z} from 'zod';

export const BlueprintSectionSchema = z.strictObject({
  id: z.string().regex(/^section-[0-9]{2}$/u),
  title: z.string().min(1),
  markdown: z.string().min(1),
});

export const BlueprintModelSchema = z.strictObject({
  schema_version: z.literal('frames-experience-blueprint-v1'),
  blueprint_id: z.literal('frames-contentos-experience'),
  title: z.string().min(1),
  identity: z.literal('Frames ContentOS · por MetodologIA'),
  state: z.literal('RENDERED_DRAFT'),
  locale: z.literal('es'),
  next_gate: z.literal('RT-09'),
  sections: z.array(BlueprintSectionSchema).min(6).max(13),
});

export type BlueprintModel = z.infer<typeof BlueprintModelSchema>;

export const ProjectionManifestSchema = z.strictObject({
  schema_version: z.literal('experience-projection-manifest-v1'),
  blueprint_id: z.literal('frames-contentos-experience'),
  source_ref: z.string().min(1),
  projection_ref: z.string().min(1),
  source_sha256: z.string().regex(/^[a-f0-9]{64}$/u),
  content_sha256: z.string().regex(/^[a-f0-9]{64}$/u),
  section_count: z.number().int().min(6).max(13),
  section_order: z.array(z.string().regex(/^section-[0-9]{2}$/u)),
  design_profile: z.literal('metodologia-experience-v1'),
  typography_status: z.literal('system-fallback'),
  offline: z.literal(true),
  semantic_parity: z.literal(true),
  state: z.literal('RENDERED_DRAFT'),
  next_gate: z.literal('RT-09'),
});

export type ProjectionManifest = z.infer<typeof ProjectionManifestSchema>;

export type ParityResult = {
  ok: boolean;
  contentSha256: string;
  sectionCount: number;
  errors: string[];
};
