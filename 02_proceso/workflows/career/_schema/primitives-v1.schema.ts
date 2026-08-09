import {z} from 'zod';

export const Sha256Schema = z.string().regex(/^[a-f0-9]{64}$/u, 'Expected lowercase SHA-256');
export const CareerIdSchema = z.string().regex(/^[A-Z][A-Z0-9-]{2,79}$/u);
export const PortableRefSchema = z
  .string()
  .min(1)
  .max(500)
  .refine((value) => !value.startsWith('/') && !value.split('/').includes('..'), {
    message: 'Expected a portable, repository-relative reference',
  });

export const EvidenceConfidenceSchema = z.enum([
  'verified',
  'user_confirmed',
  'inferred',
  'missing',
]);

export const CareerEffectClassSchema = z.enum([
  'read_only',
  'local_reversible',
  'external_reversible',
  'irreversible',
]);

export const CareerGateIdSchema = z
  .string()
  .regex(/^(G[0-9]{2}([A-Z_]+)?|CR_[A-Z_]+)$/u, 'Expected GNN or CR_* gate');

export const CareerWorkflowIdSchema = z.enum([
  'C00',
  'C01',
  'C02',
  'C03',
  'C04',
  'C05',
  'C06',
  'C07',
  'C08',
  'C09',
]);

export type CareerWorkflowId = z.infer<typeof CareerWorkflowIdSchema>;
