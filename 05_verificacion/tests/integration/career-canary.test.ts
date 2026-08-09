import {existsSync, mkdtempSync, readFileSync, rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {resolve} from 'node:path';

import {describe, expect, it, vi} from 'vitest';

const pdf = vi.hoisted(() => ({render: vi.fn()}));
vi.mock('workflows/career/_runner/pdf-adapter.ts', () => ({renderCareerPdf: pdf.render}));

import {CAREER_BRIEF_SECTIONS} from 'workflows/career/_schema/brief-v1.schema.ts';
import {createCareerBriefMarkdown} from 'workflows/career/_runner/brief-model.ts';
import {renderCareerBriefHtml} from 'workflows/career/_runner/brief-renderer.ts';
import {runCareerBriefFirst} from 'workflows/career/_runner/career-runner.ts';
import {runCareerCanary} from 'workflows/career/_runner/canary.ts';
import {calculateCareerDocumentHash} from 'workflows/career/_runner/document-model.ts';
import {renderCareerCvHtml} from 'workflows/career/_runner/document-renderer.ts';
import {calculateEvidenceBankHash} from 'workflows/career/_runner/evidence-gate.ts';
import {routeCareerIntent} from 'workflows/career/_runner/route-career.ts';
import {scoreCareerOpportunity} from 'workflows/career/_runner/scoring.ts';
import {transitionCareerState} from 'workflows/career/_runner/state-machine.ts';
import {prepareSubmission} from 'workflows/career/_runner/submission.ts';

const HASH_A = 'a'.repeat(64);
const HASH_B = 'b'.repeat(64);

describe('Career OS synthetic local canary', () => {
  it('runs a vague CV request brief-first and materializes MD plus HTML before its gate', () => {
    const root = mkdtempSync(resolve(tmpdir(), 'frames-career-runner-'));
    try {
      const result = runCareerBriefFirst({root, route: {request: 'Créame un CV'}});
      const markdown = resolve(root, result.brief.markdown_ref);
      const html = resolve(root, result.brief.html_ref);

      expect(result).toMatchObject({
        status: 'NEEDS_INPUT',
        materialized: true,
        next_gate: 'CR_BRIEF_APPROVED',
      });
      expect(result.intent.selected_stage_path).toEqual(['C00', 'C01', 'C02', 'C06', 'C08']);
      expect(existsSync(markdown)).toBe(true);
      expect(existsSync(html)).toBe(true);
      expect(readFileSync(markdown, 'utf8')).toContain('brief_id: CBRIEF-');
      expect(readFileSync(html, 'utf8')).toContain('id="career-brief-data"');
      expect(result.workflows).toHaveLength(5);
      expect(result.next_gate).toBe('CR_BRIEF_APPROVED');
    } finally {
      rmSync(root, {recursive: true, force: true});
    }
  });

  it('executes the canary through the integrated runner and stops at the brief gate', async () => {
    const root = mkdtempSync(resolve(tmpdir(), 'frames-career-integrated-canary-'));
    pdf.render.mockResolvedValueOnce({
      schema_version: 'career-pdf-manifest-v1',
      status: 'UNKNOWN',
      html_sha256: HASH_A,
      pdf_sha256: null,
      extracted_text_sha256: null,
      semantic_sha256: null,
      page_count: null,
      pdf_ref: null,
      replay: null,
      blocked_requests: [],
      toolchain: {
        playwright: '1.61.1',
        chromium: 'unavailable',
        pdftotext: 'unavailable',
        browser_source: 'unavailable',
        browser_version: null,
      },
      gaps: ['chromium_unavailable'],
    });
    try {
      const result = await runCareerCanary(root);
      expect(result).toMatchObject({
        status: 'UNKNOWN',
        replay_match: true,
        next_gate: 'CR_BRIEF_APPROVED',
        external_effects: 'none',
      });
      expect(result.route.materialized).toBe(true);
      expect(result.route.workflows.map(({workflow_id}) => workflow_id)).toEqual([
        'C02',
        'C06',
        'C08',
      ]);
      expect(existsSync(resolve(root, result.route.brief.markdown_ref))).toBe(true);
      expect(existsSync(resolve(root, result.route.brief.html_ref))).toBe(true);
      expect(pdf.render).toHaveBeenCalledOnce();
    } finally {
      rmSync(root, {recursive: true, force: true});
    }
  });

  it('routes, briefs, scores, drafts and stops before submission without network', () => {
    const fetchSpy = vi.spyOn(globalThis, 'fetch');
    try {
      const intent = routeCareerIntent({
        request: 'Busca vacantes y ayúdame a postular',
        candidateId: 'CAND-SYNTHETIC-001',
        targetRole: 'Product Operations Lead',
        language: 'es',
        profileReady: true,
        evidenceReady: true,
      });
      const runnerRoot = mkdtempSync(resolve(tmpdir(), 'frames-career-canary-'));
      const integrated = runCareerBriefFirst({
        root: runnerRoot,
        route: {
          request: 'Busca vacantes y ayúdame a postular',
          candidateId: 'CAND-SYNTHETIC-001',
          targetRole: 'Product Operations Lead',
          language: 'es',
          profileReady: true,
          evidenceReady: true,
        },
      });
      expect(integrated.intent).toEqual(intent);
      expect(integrated.materialized).toBe(true);
      rmSync(runnerRoot, {recursive: true, force: true});
      expect(intent.selected_stage_path).toEqual([
        'C02',
        'C03',
        'C04',
        'C05',
        'C06',
        'C07',
        'C08',
        'C09',
      ]);

      const content = Object.fromEntries(
        CAREER_BRIEF_SECTIONS.map((section, index) => [
          section,
          `Decisión sintética y verificable ${index + 1}.`,
        ]),
      ) as Record<(typeof CAREER_BRIEF_SECTIONS)[number], string>;
      const briefMarkdown = createCareerBriefMarkdown(
        {
          schema_version: 'career-brief-v1',
          brief_id: 'CBRIEF-SYNTHETIC-001',
          brief_kind: 'application',
          candidate_id: 'CAND-SYNTHETIC-001',
          application_id: 'APP-SYNTHETIC-001',
          display_identity: 'candidate-neutral-ats',
          generated_by: 'MetodologIA',
          request: intent.request,
          request_hash: intent.request_hash,
          sources: [{ref: 'work/private/career/evidence.yml', sha256: HASH_A}],
          language: 'es',
          workflow_selected: intent.selected_stage_path,
          skills: [
            'career-application-orchestrator',
            'candidate-evidence-reconciler',
            'career-opportunity-finder',
            'evidence-first-cv',
            'evidence-based-cover-letter',
          ],
          state: 'BRIEF_DRAFT',
          next_gate: 'CR_BRIEF_APPROVED',
        },
        content,
      );
      const briefHtml = renderCareerBriefHtml(briefMarkdown);
      expect(briefHtml).toContain('CBRIEF-SYNTHETIC-001');

      const score = scoreCareerOpportunity({
        evidence: 0.9,
        hard_requirements: 1,
        constraints: 1,
        transferability: 0.8,
        publication_quality: 1,
        sector: 0.6,
        application_friction: 0.8,
        legitimate_contact: 0,
        mandatory_blockers: [],
      });
      expect(score).toMatchObject({decision: 'SCORED', score: 87});

      const claim = {
        claim_id: 'CLM-SYNTHETIC-001',
        text: 'Redujo un ciclo operativo 30% durante un trimestre medido.',
        evidence_ids: ['EVD-SYNTHETIC-001'],
        evidence_hashes: [HASH_A],
      };
      const unsignedBank = {
        schema_version: 'evidence-bank-v1' as const,
        candidate_id: 'CAND-SYNTHETIC-001',
        evidence: [
          {
            evidence_id: 'EVD-SYNTHETIC-001',
            claim: claim.text,
            context: 'Contexto sintético.',
            action_method: 'Método sintético.',
            result: 'Resultado sintético.',
            metric: '30% durante un trimestre',
            source_ref: 'work/private/career/evidence.yml',
            source_sha256: HASH_A,
            confidence: 'verified' as const,
            allowed_channels: ['cv' as const],
            constraints: [],
          },
        ],
      };
      const evidenceBank = {
        ...unsignedBank,
        bank_sha256: calculateEvidenceBankHash(unsignedBank as never),
      };
      const surface = (path: string) => ({
        path,
        classification: 'evidence' as const,
        evidence_ids: ['EVD-SYNTHETIC-001'],
        evidence_hashes: [HASH_A],
        rationale: null,
      });
      const cvDraft = {
        schema_version: 'career-cv-v1',
        document_id: 'CV-SYNTHETIC-001',
        candidate_id: 'CAND-SYNTHETIC-001',
        application_id: 'APP-SYNTHETIC-001',
        language: 'es',
        design_profile: 'candidate-neutral-ats',
        authorized_brand: null,
        generated_by: 'MetodologIA',
        name: 'Candidata Sintética',
        headline: 'Product Operations Lead',
        contact_lines: ['Contacto privado'],
        summary: 'Perfil sintético creado únicamente para el canary local.',
        experience: [
          {
            organization: 'Empresa Sintética',
            role: 'Product Operations Manager',
            period: '2024–2026',
            location: null,
            achievements: [claim],
          },
        ],
        education: [],
        skills: ['Product Operations'],
        source_refs: ['work/private/career/evidence.yml'],
        surface_bindings: [
          '/headline',
          '/summary',
          '/experience/0/organization',
          '/experience/0/role',
          '/experience/0/period',
          '/skills/0',
        ].map(surface),
      } as const;
      const cv = {...cvDraft, content_sha256: calculateCareerDocumentHash(cvDraft as never)};
      const cvHtml = renderCareerCvHtml(cv, evidenceBank);
      expect(cvHtml).toContain('data-claim-id="CLM-SYNTHETIC-001"');
      expect(cvHtml).not.toMatch(/(?:src|href)=["']https?:/iu);

      const drafted = transitionCareerState({
        schema_version: 'career-event-v1',
        event_id: 'EVT-DRAFTED-001',
        application_id: 'APP-SYNTHETIC-001',
        from: 'PACKAGED',
        to: 'DRAFTED',
        kind: 'documents-drafted',
        actor_id: 'ACTOR-PRODUCER-001',
        artifact_sha256: cv.content_sha256,
        evidence_refs: ['work/private/career/cv.html'],
      });
      expect(drafted).toBe('DRAFTED');

      const submission = prepareSubmission({
        schema_version: 'submission-preview-v1',
        application_id: 'APP-SYNTHETIC-001',
        job_sha256: HASH_B,
        package_sha256: cv.content_sha256,
        channel: 'company-careers',
        package_ref: 'work/private/career/package.yml',
        blockers: [],
      });
      expect(submission).toMatchObject({
        decision: 'PREPARED_STOP',
        authorization_valid: false,
        next_gate: 'CR_SUBMISSION_AUTHORIZED',
      });
      expect(fetchSpy).not.toHaveBeenCalled();
    } finally {
      fetchSpy.mockRestore();
    }
  });
});
