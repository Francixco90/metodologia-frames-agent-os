import {z} from 'zod';

import {CaseLongformHash as Hash, CaseLongformMaterialRef as Ref} from './case-longform-media.ts';
import {CaseLongformGraphStructureRefs} from './case-longform-graph-structure.ts';

export const CaseLongformGraphAuthoritySchema = z.strictObject({
  schema_version: z.literal('case-longform-graph-authority-v1'),
  job_id: z.string(),
  source_set_sha256: Hash,
  artifacts: CaseLongformGraphStructureRefs.extend({
    preflight: Ref,
    preview_media: Ref,
  }),
  status: z.literal('BLOCKED_PENDING_COVERAGE_CONTRACTS'),
});
export type CaseLongformGraphAuthority = z.infer<typeof CaseLongformGraphAuthoritySchema>;
