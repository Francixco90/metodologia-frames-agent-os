import {z} from 'zod';

const slugPattern = /^[a-z0-9]+(?:-[a-z0-9]+)*$/u;
const datePattern = /^\d{4}-\d{2}-\d{2}$/u;

const EffortItemSchema = z.strictObject({
  label: z.string().min(1).max(120),
  hours: z.number().nonnegative().finite(),
  estimated: z.boolean().optional(),
});

const RecipientSchema = z.strictObject({
  name: z.string().min(1).max(200),
  folio: z.string().min(1).max(100),
  display_lines: z.array(z.string().min(1).max(200)).min(1).max(3).optional(),
});

const SignatureSchema = z.strictObject({
  name: z.string().min(1).max(200),
  role: z.string().min(1).max(200),
  asset_path: z.string().min(1).max(500).optional(),
});

export const CertificateManifestSchema = z
  .strictObject({
    package_id: z
      .string()
      .min(1)
      .max(120)
      .regex(slugPattern, 'package_id must be a lowercase slug'),
    issuer: z.string().min(1).max(200),
    certificate_title: z.string().min(1).max(200),
    meta_label: z.string().min(1).max(200).optional(),
    rail_label: z.string().min(1).max(200).optional(),
    issue_date: z.string().regex(datePattern, 'issue_date must be YYYY-MM-DD'),
    issue_date_display: z.string().min(1).max(200),
    certification_statement: z.string().min(1).max(420),
    effort_summary: z.string().min(1).max(400).optional(),
    effort: z.array(EffortItemSchema).min(1).max(4),
    total_certifiable_hours: z.number().nonnegative().finite(),
    evidence_note: z.string().min(1).max(400),
    limitation_note: z.string().min(1).max(400),
    panel_title: z.string().min(1).max(200).optional(),
    recipients: z.array(RecipientSchema).min(1),
    signatures: z.array(SignatureSchema).min(1).max(3),
    coverage_gap: z.array(z.string().min(1)).optional(),
  })
  .refine(
    (data) => {
      const sum = data.effort.reduce((acc, item) => acc + item.hours, 0);
      return Math.abs(sum - data.total_certifiable_hours) < 1e-9;
    },
    {
      message: 'total_certifiable_hours must equal sum of effort[].hours',
      path: ['total_certifiable_hours'],
    },
  )
  .refine(
    (data) => {
      const names = data.recipients.map((r) => r.name.toLowerCase());
      return new Set(names).size === names.length;
    },
    {message: 'recipient names must be unique', path: ['recipients']},
  )
  .refine(
    (data) => {
      const folios = data.recipients.map((r) => r.folio.toLowerCase());
      return new Set(folios).size === folios.length;
    },
    {message: 'recipient folios must be unique', path: ['recipients']},
  )
  .refine(
    (data) => {
      return data.recipients.every((r) => {
        if (!r.display_lines) return true;
        const joined = r.display_lines.join(' ').replace(/\s+/g, ' ').trim();
        return joined === r.name.replace(/\s+/g, ' ').trim();
      });
    },
    {message: 'display_lines must preserve the full recipient name', path: ['recipients']},
  );

export type CertificateManifest = z.infer<typeof CertificateManifestSchema>;