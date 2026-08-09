import {createHash} from 'node:crypto';
import {readFile} from 'node:fs/promises';

import {parse} from 'yaml';
import {describe, expect, it} from 'vitest';
import {z} from 'zod';

import {
  DualOracleReviewV1Schema,
  SkillSystemsDossierAdoptionV1Schema,
} from '../../../02_proceso/workflows/skill-systems/adoption-contracts.ts';
import {
  SkillSystemTemplateRegistryV1Schema,
  renderSkillSystemTemplateHtml,
  renderSkillSystemTemplateMarkdown,
} from '../../../02_proceso/workflows/skill-systems/generate-templates.ts';

const sha = (value: string): string => createHash('sha256').update(value).digest('hex');
const PivoteProjection = z.object({
  observed_modules: z.array(z.string()),
  validation: z.object({
    sha256sums: z.literal('PASS'),
    specops_self_test: z.literal('PASS_26_OF_26'),
    package_self_test: z.literal('BLOCKED_SKILL_ROOT_INVALID'),
  }),
});

describe('Skill Systems dossier and PIVOTE adoption', () => {
  it('reconciles all eight proposed roles without active duplicates', async () => {
    const adoption = SkillSystemsDossierAdoptionV1Schema.parse(
      parse(
        await readFile('02_proceso/workflows/skill-systems/dossier-adoption.yml', 'utf8'),
      ) as unknown,
    );
    const {reconciliation} = adoption;
    expect(reconciliation.decisions).toHaveLength(8);
    expect(
      reconciliation.decisions.find((item) => item.proposed_id === 'skill-security-auditor'),
    ).toMatchObject({
      disposition: 'ADD',
      canonical_ids: ['skill-security-auditor'],
    });
    expect(
      reconciliation.decisions.find((item) => item.proposed_id === 'skill-critical-review'),
    ).toMatchObject({
      disposition: 'REUSE',
      canonical_ids: ['skill-portfolio-governor'],
    });
    expect(new Set(reconciliation.resulting_active_ids).size).toBe(
      reconciliation.resulting_active_ids.length,
    );
  });

  it('records resources, observed validation and honest source gaps', async () => {
    const adoption = SkillSystemsDossierAdoptionV1Schema.parse(
      parse(
        await readFile('02_proceso/workflows/skill-systems/dossier-adoption.yml', 'utf8'),
      ) as unknown,
    );
    const disposition = adoption.resource_disposition;
    expect(disposition.resources.map((item) => item.resource_id)).toEqual(
      expect.arrayContaining([
        'UCC_ARTIFACT_GRAPH',
        'PROMPT_SECURITY',
        'PACKAGE_SCRIPT',
        'OUTPUT_TEMPLATES',
      ]),
    );
    expect(
      disposition.resources.find((item) => item.resource_id === 'PACKAGE_SCRIPT')?.disposition,
    ).toBe('GAP');

    const pivote = PivoteProjection.parse(
      parse(
        await readFile(
          '00_inbox/first-party/SRC-MULTIMEDIA-PIVOTE-20PLUS1-V4.projection.yml',
          'utf8',
        ),
      ) as unknown,
    );
    expect(pivote.observed_modules).toHaveLength(20);
    expect(pivote.validation).toMatchObject({
      sha256sums: 'PASS',
      specops_self_test: 'PASS_26_OF_26',
      package_self_test: 'BLOCKED_SKILL_ROOT_INVALID',
    });
    expect(JSON.stringify(pivote)).not.toMatch(/\/Users\/|file:\/\//u);
  });

  it('renders three deterministic Markdown and HTML template pairs from one model', async () => {
    const registry = SkillSystemTemplateRegistryV1Schema.parse(
      parse(
        await readFile('02_proceso/workflows/skill-systems/template-registry.yml', 'utf8'),
      ) as unknown,
    );
    expect(registry.templates).toHaveLength(3);
    for (const template of registry.templates) {
      const markdown = renderSkillSystemTemplateMarkdown(template);
      const html = renderSkillSystemTemplateHtml(template);
      expect(markdown).toBe(renderSkillSystemTemplateMarkdown(template));
      expect(html).toBe(renderSkillSystemTemplateHtml(template));
      expect(markdown.match(/^## \d+\./gmu)).toHaveLength(8);
      expect(html.match(/<section id=/gu)).toHaveLength(8);
      expect(html).toContain("default-src 'none'");
      expect(html).toContain('skill-systems-template-data');
      expect(
        await readFile(
          `02_proceso/workflows/skill-systems/templates/${template.template_id}.template.md`,
          'utf8',
        ),
      ).toBe(markdown);
      expect(
        await readFile(
          `02_proceso/workflows/skill-systems/templates/${template.template_id}.template.html`,
          'utf8',
        ),
      ).toBe(html);
    }
  });

  it('fails dual-oracle PASS when actors coincide or a conflict is unresolved', () => {
    const base = {
      schema_version: 'dual-oracle-review-v1',
      review_id: 'DOR-CASE-001',
      candidate_ref: 'work/private/candidate.json',
      candidate_sha256: sha('candidate'),
      frames_contract_refs: ['02_proceso/workflows/skill-systems/contracts.ts'],
      pivote_oracle_refs: ['00_inbox/first-party/SRC-MULTIMEDIA-PIVOTE-20PLUS1-V4.projection.yml'],
      checks: [
        {
          check_id: 'DOR-SECURITY-001',
          frames_verdict: 'PASS',
          pivote_verdict: 'FAIL',
          evidence_refs: ['work/private/evidence.json'],
          resolution: 'REVISE',
        },
      ],
      reviewer_actor_id: 'RT-09-REVIEWER',
      producer_actor_id: 'RT-07-PRODUCER',
      final_verdict: 'PASS',
    };
    expect(DualOracleReviewV1Schema.safeParse(base).success).toBe(false);
    expect(
      DualOracleReviewV1Schema.safeParse({
        ...base,
        checks: [{...base.checks[0], resolution: 'ACCEPT'}],
        reviewer_actor_id: base.producer_actor_id,
      }).success,
    ).toBe(false);
    expect(
      DualOracleReviewV1Schema.safeParse({
        ...base,
        checks: [{...base.checks[0], resolution: 'ACCEPT'}],
      }).success,
    ).toBe(true);
  });
});
