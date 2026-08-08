import {readFileSync} from 'node:fs';
import {resolve} from 'node:path';

import {parse} from 'yaml';
import {describe, expect, it} from 'vitest';

import {MultimediaWorkflowSchema} from 'workflows/multimedia/_schema/workflow-v1.schema.ts';
import {
  type TemplateRegistryEntry,
  validateTemplateAcceptanceGates,
} from '../../../scripts/check-multimedia-capabilities.ts';

const ROOT = process.cwd();
const P03 = MultimediaWorkflowSchema.parse(
  parse(
    readFileSync(
      resolve(ROOT, '02_proceso/workflows/multimedia/p03-crear-brief/workflow.yml'),
      'utf8',
    ),
  ),
);

describe('multimedia template gate integrity', () => {
  it('accepts P03 when its template is bound to the final brief approval gate', () => {
    const templates = new Map<string, TemplateRegistryEntry>([
      ['TPL-P03-DELIVERABLE-V1', {acceptance_gate: 'MW_BRIEF_APPROVED'}],
    ]);

    expect(validateTemplateAcceptanceGates(P03, templates)).toEqual([]);
  });

  it('rejects a P03 template mismatch without comparing every intermediate gate', () => {
    const templates = new Map<string, TemplateRegistryEntry>([
      ['TPL-P03-DELIVERABLE-V1', {acceptance_gate: 'G14'}],
    ]);

    expect(validateTemplateAcceptanceGates(P03, templates)).toEqual([
      'MW-CAP-07 P03: template TPL-P03-DELIVERABLE-V1 accepts at G14, expected final gate MW_BRIEF_APPROVED',
    ]);
  });
});
