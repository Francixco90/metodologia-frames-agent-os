import {createHash} from 'node:crypto';
import {mkdir, mkdtemp, rm, writeFile} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {describe, expect, it} from 'vitest';

import {CareerCvPackageV2Schema} from 'workflows/career/_schema/index.ts';
import {
  publishReadyCvPackage,
  verifyAndPromoteCvPackageToReady,
} from 'workflows/career/_runner/cv-package-promotion.ts';
import {calculateEvidenceBankHash} from 'workflows/career/_runner/evidence-gate.ts';
import {
  approveCvSpec,
  calculateCareerCvPackageV2Hash,
  createCvSpec,
  migrateCareerCvV1ToV2,
} from 'workflows/career/_runner/cv-spec.ts';
import {renderCareerCvAtsHtml} from 'workflows/career/_runner/document-renderer.ts';
import {calculateCareerDocumentHash} from 'workflows/career/_runner/document-model.ts';
import {verifyCareerCvPackageArtifacts} from 'workflows/career/_runner/cv-package-verifier.ts';
import {buildApprovedGeneralSpec, buildLegacyCv, HASH_A} from './career-cv-spec-fixtures.ts';

const sha256 = (bytes: Buffer) => createHash('sha256').update(bytes).digest('hex');
const visibleHtmlText = (bytes: Buffer): string =>
  bytes
    .toString('utf8')
    .replaceAll(/<(?:script|style)[^>]*>[\s\S]*?<\/(?:script|style)>/giu, ' ')
    .replaceAll(/<[^>]+>/gu, ' ')
    .replaceAll('&amp;', '&')
    .replaceAll(/\s+/gu, ' ');

describe('CV Spec-First package lifecycle', () => {
  it('re-verifies material outputs before READY and again before PUBLISHED', async () => {
    const approved = buildApprovedGeneralSpec();
    const {spec_sha256: ignoredHash, approval: ignoredApproval, ...draft} = approved;
    void ignoredHash;
    void ignoredApproval;
    const item = {
      evidence_id: 'EVD-RESULT-001',
      claim: 'Evidencia sintética.',
      context: 'Contexto sintético.',
      action_method: 'Método verificable.',
      result: 'Resultado verificable.',
      metric: null,
      source_ref: 'work/private/career/evidence.md',
      source_sha256: HASH_A,
      confidence: 'verified' as const,
      allowed_channels: ['cv'],
      constraints: [],
    };
    const bankDraft = {
      schema_version: 'evidence-bank-v1' as const,
      candidate_id: approved.candidate_id,
      evidence: [item],
      bank_sha256: HASH_A,
    };
    const bank = {...bankDraft, bank_sha256: calculateEvidenceBankHash(bankDraft)};
    const spec = approveCvSpec(
      createCvSpec({
        ...draft,
        evidence_bank_sha256: bank.bank_sha256,
        variants: [{...draft.variants[0]!, output_kinds: ['ats-html']}],
        state: 'DRAFT',
        approval: null,
      }),
      {approver_ref: 'H01', approved_at: '2026-08-11T11:10:00-05:00'},
    );
    const cv = migrateCareerCvV1ToV2(buildLegacyCv(), spec, 'CVVAR-ATS-ES-001');
    const html = Buffer.from(renderCareerCvAtsHtml(cv, bank));
    const source = Buffer.from(JSON.stringify(cv));
    const manifest = Buffer.from('{"schema_version":"cv-source-manifest-v1"}\n');
    const projectRoot = await mkdtemp(join(tmpdir(), 'career-publish-'));
    try {
      const privateRoot = join(projectRoot, 'work/private/career');
      await mkdir(privateRoot, {recursive: true});
      await writeFile(join(privateRoot, 'manifest.json'), manifest);
      await writeFile(join(privateRoot, 'source.json'), source);
      await writeFile(join(privateRoot, 'cv.html'), html);
      const packageBase = CareerCvPackageV2Schema.parse({
        schema_version: 'cv-package-v2',
        package_id: 'CVPKG-MATERIAL-001',
        candidate_id: spec.candidate_id,
        application_id: null,
        spec_id: spec.spec_id,
        spec_sha256: spec.spec_sha256,
        evidence_bank_sha256: spec.evidence_bank_sha256,
        application_brief_sha256: null,
        job_snapshot_sha256: null,
        source_document_ref: 'work/private/career/manifest.json',
        source_document_sha256: sha256(manifest),
        contact_binding_id: spec.contact_binding.binding_id,
        variants: [
          {
            ...spec.variants[0]!,
            source_document_ref: 'work/private/career/source.json',
            source_document_sha256: sha256(source),
          },
        ],
        outputs: [
          {
            variant_id: 'CVVAR-ATS-ES-001',
            kind: 'ats-html',
            artifact_ref: 'work/private/career/cv.html',
            artifact_sha256: sha256(html),
            verification: 'UNKNOWN',
          },
        ],
        qa: {
          claims: 'UNKNOWN',
          cross_format_parity: 'UNKNOWN',
          bilingual_parity: 'UNKNOWN',
          accessibility: 'UNKNOWN',
          parseability: 'UNKNOWN',
          determinism: 'UNKNOWN',
        },
        parity_status: 'UNKNOWN',
        privacy_status: 'UNKNOWN',
        state: 'RENDERED_DRAFT',
        approved_spec_sha256: null,
        publication_receipt: null,
        package_sha256: HASH_A,
      });
      const pkg = CareerCvPackageV2Schema.parse({
        ...packageBase,
        package_sha256: calculateCareerCvPackageV2Hash(packageBase),
      });
      const verifyOptions = {
        projectRoot,
        evidenceBank: bank,
        replayArtifact: () => Promise.resolve(html),
        htmlVerifier: (bytes: Buffer) =>
          Promise.resolve({issues: [], printPageCount: 1, visibleText: visibleHtmlText(bytes)}),
      };
      const withoutBrowser = await verifyCareerCvPackageArtifacts(pkg, spec, {
        projectRoot,
        evidenceBank: bank,
        replayArtifact: () => Promise.resolve(html),
      });
      expect(withoutBrowser).toMatchObject({promotable: false, qa: {accessibility: 'UNKNOWN'}});
      expect(withoutBrowser.outputs[0]?.verification).toBe('UNKNOWN');
      const policyDraft = {...cv, audience: 'recruiter' as const, content_sha256: HASH_A};
      const policySource = {
        ...policyDraft,
        content_sha256: calculateCareerDocumentHash(policyDraft),
      };
      const policyBytes = Buffer.from(JSON.stringify(policySource));
      await writeFile(join(privateRoot, 'policy-source.json'), policyBytes);
      const policyBase = CareerCvPackageV2Schema.parse({
        ...pkg,
        variants: [
          {
            ...pkg.variants[0]!,
            source_document_ref: 'work/private/career/policy-source.json',
            source_document_sha256: sha256(policyBytes),
          },
        ],
      });
      const policyPackage = CareerCvPackageV2Schema.parse({
        ...policyBase,
        package_sha256: calculateCareerCvPackageV2Hash(policyBase),
      });
      const policyObserved = await verifyCareerCvPackageArtifacts(
        policyPackage,
        spec,
        verifyOptions,
      );
      expect(policyObserved.issues).toContain('SOURCE_VARIANT_BINDING_MISMATCH:CVVAR-ATS-ES-001');
      const alteredHtml = Buffer.from(html.toString('utf8').replace(cv.summary, 'DOM alterado'));
      await writeFile(join(privateRoot, 'altered.html'), alteredHtml);
      const alteredBase = CareerCvPackageV2Schema.parse({
        ...pkg,
        outputs: [
          {
            ...pkg.outputs[0]!,
            artifact_ref: 'work/private/career/altered.html',
            artifact_sha256: sha256(alteredHtml),
          },
        ],
      });
      const alteredPackage = CareerCvPackageV2Schema.parse({
        ...alteredBase,
        package_sha256: calculateCareerCvPackageV2Hash(alteredBase),
      });
      const altered = await verifyCareerCvPackageArtifacts(alteredPackage, spec, {
        ...verifyOptions,
        replayArtifact: () => Promise.resolve(alteredHtml),
      });
      expect(altered.promotable).toBe(false);
      expect(altered.issues).toContain('HTML_VISIBLE_DOM_PARITY_MISMATCH');
      const ready = await verifyAndPromoteCvPackageToReady(pkg, spec, verifyOptions);
      const receipt = Buffer.from('{"external":"published"}\n');
      await writeFile(join(privateRoot, 'receipt.json'), receipt);
      const published = await publishReadyCvPackage(
        ready,
        spec,
        {
          receipt_ref: 'work/private/career/receipt.json',
          receipt_sha256: sha256(receipt),
          external_event_id: 'SYNTHETIC-PUBLISH-002',
          observed_at: '2026-08-11T11:20:00-05:00',
          ready_package_sha256: ready.package_sha256,
        },
        verifyOptions,
      );
      expect(published).toMatchObject({
        state: 'PUBLISHED',
        publication_receipt: {ready_package_sha256: ready.package_sha256},
      });
      expect(published.package_sha256).not.toBe(ready.package_sha256);
    } finally {
      await rm(projectRoot, {recursive: true, force: true});
    }
  });
});
