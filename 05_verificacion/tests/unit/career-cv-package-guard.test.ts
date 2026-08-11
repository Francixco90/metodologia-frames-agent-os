import {createHash} from 'node:crypto';
import {mkdir, mkdtemp, rm, writeFile} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {describe, expect, it} from 'vitest';

import {CareerCvPackageV2Schema} from 'workflows/career/_schema/index.ts';
import {publishReadyCvPackage} from 'workflows/career/_runner/cv-package-promotion.ts';
import {verifyCareerCvPackageArtifacts} from 'workflows/career/_runner/cv-package-verifier.ts';
import {
  assertCvPackageCurrent,
  calculateCareerCvPackageV2Hash,
} from 'workflows/career/_runner/cv-spec.ts';
import {buildApprovedGeneralSpec, HASH_A, HASH_B, HASH_C} from './career-cv-spec-fixtures.ts';

describe('CV Spec-First package guard', () => {
  it('blocks stale bindings, forged PASS and publication without material outputs', async () => {
    const spec = buildApprovedGeneralSpec();
    const base = CareerCvPackageV2Schema.parse({
      schema_version: 'cv-package-v2',
      package_id: 'CVPKG-SYNTHETIC-001',
      candidate_id: spec.candidate_id,
      application_id: null,
      spec_id: spec.spec_id,
      spec_sha256: spec.spec_sha256,
      evidence_bank_sha256: spec.evidence_bank_sha256,
      application_brief_sha256: null,
      job_snapshot_sha256: null,
      source_document_ref: 'work/private/career/cv-source.json',
      source_document_sha256: HASH_C,
      contact_binding_id: spec.contact_binding.binding_id,
      variants: spec.variants.map((variant) => ({
        ...variant,
        source_document_ref: `work/private/career/${variant.variant_id}.json`,
        source_document_sha256: HASH_A,
      })),
      outputs: [
        ['CVVAR-ATS-ES-001', 'ats-html', 'cv.html', HASH_A],
        ['CVVAR-ATS-ES-001', 'ats-docx', 'cv.docx', HASH_B],
        ['CVVAR-ATS-ES-001', 'ats-pdf', 'cv.pdf', HASH_C],
        ['CVVAR-EXEC-EN-001', 'executive-html', 'cv-executive.html', HASH_A],
      ].map(([variant_id, kind, name, artifact_sha256]) => ({
        variant_id,
        kind,
        artifact_ref: `work/private/career/${name}`,
        artifact_sha256,
        verification: 'PASS',
      })),
      qa: {
        claims: 'PASS',
        cross_format_parity: 'PASS',
        bilingual_parity: 'PASS',
        accessibility: 'PASS',
        parseability: 'PASS',
        determinism: 'PASS',
      },
      parity_status: 'PASS',
      privacy_status: 'PASS',
      state: 'RENDERED_DRAFT',
      approved_spec_sha256: null,
      publication_receipt: null,
      package_sha256: HASH_A,
    });
    const pkg = CareerCvPackageV2Schema.parse({
      ...base,
      package_sha256: calculateCareerCvPackageV2Hash(base),
    });
    expect(assertCvPackageCurrent(pkg, spec)).toEqual(pkg);
    expect(() => assertCvPackageCurrent(pkg, {...spec, state: 'DRAFT', approval: null})).toThrow(
      'CR_CV_SPEC_APPROVED_REQUIRED',
    );
    expect(
      CareerCvPackageV2Schema.safeParse({...pkg, outputs: pkg.outputs.slice(0, 1)}).success,
    ).toBe(false);
    expect(() => assertCvPackageCurrent(pkg, {...spec, spec_sha256: HASH_A})).toThrow(
      'CV_SPEC_HASH_MISMATCH',
    );
    expect(
      CareerCvPackageV2Schema.safeParse({...pkg, state: 'READY', approved_spec_sha256: null})
        .success,
    ).toBe(false);
    expect(
      CareerCvPackageV2Schema.safeParse({
        ...pkg,
        state: 'PUBLISHED',
        approved_spec_sha256: spec.spec_sha256,
        publication_receipt: null,
      }).success,
    ).toBe(false);

    const projectRoot = await mkdtemp(join(tmpdir(), 'career-package-'));
    try {
      const observed = await verifyCareerCvPackageArtifacts(pkg, spec, {projectRoot});
      expect(observed.promotable).toBe(false);
      expect(observed.outputs.every(({verification}) => verification === 'BLOCKED')).toBe(true);
      const readyBase = CareerCvPackageV2Schema.parse({
        ...pkg,
        state: 'READY',
        approved_spec_sha256: spec.spec_sha256,
        publication_receipt: null,
      });
      const ready = CareerCvPackageV2Schema.parse({
        ...readyBase,
        package_sha256: calculateCareerCvPackageV2Hash(readyBase),
      });
      const receipt = Buffer.from('{"external":"published"}\n');
      const receiptRef = 'work/private/career/publication-receipt.json';
      await mkdir(join(projectRoot, 'work/private/career'), {recursive: true});
      await writeFile(join(projectRoot, receiptRef), receipt);
      await expect(
        publishReadyCvPackage(
          ready,
          spec,
          {
            receipt_ref: receiptRef,
            receipt_sha256: createHash('sha256').update(receipt).digest('hex'),
            external_event_id: 'SYNTHETIC-PUBLISH-001',
            observed_at: '2026-08-11T11:00:00-05:00',
            ready_package_sha256: ready.package_sha256,
          },
          {projectRoot},
        ),
      ).rejects.toThrow('CV_PACKAGE_REVERIFY_BEFORE_PUBLISH_REQUIRED');
    } finally {
      await rm(projectRoot, {recursive: true, force: true});
    }
  });
});
