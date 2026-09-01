import {z} from 'zod';

import {Sha256Schema} from '../../../../core/contracts/index.ts';

export const SourceIdSchema = z.string().regex(/^SRC-[A-Z0-9-]+$/u);
export const ClaimIdSchema = z.string().regex(/^CLM-[A-Z0-9-]+$/u);
export const NullableHashSchema = Sha256Schema.nullable();
export const NonEmptyTextSchema = z.string().trim().min(1);

export const TransitionSchema = z.strictObject({
  from: z.enum(['candidate', 'quarantined', 'evaluated', 'active', 'deprecated']).nullable(),
  to: z.enum(['candidate', 'quarantined', 'evaluated', 'active', 'deprecated']),
});
