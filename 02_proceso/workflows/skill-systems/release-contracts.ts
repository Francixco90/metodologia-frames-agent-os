import {z} from 'zod';

const Id = z.string().regex(/^[A-Z][A-Z0-9_-]{2,63}$/u);
const Sha256 = z.string().regex(/^[a-f0-9]{64}$/u);

export const SkillHostProbeV1Schema = z.strictObject({
  schema_version: z.literal('skill-host-probe-v1'),
  release_id: Id,
  profile: z.enum(['Codex', 'Claude', 'Gemini', 'ChatGPT']),
  surface: z.literal('HOST_BEHAVIOR'),
  status: z.literal('PASS'),
  package_sha256: Sha256,
  network_used: z.literal(false),
  effects: z.array(z.never()).length(0),
});
