import {z} from 'zod';

export const IdSchema = z.string().regex(/^[A-Za-z0-9][A-Za-z0-9._:-]{1,159}$/u);
export const SourceIdSchema = z.string().regex(/^NLS-[A-Z0-9-]+$/u);
export const TextSchema = z.string().trim().min(1).max(4_000);
export const VersionSchema = z.string().regex(/^v?\d+\.\d+(?:\.\d+)?$/u);
export const LanguageTagSchema = z.string().regex(/^[a-z]{2,3}(?:-[A-Za-z0-9]{2,8})*$/u);
export const JsonPointerSchema = z.string().regex(/^(?:\/(?:[^~/]|~[01])*)+$/u);

export const AllSourcesSentinelSchema = z
  .string()
  .transform((value) => value.trim().toUpperCase())
  .pipe(z.enum(['*', 'ALL', 'ALL-SOURCES', 'ALL_SOURCES', 'USE_ALL']));

export const ExplicitActiveSourceIdsSchema = z
  .array(SourceIdSchema)
  .min(1)
  .max(20)
  .superRefine((values, context) => {
    if (new Set(values).size !== values.length) {
      context.addIssue({code: 'custom', message: 'activeSourceIds must be unique.'});
    }
  });
